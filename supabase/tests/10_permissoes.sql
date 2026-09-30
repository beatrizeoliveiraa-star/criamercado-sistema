-- Permissões por papel: toda a equipe vê, cada papel edita o que é seu.
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'admin@teste.com', '{"name":"Admin"}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'comercial@teste.com', '{"name":"Comercial"}'),
  ('cccccccc-0000-4000-8000-000000000003', 'projetos@teste.com', '{"name":"Projetos"}'),
  ('dddddddd-0000-4000-8000-000000000004', 'compras@teste.com', '{"name":"Compras"}'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'novo@teste.com', '{"name":"Sem papel"}');

-- Bootstrap feito no SQL pela dona do sistema.
update public.usuarios set papeis = '{admin}' where email = 'admin@teste.com';
update public.usuarios set papeis = '{comercial}' where email = 'comercial@teste.com';
update public.usuarios set papeis = '{projetos}' where email = 'projetos@teste.com';
update public.usuarios set papeis = '{compras}' where email = 'compras@teste.com';

create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;

select pg_temp.assert((select count(*) from public.usuarios) = 5, 'cadastro cria o usuário sem papel');
select pg_temp.assert((select count(*) from public.fornecedores) = 8, '8 fornecedores cadastrados');

-- ---------------------------------------------------------------- comercial cria cliente e projeto
set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';
insert into public.clientes (id, nome, cidade, uf) values ('11111111-0000-4000-8000-000000000001', 'SUP TESTE', 'Simonésia', 'MG');
insert into public.clientes_privado (cliente_id, cpf) values ('11111111-0000-4000-8000-000000000001', '000.000.000-00');
insert into public.projetos (id, cliente_id, titulo, plano) values
  ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'SUP TESTE - SIMONÉSIA/MG', 'pleno_360');
select pg_temp.assert((select count(*) from public.etapas where projeto_id = '22222222-0000-4000-8000-000000000001') = 12, 'projeto nasce com as 12 etapas');
update public.etapas set status = 'concluido' where projeto_id = '22222222-0000-4000-8000-000000000001' and tipo = 'proposta';
select pg_temp.assert((select status from public.etapas where tipo = 'proposta') = 'concluido', 'comercial conclui a proposta');
with u as (update public.etapas set status = 'concluido' where tipo = 'projeto_2d' returning 1)
select pg_temp.assert((select count(*) from u) = 0, 'comercial não mexe no 2D');
update public.projetos set status_comercial = 'fechado' where id = '22222222-0000-4000-8000-000000000001';
select pg_temp.assert((select count(*) from public.historico where campo = 'status_comercial' and para = 'fechado' and usuario_id = auth.uid()) = 1, 'histórico registra quem fechou');

-- ---------------------------------------------------------------- projetos
set request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';
select pg_temp.assert((select count(*) from public.projetos) = 1, 'projetos vê o projeto');
select pg_temp.assert((select count(*) from public.clientes_privado) = 0, 'projetos não vê CPF');
update public.etapas set status = 'aprovacao_interna' where tipo = 'projeto_2d';
select pg_temp.assert((select status from public.etapas where tipo = 'projeto_2d') = 'aprovacao_interna', 'projetos move o 2D');
with u as (update public.projetos set status_comercial = 'follow_up' returning 1)
select pg_temp.assert((select count(*) from u) = 0, 'projetos não muda o status comercial');
do $$ begin
  insert into public.pedidos (projeto_id, fornecedor_id) select '22222222-0000-4000-8000-000000000001', id from public.fornecedores where nome = 'IMF';
  raise exception 'FALHOU: projetos criou pedido';
exception when insufficient_privilege then raise notice 'ok  projetos não cria pedido';
end $$;

-- ---------------------------------------------------------------- compras
set request.jwt.claim.sub = 'dddddddd-0000-4000-8000-000000000004';
insert into public.pedidos (projeto_id, fornecedor_id, codigo) select '22222222-0000-4000-8000-000000000001', id, '4521' from public.fornecedores where nome = 'IMF';
update public.pedidos set status = 'concluido';
select pg_temp.assert((select status from public.pedidos) = 'concluido', 'compras conclui o pedido');

-- ---------------------------------------------------------------- sem papel
set request.jwt.claim.sub = 'eeeeeeee-0000-4000-8000-000000000005';
select pg_temp.assert((select count(*) from public.projetos) = 0, 'conta sem papel não vê projetos');
select pg_temp.assert((select count(*) from public.clientes) = 0, 'conta sem papel não vê clientes');
do $$ begin
  update public.usuarios set papeis = '{admin}' where id = auth.uid();
  if (select papeis from public.usuarios where id = auth.uid()) = '{admin}' then raise exception 'FALHOU: virou admin'; end if;
  raise notice 'ok  ninguém se dá papel sozinho';
end $$;
do $$ begin
  insert into public.historico (tabela, registro_id, campo) values ('x', gen_random_uuid(), 'x');
  raise exception 'FALHOU: escreveu no histórico';
exception when insufficient_privilege then raise notice 'ok  histórico não aceita escrita direta';
end $$;

-- ---------------------------------------------------------------- admin
set request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
update public.usuarios set papeis = '{instalacao}' where email = 'novo@teste.com';
select pg_temp.assert((select papeis from public.usuarios where email = 'novo@teste.com') = '{instalacao}', 'admin dá papel');
update public.etapas set status = 'concluido' where tipo = 'finalizacao';
select pg_temp.assert((select count(*) from public.clientes_privado) = 1, 'admin vê CPF');

reset role;
