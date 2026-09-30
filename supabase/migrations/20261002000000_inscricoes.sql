-- =====================================================================
-- CRIAMERCADO · página da Superminas (call de diagnóstico + cupom)
-- O visitante só vê os horários livres e agenda (funções abaixo); ver,
-- editar e mandar WhatsApp/e-mail fica com comercial e administração.
-- =====================================================================

create type public.inscricao_status as enum ('agendada', 'realizada', 'nao_compareceu', 'cancelada', 'virou_lead');

-- ---------------------------------------------------------------- agenda (uma linha só)
create table public.agenda_config (
  id boolean primary key default true check (id),
  horarios time[] not null default '{09:00,10:00,11:00,14:00,15:00,16:00,17:00}',
  dias_semana int[] not null default '{1,2,3,4,5}',          -- 1 = segunda ... 7 = domingo
  dias_a_frente int not null default 45,
  antecedencia_horas int not null default 12,
  bloqueios date[] not null default '{2026-11-02,2026-11-20,2026-12-24,2026-12-25,2026-12-31,2027-01-01}',
  cupom_prefixo text not null default 'SUPERMINAS10',
  cupom_ate timestamptz not null default '2026-10-30 23:59:59-03',
  link_call_padrao text
);
insert into public.agenda_config default values;

-- ---------------------------------------------------------------- inscrições
create table public.inscricoes (
  id uuid primary key default gen_random_uuid(),
  origem text,
  empresa text not null,
  cnpj text not null check (cnpj ~ '^\d{14}$'),
  cidade text,
  uf char(2),
  responsavel text not null,
  whatsapp text not null check (whatsapp ~ '^\d{10,13}$'),
  email text not null,
  call_em timestamptz not null,
  cupom text unique,
  consentimento_em timestamptz not null default now(),
  status public.inscricao_status not null default 'agendada',
  link_call text,
  recebeu_faturamento boolean not null default false,
  recebeu_setores boolean not null default false,
  recebeu_video boolean not null default false,
  observacoes text,
  projeto_id uuid references public.projetos (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index inscricoes_call on public.inscricoes (call_em);
-- Um cupom/call por CNPJ e um cliente por horário (canceladas liberam os dois).
create unique index inscricoes_cnpj_ativo on public.inscricoes (cnpj) where status <> 'cancelada';
create unique index inscricoes_horario_ativo on public.inscricoes (call_em) where status <> 'cancelada';
create trigger inscricoes_atualizado before update on public.inscricoes
  for each row execute function private.set_atualizado_em();

-- Cada WhatsApp/e-mail enviado pelo admin, para saber quem já foi lembrado.
create table public.inscricao_envios (
  id bigint generated always as identity primary key,
  inscricao_id uuid not null references public.inscricoes (id) on delete cascade,
  canal text not null check (canal in ('whatsapp', 'email')),
  tipo text not null,
  texto text not null,
  usuario_id uuid references public.usuarios (id) on delete set null default auth.uid(),
  em timestamptz not null default now()
);
create index inscricao_envios_inscricao on public.inscricao_envios (inscricao_id, em desc);

-- ---------------------------------------------------------------- funções públicas
create or replace function private.cnpj_valido(c text) returns boolean
language plpgsql immutable as $$
declare
  pesos1 int[] := '{5,4,3,2,9,8,7,6,5,4,3,2}';
  pesos2 int[] := '{6,5,4,3,2,9,8,7,6,5,4,3,2}';
  s int; d int; i int;
begin
  if c !~ '^\d{14}$' or c ~ '^(\d)\1{13}$' then return false; end if;
  s := 0;
  for i in 1..12 loop s := s + substr(c, i, 1)::int * pesos1[i]; end loop;
  d := case when s % 11 < 2 then 0 else 11 - s % 11 end;
  if d <> substr(c, 13, 1)::int then return false; end if;
  s := 0;
  for i in 1..13 loop s := s + substr(c, i, 1)::int * pesos2[i]; end loop;
  d := case when s % 11 < 2 then 0 else 11 - s % 11 end;
  return d = substr(c, 14, 1)::int;
end $$;

-- Horários livres (só as datas, nada de quem marcou).
create or replace function public.horarios_livres() returns setof timestamptz
language sql stable security definer set search_path = '' as $$
  with cfg as (select * from public.agenda_config),
  dias as (
    select d::date as dia
    from cfg, generate_series((now() at time zone 'America/Sao_Paulo')::date,
                              (now() at time zone 'America/Sao_Paulo')::date + cfg.dias_a_frente, interval '1 day') d
  )
  select (dias.dia + h) at time zone 'America/Sao_Paulo' as inicio
  from cfg, dias, unnest(cfg.horarios) h
  where extract(isodow from dias.dia)::int = any (cfg.dias_semana)
    and not dias.dia = any (cfg.bloqueios)
    and (dias.dia + h) at time zone 'America/Sao_Paulo' > now() + make_interval(hours => cfg.antecedencia_horas)
    and not exists (
      select 1 from public.inscricoes i
      where i.status <> 'cancelada' and i.call_em = (dias.dia + h) at time zone 'America/Sao_Paulo'
    )
  order by 1
$$;

-- Agenda a call e devolve o cupom (se ainda estiver no prazo da feira).
create or replace function public.agendar_call(d jsonb) returns table (cupom text, call_em timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  cfg public.agenda_config;
  v_cnpj text := regexp_replace(coalesce(d ->> 'cnpj', ''), '\D', '', 'g');
  v_zap text := regexp_replace(coalesce(d ->> 'whatsapp', ''), '\D', '', 'g');
  v_empresa text := left(btrim(coalesce(d ->> 'empresa', '')), 120);
  v_resp text := left(btrim(coalesce(d ->> 'responsavel', '')), 120);
  v_email text := lower(left(btrim(coalesce(d ->> 'email', '')), 160));
  v_call timestamptz;
  v_cupom text;
  alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  select * into cfg from public.agenda_config;
  if v_empresa = '' then raise exception 'Informe o nome da empresa.'; end if;
  if not private.cnpj_valido(v_cnpj) then raise exception 'CNPJ inválido. Confira os números.'; end if;
  if v_resp = '' then raise exception 'Informe o nome do sócio ou responsável.'; end if;
  if length(v_zap) not between 10 and 11 then raise exception 'Celular inválido. Use DDD + número.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
  if coalesce((d ->> 'consentimento')::boolean, false) is not true then
    raise exception 'É preciso autorizar o contato para agendar.';
  end if;

  begin
    v_call := (d ->> 'call_em')::timestamptz;
  exception when others then
    raise exception 'Escolha o dia e o horário da call.';
  end;
  if v_call is null or not exists (select 1 from public.horarios_livres() h where h = v_call) then
    raise exception 'Esse horário não está mais disponível. Escolha outro.';
  end if;

  if exists (select 1 from public.inscricoes i where i.cnpj = v_cnpj and i.status <> 'cancelada') then
    raise exception 'Este CNPJ já tem uma call agendada. Para remarcar, chame a gente no WhatsApp (32) 98406-9195.';
  end if;

  if now() <= cfg.cupom_ate then
    v_cupom := cfg.cupom_prefixo || '-' || (
      select string_agg(substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1), '')
      from generate_series(1, 4)
    );
  end if;

  begin
    insert into public.inscricoes (origem, empresa, cnpj, cidade, uf, responsavel, whatsapp, email, call_em, cupom, link_call)
    values (
      nullif(left(btrim(d ->> 'origem'), 60), ''),
      v_empresa,
      v_cnpj,
      nullif(left(btrim(d ->> 'cidade'), 80), ''),
      nullif(upper(left(btrim(d ->> 'uf'), 2)), ''),
      v_resp,
      v_zap,
      v_email,
      v_call,
      v_cupom,
      cfg.link_call_padrao
    );
  exception when unique_violation then
    -- Duas pessoas no mesmo horário ao mesmo tempo, ou o mesmo CNPJ em dois cliques.
    raise exception 'Esse horário acabou de ser reservado. Escolha outro.';
  end;

  return query select v_cupom, v_call;
end $$;

revoke all on function public.horarios_livres(), public.agendar_call(jsonb) from public;
grant execute on function public.horarios_livres(), public.agendar_call(jsonb) to anon, authenticated;

-- ================================================================ RLS
alter table public.agenda_config enable row level security;
alter table public.inscricoes enable row level security;
alter table public.inscricao_envios enable row level security;

create policy agenda_ler on public.agenda_config for select using (private.eh_membro());
create policy agenda_admin on public.agenda_config for update
  using (private.tem_papel('admin')) with check (private.tem_papel('admin'));

create policy inscricoes_ler on public.inscricoes for select using (private.tem_papel('comercial'));
create policy inscricoes_editar on public.inscricoes for update
  using (private.tem_papel('comercial')) with check (private.tem_papel('comercial'));
create policy inscricoes_apagar on public.inscricoes for delete using (private.tem_papel('admin'));

create policy envios_ler on public.inscricao_envios for select using (private.tem_papel('comercial'));
create policy envios_criar on public.inscricao_envios for insert
  with check (private.tem_papel('comercial') and usuario_id = auth.uid());

-- Visitante sem login não lê nem grava direto nas tabelas (só pelas funções acima).
revoke all on public.agenda_config, public.inscricoes, public.inscricao_envios from anon;
