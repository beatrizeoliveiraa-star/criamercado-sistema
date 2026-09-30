-- =====================================================================
-- CRIAMERCADO · schema inicial
-- Substitui o Notion: o banco LEADS vira clientes + projetos + etapas +
-- pedidos (um por fornecedor). Agenda e tarefas ficam em tabelas próprias.
-- Toda a equipe vê o andamento; quem edita depende do papel (RLS).
-- Valores em centavos (bigint).
-- =====================================================================

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------- enums
create type public.papel as enum ('admin', 'comercial', 'projetos', 'compras', 'instalacao');
create type public.status_comercial as enum ('nao_iniciada', 'em_andamento', 'nao_concluida', 'follow_up', 'fechado');
create type public.plano as enum ('representacao_mg', 'pleno_90', 'pleno_180', 'pleno_360');
create type public.etapa_tipo as enum (
  'proposta', 'projeto_2d', 'projeto_3d', 'contrato', 'reuniao_alinhamento', 'detalhamento',
  'pintura', 'comunicacao_visual', 'detalhamento_finalizado', 'orcamento', 'instalacao', 'finalizacao'
);
create type public.etapa_status as enum (
  'nao_iniciada', 'em_andamento', 'pausado', 'aprovacao_interna', 'aprovacao_cliente', 'concluido', 'desistencia'
);
create type public.pedido_status as enum ('nao_iniciada', 'em_andamento', 'concluido', 'sem_pedido');
create type public.compromisso_tipo as enum ('reuniao', 'ligar', 'follow_up', 'lead', 'folga', 'outro');
create type public.tarefa_status as enum ('nao_iniciada', 'em_andamento', 'concluido');

-- ---------------------------------------------------------------- utilidades
create or replace function private.set_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- ================================================================ EQUIPE
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text,
  papeis public.papel[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Quem cria conta entra sem papel: só vê algo depois que a administração liberar.
create or replace function private.novo_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.novo_usuario();

create or replace function private.tem_papel(p public.papel) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.ativo and (p = any (u.papeis) or 'admin' = any (u.papeis))
  )
$$;

create or replace function private.eh_membro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.ativo and cardinality(u.papeis) > 0
  )
$$;

grant usage on schema private to authenticated;
grant execute on function private.tem_papel(public.papel), private.eh_membro() to authenticated;

-- ================================================================ CLIENTES
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  uf char(2),
  razao_social text,
  cnpj text,
  inscricao_estadual text,
  contato_nome text,
  email text,
  telefone text,
  endereco text,
  notion_id text unique,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger clientes_atualizado before update on public.clientes
  for each row execute function private.set_atualizado_em();

-- Dados pessoais do responsável: só administração e comercial.
create table public.clientes_privado (
  cliente_id uuid primary key references public.clientes (id) on delete cascade,
  cpf text,
  data_nascimento date
);

-- ================================================================ PROJETOS
create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  titulo text not null,
  plano public.plano,
  status_comercial public.status_comercial not null default 'nao_iniciada',
  valor_proposta_centavos bigint check (valor_proposta_centavos >= 0),
  data_apresentacao date,
  data_fechamento date,
  data_entrega date,
  projeto_principal_id uuid references public.projetos (id) on delete set null,
  observacoes text,
  notion_id text unique,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (projeto_principal_id is null or projeto_principal_id <> id)
);
create index projetos_cliente on public.projetos (cliente_id);
create trigger projetos_atualizado before update on public.projetos
  for each row execute function private.set_atualizado_em();

create table public.etapas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  tipo public.etapa_tipo not null,
  status public.etapa_status not null default 'nao_iniciada',
  responsavel_id uuid references public.usuarios (id) on delete set null,
  data date,
  observacao text,
  atualizado_em timestamptz not null default now(),
  unique (projeto_id, tipo)
);
create trigger etapas_atualizado before update on public.etapas
  for each row execute function private.set_atualizado_em();

-- Todo projeto nasce com todas as etapas em "Não iniciada".
create or replace function private.criar_etapas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.etapas (projeto_id, tipo)
  select new.id, t from unnest(enum_range(null::public.etapa_tipo)) as t
  on conflict do nothing;
  return new;
end $$;
create trigger projetos_criar_etapas after insert on public.projetos
  for each row execute function private.criar_etapas();

-- Quem edita cada etapa.
create or replace function private.pode_editar_etapa(t public.etapa_tipo) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when t in ('proposta', 'contrato') then private.tem_papel('comercial')
    when t in ('projeto_2d', 'projeto_3d', 'reuniao_alinhamento', 'detalhamento', 'pintura',
               'comunicacao_visual', 'detalhamento_finalizado') then private.tem_papel('projetos')
    when t = 'orcamento' then private.tem_papel('compras')
    when t in ('instalacao', 'finalizacao') then private.tem_papel('instalacao')
    else private.tem_papel('admin')
  end
$$;
grant execute on function private.pode_editar_etapa(public.etapa_tipo) to authenticated;

-- ================================================================ FORNECEDORES E PEDIDOS
create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  ordem int not null default 0
);

insert into public.fornecedores (nome, ordem) values
  ('Tempo', 1), ('Lince', 2), ('Pinhões', 3), ('IMF', 4), ('Imperial', 5),
  ('Gelopar', 6), ('Safol/Cristal Aço', 7), ('Refrigeração', 8);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedores (id) on delete restrict,
  orcamento_status public.pedido_status,
  orcamento_data date,
  codigo text,
  status public.pedido_status not null default 'nao_iniciada',
  entrega_prevista date,
  entregue_em date,
  observacao text,
  atualizado_em timestamptz not null default now(),
  unique (projeto_id, fornecedor_id)
);
create trigger pedidos_atualizado before update on public.pedidos
  for each row execute function private.set_atualizado_em();

-- ================================================================ ANEXOS
create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  nome text not null,
  caminho text not null,
  tipo text,
  enviado_por uuid references public.usuarios (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now()
);

-- ================================================================ AGENDA E TAREFAS
create table public.compromissos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  inicio timestamptz not null,
  fim timestamptz,
  dia_inteiro boolean not null default true,
  tipo public.compromisso_tipo not null default 'outro',
  status public.tarefa_status not null default 'nao_iniciada',
  pessoas text[] not null default '{}',
  cliente_id uuid references public.clientes (id) on delete set null,
  projeto_id uuid references public.projetos (id) on delete set null,
  observacoes text,
  notion_id text unique,
  criado_em timestamptz not null default now()
);

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  status public.tarefa_status not null default 'nao_iniciada',
  pessoas text[] not null default '{}',
  projeto_id uuid references public.projetos (id) on delete set null,
  notion_id text unique,
  criado_em timestamptz not null default now()
);

-- ================================================================ HISTÓRICO
create table public.historico (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id uuid not null,
  projeto_id uuid,
  campo text not null,
  de text,
  para text,
  usuario_id uuid,
  em timestamptz not null default now()
);
create index historico_projeto on public.historico (projeto_id, em desc);

-- Registra cada campo alterado (menos carimbos de data).
create or replace function private.registrar_historico() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  antigo jsonb := to_jsonb(old);
  novo jsonb := to_jsonb(new);
  k text;
  proj uuid := case when tg_table_name = 'projetos' then new.id else (novo ->> 'projeto_id')::uuid end;
begin
  for k in select jsonb_object_keys(novo) loop
    if k not in ('atualizado_em', 'criado_em') and (antigo -> k) is distinct from (novo -> k) then
      insert into public.historico (tabela, registro_id, projeto_id, campo, de, para, usuario_id)
      values (tg_table_name, new.id, proj, k, antigo ->> k, novo ->> k, auth.uid());
    end if;
  end loop;
  return new;
end $$;

create trigger projetos_historico after update on public.projetos
  for each row execute function private.registrar_historico();
create trigger etapas_historico after update on public.etapas
  for each row execute function private.registrar_historico();
create trigger pedidos_historico after update on public.pedidos
  for each row execute function private.registrar_historico();

-- ================================================================ RLS
alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.clientes_privado enable row level security;
alter table public.projetos enable row level security;
alter table public.etapas enable row level security;
alter table public.fornecedores enable row level security;
alter table public.pedidos enable row level security;
alter table public.anexos enable row level security;
alter table public.compromissos enable row level security;
alter table public.tarefas enable row level security;
alter table public.historico enable row level security;

-- usuarios: cada um se vê; membros veem a equipe; só administração muda papéis.
create policy usuarios_ler on public.usuarios for select
  using (id = auth.uid() or private.eh_membro());
create policy usuarios_admin on public.usuarios for update
  using (private.tem_papel('admin')) with check (private.tem_papel('admin'));

-- clientes
create policy clientes_ler on public.clientes for select using (private.eh_membro());
create policy clientes_criar on public.clientes for insert with check (private.tem_papel('comercial'));
create policy clientes_editar on public.clientes for update
  using (private.tem_papel('comercial')) with check (private.tem_papel('comercial'));
create policy clientes_apagar on public.clientes for delete using (private.tem_papel('admin'));

create policy privado_tudo on public.clientes_privado for all
  using (private.tem_papel('comercial')) with check (private.tem_papel('comercial'));

-- projetos
create policy projetos_ler on public.projetos for select using (private.eh_membro());
create policy projetos_criar on public.projetos for insert with check (private.tem_papel('comercial'));
create policy projetos_editar on public.projetos for update
  using (private.tem_papel('comercial')) with check (private.tem_papel('comercial'));
create policy projetos_apagar on public.projetos for delete using (private.tem_papel('admin'));

-- etapas: criadas pelo trigger; cada papel edita as suas.
create policy etapas_ler on public.etapas for select using (private.eh_membro());
create policy etapas_editar on public.etapas for update
  using (private.pode_editar_etapa(tipo)) with check (private.pode_editar_etapa(tipo));

-- fornecedores
create policy fornecedores_ler on public.fornecedores for select using (private.eh_membro());
create policy fornecedores_admin on public.fornecedores for all
  using (private.tem_papel('admin')) with check (private.tem_papel('admin'));

-- pedidos: compras cuida; instalação atualiza entregas.
create policy pedidos_ler on public.pedidos for select using (private.eh_membro());
create policy pedidos_criar on public.pedidos for insert with check (private.tem_papel('compras'));
create policy pedidos_editar on public.pedidos for update
  using (private.tem_papel('compras') or private.tem_papel('instalacao'))
  with check (private.tem_papel('compras') or private.tem_papel('instalacao'));
create policy pedidos_apagar on public.pedidos for delete using (private.tem_papel('admin'));

-- anexos
create policy anexos_ler on public.anexos for select using (private.eh_membro());
create policy anexos_criar on public.anexos for insert with check (private.eh_membro());
create policy anexos_apagar on public.anexos for delete
  using (private.tem_papel('admin') or enviado_por = auth.uid());

-- agenda e tarefas: toda a equipe
create policy compromissos_tudo on public.compromissos for all
  using (private.eh_membro()) with check (private.eh_membro());
create policy tarefas_tudo on public.tarefas for all
  using (private.eh_membro()) with check (private.eh_membro());

-- histórico: só leitura (escrito pelo trigger)
create policy historico_ler on public.historico for select using (private.eh_membro());
revoke insert, update, delete on public.historico from anon, authenticated;

-- Visitante sem login não acessa nada.
revoke all on all tables in schema public from anon;
