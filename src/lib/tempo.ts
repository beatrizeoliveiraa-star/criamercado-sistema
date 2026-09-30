import {
  NOME_ETAPA,
  NOME_ETAPA_STATUS,
  NOME_PEDIDO_STATUS,
  NOME_PLANO,
  NOME_STATUS_COMERCIAL,
  dataCurta,
  reais,
  type EtapaTipo,
  type ProjetoCompleto,
} from "./dominio";

export type ItemTipo = "etapa" | "comentario" | "ligacao" | "tarefa" | "mudanca";

export interface ItemTempo {
  chave: string;
  tipo: ItemTipo;
  quem: string;
  em: string;
  texto: string;
}

const NOME_CAMPO: Record<string, string> = {
  plano: "o plano", valor_proposta_centavos: "o valor", data_apresentacao: "a apresentação",
  data_fechamento: "o fechamento", data_entrega: "a entrega", observacoes: "as observações", titulo: "o nome",
};

function valorLegivel(campo: string, v: string | null) {
  if (v == null || v === "") return "vazio";
  if (campo === "valor_proposta_centavos") return reais(Number(v));
  if (campo.startsWith("data_")) return dataCurta(v);
  if (campo === "plano") return NOME_PLANO[v as keyof typeof NOME_PLANO] ?? v;
  return v;
}

/**
 * Junta comentários, ligações, tarefas e o histórico automático numa linha do tempo, mais recente primeiro.
 * Quando o negócio muda de etapa, as mudanças automáticas da mesma operação (etapas anteriores concluídas etc.)
 * ficam escondidas para não poluir.
 */
export function linhaDoTempo(d: ProjetoCompleto): ItemTempo[] {
  const itens: ItemTempo[] = [];
  const tipoDaEtapa = new Map<string, EtapaTipo>(d.etapas.map((e) => [e.id, e.tipo]));
  const movimentos = new Set(d.historico.filter((h) => h.campo === "etapa_atual").map((h) => h.em));

  for (const a of d.atividades) {
    itens.push({ chave: `a${a.id}`, tipo: a.tipo, quem: a.usuario ?? "Alguém", em: a.em, texto: a.texto });
  }

  for (const t of d.tarefas) {
    const quem = t.pessoas.join(", ");
    itens.push({
      chave: `t${t.id}`, tipo: "tarefa", quem: "Tarefa", em: t.criado_em,
      texto: `Criada: ${t.titulo}${t.prazo ? ` (prazo ${dataCurta(t.prazo)})` : ""}${quem ? ` · ${quem}` : ""}`,
    });
    if (t.concluida_em) {
      itens.push({ chave: `tc${t.id}`, tipo: "tarefa", quem: "Tarefa", em: t.concluida_em, texto: `Concluída: ${t.titulo}` });
    }
  }

  for (const h of d.historico) {
    const quem = h.usuario ?? "Sistema";
    const base = { chave: `h${h.id}`, quem, em: h.em };
    if (h.campo === "etapa_atual") {
      itens.push({ ...base, tipo: "etapa", texto: h.para ? `Moveu para ${NOME_ETAPA[h.para as EtapaTipo]}` : "Voltou para Lead" });
    } else if (h.campo === "status_comercial") {
      itens.push({ ...base, tipo: "etapa", texto: `Status: ${NOME_STATUS_COMERCIAL[h.para as keyof typeof NOME_STATUS_COMERCIAL] ?? h.para}` });
    } else if (movimentos.has(h.em)) {
      continue;
    } else if (h.tabela === "etapas" && h.campo === "status") {
      const t = tipoDaEtapa.get(h.registro_id);
      const s = NOME_ETAPA_STATUS[h.para as keyof typeof NOME_ETAPA_STATUS] ?? h.para;
      itens.push({ ...base, tipo: "mudanca", texto: `${t ? NOME_ETAPA[t] : "Etapa"}: ${s}` });
    } else if (h.tabela === "pedidos" && h.campo === "status") {
      itens.push({ ...base, tipo: "mudanca", texto: `Pedido: ${NOME_PEDIDO_STATUS[h.para as keyof typeof NOME_PEDIDO_STATUS] ?? h.para}` });
    } else if (h.tabela === "projetos" && NOME_CAMPO[h.campo]) {
      itens.push({ ...base, tipo: "mudanca", texto: `Mudou ${NOME_CAMPO[h.campo]} para ${valorLegivel(h.campo, h.para)}` });
    }
  }

  return itens.sort((a, b) => b.em.localeCompare(a.em));
}
