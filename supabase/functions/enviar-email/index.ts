// Envia um e-mail para o cliente da Superminas pelo Resend (resend.com) e registra o envio.
// Quem chama precisa estar logado com papel comercial: a leitura da inscrição passa pelo RLS.
//
// Configurar (uma vez):
//   supabase secrets set RESEND_API_KEY=re_... EMAIL_REMETENTE="CRIAMERCADO <contato@criamercado.com.br>"
//   supabase functions deploy enviar-email
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const resposta = (corpo: object, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const chave = Deno.env.get("RESEND_API_KEY");
  const remetente = Deno.env.get("EMAIL_REMETENTE");
  if (!chave || !remetente) return resposta({ erro: "O envio de e-mail ainda não foi configurado no servidor." });

  const { inscricao_id, tipo, assunto, texto } = await req.json().catch(() => ({}));
  if (!inscricao_id || !assunto || !texto || String(texto).length > 5000) return resposta({ erro: "Pedido inválido." }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: i } = await sb.from("inscricoes").select("email").eq("id", inscricao_id).maybeSingle();
  if (!i) return resposta({ erro: "Sem permissão para esta inscrição." }, 403);

  const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#242824">${escapar(String(texto)).replace(/\n/g, "<br>")}
<p style="margin-top:32px;color:#5c655c;font-size:14px">CRIAMERCADO · Pra mudar histórias.<br>(32) 98406-9195 · www.criamercado.com.br</p></div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remetente, to: [i.email], subject: String(assunto).slice(0, 200), text: String(texto), html }),
  });
  if (!r.ok) return resposta({ erro: `O provedor de e-mail recusou o envio (${r.status}).` }, 502);

  await sb.from("inscricao_envios").insert({ inscricao_id, canal: "email", tipo: tipo ?? "livre", texto: String(texto) });
  return resposta({ ok: true });
});
