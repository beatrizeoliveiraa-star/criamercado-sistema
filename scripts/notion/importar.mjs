// Importa o Notion da CRIAMERCADO para o Supabase.
//
// Uso (no computador, nunca no navegador):
//   NOTION_TOKEN=secret_...            (integração do Notion com acesso à página CRIAMERCADO)
//   SUPABASE_URL=https://xxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...      (chave secreta: não vai para o app nem para o git)
//   npm run importar                   (ou: npm run importar -- --simular, para só contar)
//
// Pode rodar quantas vezes quiser: cada linha guarda o id do Notion e é atualizada, não duplicada.

import { mapearCompromisso, mapearLead, mapearTarefa } from "./mapear.mjs";

// Fontes de dados do Notion (lidas em 30/09/2026).
const FONTES = {
  leads: "1b0861e1-2580-8257-937a-0754b002c34b",
  calendario: "01c861e1-2580-8207-83ec-879b56b4719b",
  compromissosWander: "047861e1-2580-8246-88d6-0715d7d8a4d5",
  emAndamento: "3b8861e1-2580-8269-a448-07e3a1dac724",
};

const simular = process.argv.includes("--simular");
const { NOTION_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NOTION_TOKEN) sair("Falta NOTION_TOKEN.");
if (!simular && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) sair("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");

function sair(msg) {
  console.error(msg);
  process.exit(1);
}

async function lerNotion(fonte) {
  const paginas = [];
  let cursor;
  do {
    const r = await fetch(`https://api.notion.com/v1/data_sources/${fonte}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!r.ok) sair(`Notion respondeu ${r.status} ao ler ${fonte}: ${await r.text()}`);
    const j = await r.json();
    paginas.push(...j.results.filter((p) => !p.in_trash && !p.archived));
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);
  return paginas;
}

async function db(caminho, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: ["return=representation", prefer].filter(Boolean).join(","),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) sair(`Supabase respondeu ${r.status} em ${caminho}: ${await r.text()}`);
  return r.status === 204 ? [] : r.json();
}

const upsert = (tabela, linhas, chave = "notion_id") =>
  linhas.length ? db(`${tabela}?on_conflict=${chave}`, { method: "POST", body: linhas, prefer: "resolution=merge-duplicates" }) : [];

async function main() {
  console.log("Lendo o Notion...");
  const [leads, calendario, wander, tarefas] = await Promise.all([
    lerNotion(FONTES.leads),
    lerNotion(FONTES.calendario),
    lerNotion(FONTES.compromissosWander),
    lerNotion(FONTES.emAndamento),
  ]);
  const mapeados = leads.map(mapearLead);
  const compromissos = [
    ...calendario.map((p) => mapearCompromisso(p)),
    ...wander.map((p) => mapearCompromisso(p, { pessoaPadrao: "WANDER" })),
  ].filter(Boolean);
  const listaTarefas = tarefas.map(mapearTarefa);

  console.log(`Encontrados: ${mapeados.length} leads, ${compromissos.length} compromissos, ${listaTarefas.length} tarefas.`);
  const arquivos = mapeados.reduce((n, m) => n + m.arquivos.length, 0);
  if (arquivos) console.log(`${arquivos} arquivo(s) de refrigeração ficam para a fase de anexos.`);
  if (simular) return;

  // 1. clientes (um por lead, como no Notion) e dados pessoais
  const clientes = await upsert("clientes", mapeados.map((m) => m.cliente));
  const clientePorNotion = new Map(clientes.map((c) => [c.notion_id, c.id]));
  const privados = mapeados
    .filter((m) => m.privado.cpf || m.privado.data_nascimento)
    .map((m) => ({ cliente_id: clientePorNotion.get(m.cliente.notion_id), ...m.privado }));
  await upsert("clientes_privado", privados, "cliente_id");

  // 2. projetos (as etapas nascem pelo trigger)
  const projetos = await upsert(
    "projetos",
    mapeados.map((m) => ({ ...m.projeto, cliente_id: clientePorNotion.get(m.cliente.notion_id) })),
  );
  const projetoPorNotion = new Map(projetos.map((p) => [p.notion_id, p.id]));

  // 3. subprojetos (Subitem / item principal)
  for (const m of mapeados.filter((x) => x.projetoPrincipalNotionId)) {
    const principal = projetoPorNotion.get(m.projetoPrincipalNotionId);
    if (principal) await db(`projetos?id=eq.${projetoPorNotion.get(m.projeto.notion_id)}`, { method: "PATCH", body: { projeto_principal_id: principal } });
  }

  // 4. etapas
  const etapas = mapeados.flatMap((m) =>
    m.etapas.map((e) => ({ projeto_id: projetoPorNotion.get(m.projeto.notion_id), ...e })),
  );
  for (const e of etapas) {
    const { projeto_id, tipo, ...campos } = e;
    await db(`etapas?projeto_id=eq.${projeto_id}&tipo=eq.${tipo}`, { method: "PATCH", body: campos });
  }

  // 5. pedidos por fornecedor
  const fornecedores = await db("fornecedores?select=id,nome");
  const fornecedorPorNome = new Map(fornecedores.map((f) => [f.nome, f.id]));
  const pedidos = mapeados.flatMap((m) =>
    m.pedidos.map(({ fornecedor, ...p }) => ({
      ...p,
      projeto_id: projetoPorNotion.get(m.projeto.notion_id),
      fornecedor_id: fornecedorPorNome.get(fornecedor),
    })),
  );
  await upsert("pedidos", pedidos, "projeto_id,fornecedor_id");

  // 6. agenda e tarefas
  await upsert("compromissos", compromissos);
  await upsert("tarefas", listaTarefas);

  console.log(
    `Pronto: ${clientes.length} clientes, ${projetos.length} projetos, ${etapas.length} etapas atualizadas, ` +
      `${pedidos.length} pedidos, ${compromissos.length} compromissos, ${listaTarefas.length} tarefas.`,
  );
}

main().catch((e) => sair(e.stack ?? String(e)));
