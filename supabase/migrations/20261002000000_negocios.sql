-- =====================================================================
-- CRIAMERCADO · modelo de negócios (estilo Bitrix, sem kanban)
-- Cada projeto ganha uma etapa atual (vazia = Lead), uma linha do tempo
-- com comentários e ligações, e tarefas com prazo ligadas ao negócio.
-- =====================================================================

-- ---------------------------------------------------------------- etapa atual
alter table public.projetos add column etapa_atual public.etapa_tipo;
comment on column public.projetos.etapa_atual is 'Onde o negócio está no funil. Vazio = Lead.';

-- Move o negócio de etapa. Quem cuida da etapa de destino (ou o comercial) pode mover.
-- Ao avançar, as etapas anteriores em aberto ficam concluídas e a de destino entra em andamento;
-- chegar ao Contrato ou depois fecha o negócio.
create or replace function public.mover_etapa(projeto uuid, etapa public.etapa_tipo) returns void
language plpgsql security definer set search_path = '' as $$
declare
  atual public.etapa_tipo;
begin
  if etapa is null then
    if not private.tem_papel('comercial') then raise exception 'Só o comercial volta um negócio para Lead.'; end if;
  elsif not (private.pode_editar_etapa(etapa) or private.tem_papel('comercial')) then
    raise exception 'Esta etapa é de outro papel. Peça para quem cuida dela.';
  end if;

  select p.etapa_atual into atual from public.projetos p where p.id = projeto for update;
  if not found then raise exception 'Negócio não encontrado.'; end if;
  if atual is not distinct from etapa then return; end if;

  update public.projetos set etapa_atual = etapa where id = projeto;

  if etapa is not null and (atual is null or etapa > atual) then
    update public.etapas e set status = 'concluido'
      where e.projeto_id = projeto and e.tipo < etapa
        and e.status in ('nao_iniciada', 'em_andamento', 'aprovacao_interna', 'aprovacao_cliente');
    update public.etapas e set status = 'em_andamento'
      where e.projeto_id = projeto and e.tipo = etapa and e.status = 'nao_iniciada';
  end if;

  if etapa >= 'contrato' then
    update public.projetos
      set status_comercial = 'fechado', data_fechamento = coalesce(data_fechamento, current_date)
      where id = projeto and status_comercial <> 'fechado';
  end if;
end $$;
revoke all on function public.mover_etapa(uuid, public.etapa_tipo) from public, anon;
grant execute on function public.mover_etapa(uuid, public.etapa_tipo) to authenticated;

-- ---------------------------------------------------------------- linha do tempo
create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  tipo text not null check (tipo in ('comentario', 'ligacao')),
  texto text not null check (length(trim(texto)) > 0),
  usuario_id uuid references public.usuarios (id) on delete set null default auth.uid(),
  em timestamptz not null default now()
);
create index atividades_projeto on public.atividades (projeto_id, em desc);

alter table public.atividades enable row level security;
create policy atividades_ler on public.atividades for select using (private.eh_membro());
create policy atividades_criar on public.atividades for insert
  with check (private.eh_membro() and usuario_id = auth.uid());
create policy atividades_apagar on public.atividades for delete
  using (private.tem_papel('admin') or usuario_id = auth.uid());

-- ---------------------------------------------------------------- tarefas com prazo
alter table public.tarefas
  add column prazo date,
  add column concluida_em timestamptz,
  add column criado_por uuid references public.usuarios (id) on delete set null default auth.uid();
create index tarefas_abertas on public.tarefas (prazo) where status <> 'concluido';

-- Marca quando a tarefa foi concluída (para a linha do tempo).
create or replace function private.tarefa_concluida() returns trigger
language plpgsql as $$
begin
  if new.status = 'concluido' and old.status is distinct from 'concluido' then
    new.concluida_em := now();
  elsif new.status <> 'concluido' then
    new.concluida_em := null;
  end if;
  return new;
end $$;
create trigger tarefas_concluida before update on public.tarefas
  for each row execute function private.tarefa_concluida();

-- ---------------------------------------------------------------- nomes no histórico
alter table public.historico
  add constraint historico_usuario_fk foreign key (usuario_id) references public.usuarios (id) on delete set null;

revoke all on public.atividades from anon;
