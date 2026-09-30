-- Funil de negócios: mover etapa, linha do tempo e tarefas.
\set ON_ERROR_STOP on
\set QUIET on

create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;

set role authenticated;

-- ---------------------------------------------------------------- comercial cria um lead
set request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';
insert into public.clientes (id, nome) values ('11111111-0000-4000-8000-000000000009', 'SUP FUNIL');
insert into public.projetos (id, cliente_id, titulo) values
  ('22222222-0000-4000-8000-000000000009', '11111111-0000-4000-8000-000000000009', 'SUP FUNIL');
select pg_temp.assert((select etapa_atual from public.projetos where id = '22222222-0000-4000-8000-000000000009') is null, 'negócio novo começa em Lead');

select public.mover_etapa('22222222-0000-4000-8000-000000000009', 'projeto_3d');
select pg_temp.assert((select etapa_atual from public.projetos where id = '22222222-0000-4000-8000-000000000009') = 'projeto_3d', 'comercial move para 3D');
select pg_temp.assert((select count(*) from public.etapas where projeto_id = '22222222-0000-4000-8000-000000000009' and tipo < 'projeto_3d' and status = 'concluido') = 2, 'etapas anteriores ficam concluídas');
select pg_temp.assert((select status from public.etapas where projeto_id = '22222222-0000-4000-8000-000000000009' and tipo = 'projeto_3d') = 'em_andamento', 'etapa de destino entra em andamento');
select pg_temp.assert((select count(*) from public.historico where registro_id = '22222222-0000-4000-8000-000000000009' and campo = 'etapa_atual' and usuario_id = auth.uid()) = 1, 'histórico registra quem moveu');

select public.mover_etapa('22222222-0000-4000-8000-000000000009', 'contrato');
select pg_temp.assert((select status_comercial from public.projetos where id = '22222222-0000-4000-8000-000000000009') = 'fechado', 'chegar ao contrato fecha o negócio');
select pg_temp.assert((select data_fechamento from public.projetos where id = '22222222-0000-4000-8000-000000000009') = current_date, 'data de fechamento preenchida');

insert into public.atividades (projeto_id, tipo, texto) values ('22222222-0000-4000-8000-000000000009', 'ligacao', 'Cliente aprovou.');
select pg_temp.assert((select usuario_id from public.atividades) = auth.uid(), 'ligação registrada com o autor');
do $$ begin
  insert into public.atividades (projeto_id, tipo, texto, usuario_id)
    values ('22222222-0000-4000-8000-000000000009', 'comentario', 'x', 'cccccccc-0000-4000-8000-000000000003');
  raise exception 'FALHOU: escreveu em nome de outra pessoa';
exception when insufficient_privilege then raise notice 'ok  ninguém comenta em nome de outro';
end $$;

insert into public.tarefas (id, titulo, projeto_id, prazo, pessoas) values
  ('33333333-0000-4000-8000-000000000009', 'Enviar contrato', '22222222-0000-4000-8000-000000000009', current_date + 2, '{Wander}');
update public.tarefas set status = 'concluido' where id = '33333333-0000-4000-8000-000000000009';
select pg_temp.assert((select concluida_em from public.tarefas where id = '33333333-0000-4000-8000-000000000009') is not null, 'tarefa concluída guarda a hora');

-- ---------------------------------------------------------------- projetos
set request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';
select public.mover_etapa('22222222-0000-4000-8000-000000000009', 'detalhamento');
select pg_temp.assert((select etapa_atual from public.projetos where id = '22222222-0000-4000-8000-000000000009') = 'detalhamento', 'projetos move para Detalhamento');
do $$ begin
  perform public.mover_etapa('22222222-0000-4000-8000-000000000009', 'instalacao');
  raise exception 'FALHOU: projetos moveu para Instalação';
exception when raise_exception then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok  projetos não move para etapa da instalação';
end $$;
do $$ begin
  perform public.mover_etapa('22222222-0000-4000-8000-000000000009', null);
  raise exception 'FALHOU: projetos voltou para Lead';
exception when raise_exception then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok  só o comercial volta para Lead';
end $$;
with d as (delete from public.atividades returning 1)
select pg_temp.assert((select count(*) from d) = 0, 'não apaga comentário dos outros');

reset role;
