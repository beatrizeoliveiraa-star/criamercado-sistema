// Converte páginas do Notion (formato da API) nas linhas do banco novo.
// Funções puras: sem rede, testadas em mapear.test.mjs.

/** Valor simples de uma propriedade do Notion (texto, número, data, opção...). */
export function valor(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case "title":
    case "rich_text":
      return limparTexto(prop[prop.type].map((t) => t.plain_text).join("")) || null;
    case "number":
      return prop.number;
    case "select":
    case "status":
      return prop[prop.type]?.name ?? null;
    case "multi_select":
      return prop.multi_select.map((o) => o.name);
    case "date":
      return prop.date ? { inicio: prop.date.start, fim: prop.date.end } : null;
    case "relation":
      return prop.relation.map((r) => r.id);
    case "people":
      return prop.people.map((p) => p.name ?? p.id);
    case "files":
      return prop.files.map((f) => ({ nome: f.name, url: f.file?.url ?? f.external?.url }));
    case "place":
      return prop.place?.name ?? prop.place?.address ?? null;
    default:
      return null;
  }
}

function limparTexto(s) {
  return s.replace(/<[^>]+>/g, "").replace(/[—–-]{3,}/g, "").trim();
}

const data = (v) => (v && v.inicio ? v.inicio.slice(0, 10) : null);
const txt = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** "SUP CBAESA - SIMONESIA/MG" → nome, cidade, uf. */
export function separarTitulo(titulo) {
  const t = (titulo ?? "").trim();
  const i = t.lastIndexOf(" - ");
  if (i < 0) return { nome: t, cidade: null, uf: null };
  const nome = t.slice(0, i).trim();
  const lugar = t.slice(i + 3).trim();
  const m = lugar.match(/^(.*?)\s*\/\s*([A-Za-z]{2})$/);
  if (!m) return { nome, cidade: lugar || null, uf: null };
  return { nome, cidade: m[1].trim() || null, uf: m[2].toUpperCase() };
}

const STATUS_COMERCIAL = {
  "Não iniciada": "nao_iniciada",
  "Em andamento": "em_andamento",
  "Não concluída": "nao_concluida",
  "FOLLOW UP": "follow_up",
  Fechado: "fechado",
};

const PLANO = {
  "REPRESENTAÇÃO MG": "representacao_mg",
  "PLENO 90": "pleno_90",
  "PLENO 180": "pleno_180",
  "PLENO 360": "pleno_360",
};

const ETAPA_STATUS = {
  "Não iniciada": "nao_iniciada",
  "Não inciado": "nao_iniciada",
  "Em andamento": "em_andamento",
  "Em andamento (Ruan)": "em_andamento",
  Pausado: "pausado",
  "Aprovação (Wander)": "aprovacao_interna",
  "Aprovação cliente": "aprovacao_cliente",
  Concluído: "concluido",
  Concluída: "concluido",
  "Não realizada": "nao_iniciada",
  DESISTÊNCIA: "desistencia",
};

const PEDIDO_STATUS = {
  "Não iniciada": "nao_iniciada",
  "Em andamento": "em_andamento",
  Concluído: "concluido",
  "Sem pedido": "sem_pedido",
};

/** Coluna do Notion → etapa do sistema. */
const ETAPAS = {
  proposta: "Proposta",
  projeto_2d: "2D",
  projeto_3d: "3D",
  contrato: "CONTRATO",
  reuniao_alinhamento: "Reunião de alinhamento",
  detalhamento: "Detalhamento",
  pintura: "Pintura detalhamento",
  comunicacao_visual: "Comunicação Visual (detalhamento)",
  detalhamento_finalizado: "Detalhamento Finalizado",
  orcamento: "Orçamento Concluído",
  finalizacao: "Finalização",
};

const ORDEM_ETAPAS = [
  "proposta", "projeto_2d", "projeto_3d", "contrato", "reuniao_alinhamento", "detalhamento", "pintura",
  "comunicacao_visual", "detalhamento_finalizado", "orcamento", "instalacao", "finalizacao",
];

/**
 * Onde o negócio está no funil: a última etapa já mexida; se ela estiver concluída, a seguinte.
 * Nada mexido = Lead (null). Negócio fechado fica no mínimo em Contrato.
 */
export function etapaAtual(etapas, statusComercial) {
  const status = Object.fromEntries(etapas.filter((e) => e.status).map((e) => [e.tipo, e.status]));
  let i = -1;
  ORDEM_ETAPAS.forEach((t, k) => {
    if (status[t] && status[t] !== "nao_iniciada") i = k;
  });
  if (i >= 0 && status[ORDEM_ETAPAS[i]] === "concluido" && i < ORDEM_ETAPAS.length - 1) i++;
  if (statusComercial === "fechado") i = Math.max(i, ORDEM_ETAPAS.indexOf("contrato"));
  return i < 0 ? null : ORDEM_ETAPAS[i];
}

/** Fornecedor → colunas do Notion que viram o pedido dele. */
const FORNECEDORES = {
  Tempo: { status: "Pedido Tempo", entrega: "Entrega Tempo" },
  Lince: { status: "Pedido Lince", entrega: "Entrega Lince", codigo: ["Cód Lince"] },
  Pinhões: { status: "Pedido Pinhões", entrega: "Entrega Pinhões", orcamento: "PINHÕES", orcamentoData: "Data Pinhões" },
  IMF: { status: "Pedido IMF", entrega: "Entrega IMF", codigo: ["CÓD IMF", "Cód IMF"], orcamentoData: "Data IMF", enviado: "IMF" },
  Imperial: { status: "Pedido Imperial", entrega: "Entrega Imperial" },
  Gelopar: { status: "Minuta Gelopar" },
  "Safol/Cristal Aço": { status: "Pedido Safol/Cristal Aço" },
};

/** Uma página do banco LEADS → cliente, projeto, etapas e pedidos. */
export function mapearLead(pagina) {
  const p = pagina.properties;
  const v = (nome) => valor(p[nome]);
  const titulo = v("Nome") ?? "(sem nome)";
  const { nome, cidade, uf } = separarTitulo(titulo);

  const cliente = {
    notion_id: pagina.id,
    nome,
    cidade,
    uf,
    razao_social: txt(v("Nome empresarial")),
    cnpj: txt(v("CNPJ")),
    inscricao_estadual: txt(v("Inscrição Estadual")),
    contato_nome: txt(v("Nome completo")),
    email: txt(v("E-mail")),
    telefone: txt(v("Telefone")),
    endereco: txt(v("Endereço")),
  };

  const privado = { cpf: txt(v("CPF")), data_nascimento: data(v("Data de nascimento")) };

  const valorProposta = v("Valor da proposta");
  const projeto = {
    notion_id: pagina.id,
    titulo,
    plano: PLANO[v("PLENO")] ?? null,
    status_comercial: STATUS_COMERCIAL[v("Status")] ?? "nao_iniciada",
    valor_proposta_centavos: typeof valorProposta === "number" ? Math.round(valorProposta * 100) : null,
    data_apresentacao: data(v("Data de apresentação")),
    data_fechamento: data(v("Data fechamento")),
    data_entrega: data(v("Data entrega")),
  };

  const principal = v("item principal");
  const projetoPrincipalNotionId = Array.isArray(principal) && principal.length ? principal[0] : null;

  const etapas = [];
  for (const [tipo, coluna] of Object.entries(ETAPAS)) {
    const s = v(coluna);
    if (s && ETAPA_STATUS[s]) etapas.push({ tipo, status: ETAPA_STATUS[s] });
  }
  const instalacao = txt(v("Mariana/Instalação"));
  if (instalacao) etapas.push({ tipo: "instalacao", observacao: instalacao });

  projeto.etapa_atual = etapaAtual(etapas, projeto.status_comercial);

  const pedidos = [];
  for (const [fornecedor, c] of Object.entries(FORNECEDORES)) {
    const status = PEDIDO_STATUS[v(c.status)] ?? null;
    const codigoNum = (c.codigo ?? []).map(v).find((x) => typeof x === "number");
    const enviado = c.enviado ? (v(c.enviado) ?? []).includes("ENVIADO") : false;
    const pedido = {
      fornecedor,
      status: status ?? "nao_iniciada",
      codigo: codigoNum != null ? String(codigoNum) : null,
      entrega_prevista: c.entrega ? data(v(c.entrega)) : null,
      orcamento_status: c.orcamento ? (ETAPA_STATUS[v(c.orcamento)] ?? null) : enviado ? "em_andamento" : null,
      orcamento_data: c.orcamentoData ? data(v(c.orcamentoData)) : null,
    };
    // Pinhões usa os mesmos valores de etapa; no pedido só valem os quatro do pedido.
    if (pedido.orcamento_status && !Object.values(PEDIDO_STATUS).includes(pedido.orcamento_status)) {
      pedido.orcamento_status = "em_andamento";
    }
    const temAlgo = status || pedido.codigo || pedido.entrega_prevista || pedido.orcamento_status || pedido.orcamento_data;
    if (temAlgo) pedidos.push(pedido);
  }

  const arquivos = (v("Data Refrigeração") ?? []).filter((a) => a.url);

  return { cliente, privado, projeto, projetoPrincipalNotionId, etapas, pedidos, arquivos };
}

const TIPO_TAG = { "FOLLOW UP": "follow_up", "LEAD'S": "lead", LIGAR: "ligar", "FERIADO - FOLGA": "folga" };
const TAREFA_STATUS = { "Não iniciada": "nao_iniciada", "Em andamento": "em_andamento", Concluído: "concluido" };

/** Calendário e Gestão de Compromissos → compromissos. */
export function mapearCompromisso(pagina, { pessoaPadrao } = {}) {
  const p = pagina.properties;
  const d = valor(p["Data"]);
  if (!d) return null;
  const tags = valor(p["Tags"]) ?? [];
  const tipo = tags.map((t) => TIPO_TAG[t]).find(Boolean) ?? "outro";
  const pessoas = tags.filter((t) => !TIPO_TAG[t] && !/FEIRA$/.test(t));
  if (pessoaPadrao && !pessoas.length) pessoas.push(pessoaPadrao);
  const obs = ["Observações", "Texto", "Texto 1"].map((c) => valor(p[c])).filter(Boolean).join("\n");
  const diaInteiro = d.inicio.length <= 10;
  return {
    notion_id: pagina.id,
    titulo: valor(p["Nome"]) ?? "(sem título)",
    inicio: diaInteiro ? `${d.inicio}T12:00:00Z` : d.inicio,
    fim: d.fim ? (d.fim.length <= 10 ? `${d.fim}T12:00:00Z` : d.fim) : null,
    dia_inteiro: diaInteiro,
    tipo,
    status: TAREFA_STATUS[valor(p["Status"])] ?? "nao_iniciada",
    pessoas,
    observacoes: obs || null,
  };
}

/** EM ANDAMENTO → tarefas. */
export function mapearTarefa(pagina) {
  const p = pagina.properties;
  return {
    notion_id: pagina.id,
    titulo: valor(p["Nome"]) ?? "(sem título)",
    status: TAREFA_STATUS[valor(p["Status"])] ?? "nao_iniciada",
    pessoas: [...(valor(p["Selecionar"]) ?? []), ...(valor(p["Atribuir"]) ?? [])],
  };
}
