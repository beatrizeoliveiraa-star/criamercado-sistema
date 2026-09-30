-- Página da Superminas: visitante só vê horários livres e agenda; comercial trabalha as inscrições.
\set ON_ERROR_STOP on
\set QUIET on

create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;

-- Espera erro com parte da mensagem.
create or replace function pg_temp.recusa(d jsonb, trecho text) returns void language plpgsql as $$
begin
  perform public.agendar_call(d);
  raise exception 'FALHOU: aceitou (%)', trecho;
exception when raise_exception then
  if sqlerrm like 'FALHOU%' or sqlerrm not like '%' || trecho || '%' then raise; end if;
  raise notice 'ok  recusa: %', sqlerrm;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select pg_temp.assert(private.cnpj_valido('11222333000181'), 'CNPJ válido passa');
select pg_temp.assert(not private.cnpj_valido('11222333000182'), 'dígito errado não passa');
select pg_temp.assert(not private.cnpj_valido('11111111111111'), 'números repetidos não passam');

-- ---------------------------------------------------------------- visitante
set role anon;
set request.jwt.claim.sub = '';

select pg_temp.assert((select count(*) from public.horarios_livres()) > 0, 'há horários livres');
select pg_temp.assert(
  (select bool_and(extract(isodow from h at time zone 'America/Sao_Paulo') between 1 and 5) from public.horarios_livres() h),
  'só dias úteis');

create temp table escolha as select h from public.horarios_livres() h order by h limit 2;
grant select on escolha to anon, authenticated;

select pg_temp.recusa(jsonb_build_object('empresa', 'SUP BOM', 'cnpj', '11.222.333/0001-82', 'responsavel', 'Ana',
  'whatsapp', '(32) 99999-0000', 'email', 'ana@sup.com', 'consentimento', true, 'call_em', (select min(h) from escolha)), 'CNPJ');
select pg_temp.recusa(jsonb_build_object('empresa', 'SUP BOM', 'cnpj', '11.222.333/0001-81', 'responsavel', 'Ana',
  'whatsapp', '(32) 99999-0000', 'email', 'ana@sup.com', 'consentimento', false, 'call_em', (select min(h) from escolha)), 'autorizar');
select pg_temp.recusa(jsonb_build_object('empresa', 'SUP BOM', 'cnpj', '11.222.333/0001-81', 'responsavel', 'Ana',
  'whatsapp', '(32) 99999-0000', 'email', 'ana@sup.com', 'consentimento', true, 'call_em', '2026-10-04 03:00-03'), 'horário');

create temp table resultado as
select * from public.agendar_call(jsonb_build_object('empresa', ' SUP BOM ', 'cnpj', '11.222.333/0001-81', 'cidade', 'Muriaé',
  'uf', 'mg', 'responsavel', 'Ana', 'whatsapp', '(32) 99999-0000', 'email', 'Ana@Sup.com', 'consentimento', true,
  'origem', 'superminas-folder', 'call_em', (select min(h) from escolha)));
select pg_temp.assert((select cupom ~ '^SUPERMINAS10-[A-Z2-9]{4}$' from resultado), 'recebe o cupom');
select pg_temp.assert(not exists (select 1 from public.horarios_livres() h where h = (select min(h) from escolha)), 'horário sai da lista');

select pg_temp.recusa(jsonb_build_object('empresa', 'OUTRO', 'cnpj', '11.444.777/0001-61', 'responsavel', 'Bia',
  'whatsapp', '32988887777', 'email', 'bia@x.com', 'consentimento', true, 'call_em', (select min(h) from escolha)), 'horário');
select pg_temp.recusa(jsonb_build_object('empresa', 'SUP BOM 2', 'cnpj', '11222333000181', 'responsavel', 'Ana',
  'whatsapp', '32999990000', 'email', 'ana@sup.com', 'consentimento', true, 'call_em', (select max(h) from escolha)), 'CNPJ já tem');

do $$ begin
  perform count(*) from public.inscricoes;
  raise exception 'FALHOU: visitante leu inscrições';
exception when insufficient_privilege then raise notice 'ok  visitante não lê inscrições';
end $$;
do $$ begin
  insert into public.inscricoes (empresa, cnpj, responsavel, whatsapp, email, call_em)
  values ('x', '11444777000161', 'x', '32988887777', 'x@x.com', now() + interval '3 days');
  raise exception 'FALHOU: visitante gravou direto';
exception when insufficient_privilege then raise notice 'ok  visitante não grava direto';
end $$;

-- ---------------------------------------------------------------- equipe
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';
select pg_temp.assert((select count(*) from public.inscricoes) = 0, 'projetos não vê inscrições');

set request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';
select pg_temp.assert(
  (select empresa = 'SUP BOM' and cnpj = '11222333000181' and whatsapp = '32999990000' and email = 'ana@sup.com' and uf = 'MG'
   from public.inscricoes),
  'comercial vê os dados limpos');
update public.inscricoes set recebeu_video = true, status = 'realizada';
select pg_temp.assert((select recebeu_video and status = 'realizada' from public.inscricoes), 'comercial marca materiais e status');
insert into public.inscricao_envios (inscricao_id, canal, tipo, texto) select id, 'whatsapp', 'lembrete', 'Olá' from public.inscricoes;
select pg_temp.assert((select usuario_id from public.inscricao_envios) = auth.uid(), 'envio registra quem mandou');
do $$ begin
  insert into public.inscricao_envios (inscricao_id, canal, tipo, texto, usuario_id)
  select id, 'email', 'lembrete', 'x', 'aaaaaaaa-0000-4000-8000-000000000001' from public.inscricoes;
  raise exception 'FALHOU: registrou envio em nome de outro';
exception when insufficient_privilege then raise notice 'ok  não registra envio em nome de outro';
end $$;
with u as (update public.agenda_config set dias_a_frente = 10 returning 1)
select pg_temp.assert((select count(*) from u) = 0, 'comercial não muda a agenda');

set request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
update public.agenda_config set link_call_padrao = 'https://meet.google.com/abc';
select pg_temp.assert((select link_call_padrao from public.agenda_config) is not null, 'admin muda a agenda');

reset role;
