// Tipos e nomes em português, iguais aos do Notion, para a equipe reconhecer tudo.

export type Papel = "admin" | "comercial" | "projetos" | "compras" | "instalacao";
export type StatusComercial = "nao_iniciada" | "em_andamento" | "nao_concluida" | "follow_up" | "fechado";
export type Plano = "representacao_mg" | "pleno_90" | "pleno_180" | "pleno_360";
export type EtapaTipo =
  | "proposta"
  | "projeto_2d"
  | "projeto_3d"
  | "contrato"
  | "reuniao_alinhamento"
  | "detalhamento"
  | "pintura"
  | "comunicacao_visual"
  | "detalhamento_finalizado"
  | "orcamento"
  | "instalacao"
  | "finalizacao";
export type EtapaStatus =
  | "nao_iniciada"
  | "em_andamento"
  | "pausado"
  | "aprovacao_interna"
  | "aprovacao_cliente"
  | "concluido"
  | "desistencia";
export type PedidoStatus = "nao_iniciada" | "em_andamento" | "concluido" | "sem_pedido";
export type TarefaStatus = "nao_iniciada" | "em_andamento" | "concluido";
export type AtividadeTipo = "comentario" | "ligacao";

export interface Usuario {
  id: string;
  nome: string;
  email: string | null;
  papeis: Papel[];
}

export interface Cliente {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  razao_social: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  contato_nome: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
}

export interface ClientePrivado {
  cpf: string | null;
  data_nascimento: string | null;
}

export interface Etapa {
  id: string;
  projeto_id: string;
  tipo: EtapaTipo;
  status: EtapaStatus;
  data: string | null;
  observacao: string | null;
}

export interface Pedido {
  id: string;
  fornecedor: string;
  orcamento_status: PedidoStatus | null;
  orcamento_data: string | null;
  codigo: string | null;
  status: PedidoStatus;
  entrega_prevista: string | null;
  entregue_em: string | null;
}

export interface Projeto {
  id: string;
  cliente_id: string;
  titulo: string;
  plano: Plano | null;
  status_comercial: StatusComercial;
  valor_proposta_centavos: number | null;
  data_apresentacao: string | null;
  data_fechamento: string | null;
  data_entrega: string | null;
  observacoes: string | null;
  /** Onde o negócio está no funil. null = Lead. */
  etapa_atual: EtapaTipo | null;
}

export interface ProjetoResumo extends Projeto {
  cliente: Pick<Cliente, "id" | "nome" | "cidade" | "uf">;
  etapas: Pick<Etapa, "tipo" | "status">[];
}

export interface Historico {
  id: number;
  tabela: string;
  registro_id: string;
  campo: string;
  de: string | null;
  para: string | null;
  usuario: string | null;
  em: string;
}

export interface Atividade {
  id: string;
  tipo: AtividadeTipo;
  texto: string;
  usuario: string | null;
  em: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  status: TarefaStatus;
  prazo: string | null;
  pessoas: string[];
  projeto_id: string | null;
  criado_em: string;
  concluida_em: string | null;
  /** Só na lista geral de tarefas. */
  negocio?: { id: string; nome: string } | null;
}

export interface ProjetoCompleto {
  projeto: Projeto;
  cliente: Cliente;
  privado: ClientePrivado | null;
  etapas: Etapa[];
  pedidos: Pedido[];
  historico: Historico[];
  atividades: Atividade[];
  tarefas: Tarefa[];
}

// ---------------------------------------------------------------- nomes

export const NOME_STATUS_COMERCIAL: Record<StatusComercial, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  nao_concluida: "Não concluída",
  follow_up: "Follow up",
  fechado: "Fechado",
};

/** Status que contam como lead (ainda em negociação). */
export const eLead = (s: StatusComercial) => s !== "fechado" && s !== "nao_concluida";

export const NOME_PLANO: Record<Plano, string> = {
  representacao_mg: "Representação MG",
  pleno_90: "Pleno 90",
  pleno_180: "Pleno 180",
  pleno_360: "Pleno 360",
};

export const NOME_ETAPA: Record<EtapaTipo, string> = {
  proposta: "Proposta",
  projeto_2d: "2D",
  projeto_3d: "3D",
  contrato: "Contrato",
  reuniao_alinhamento: "Reunião de alinhamento",
  detalhamento: "Detalhamento",
  pintura: "Pintura",
  comunicacao_visual: "Comunicação visual",
  detalhamento_finalizado: "Detalhamento finalizado",
  orcamento: "Orçamento",
  instalacao: "Instalação",
  finalizacao: "Finalização",
};

export const ORDEM_ETAPAS: EtapaTipo[] = Object.keys(NOME_ETAPA) as EtapaTipo[];

export const NOME_ETAPA_STATUS: Record<EtapaStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  aprovacao_interna: "Aprovação (Wander)",
  aprovacao_cliente: "Aprovação cliente",
  concluido: "Concluído",
  desistencia: "Desistência",
};

/** Quais status cada etapa aceita (os mesmos do Notion). */
export const STATUS_DA_ETAPA: Record<EtapaTipo, EtapaStatus[]> = {
  proposta: ["nao_iniciada", "em_andamento", "concluido"],
  projeto_2d: ["nao_iniciada", "em_andamento", "aprovacao_interna", "aprovacao_cliente", "concluido", "desistencia"],
  projeto_3d: ["nao_iniciada", "em_andamento", "pausado", "concluido"],
  contrato: ["nao_iniciada", "em_andamento", "concluido"],
  reuniao_alinhamento: ["nao_iniciada", "concluido"],
  detalhamento: ["nao_iniciada", "em_andamento", "concluido"],
  pintura: ["nao_iniciada", "em_andamento", "concluido"],
  comunicacao_visual: ["nao_iniciada", "em_andamento", "concluido"],
  detalhamento_finalizado: ["nao_iniciada", "em_andamento", "concluido"],
  orcamento: ["nao_iniciada", "em_andamento", "concluido"],
  instalacao: ["nao_iniciada", "em_andamento", "concluido"],
  finalizacao: ["nao_iniciada", "em_andamento", "concluido"],
};

export const NOME_PEDIDO_STATUS: Record<PedidoStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  sem_pedido: "Sem pedido",
};

export const NOME_PAPEL: Record<Papel, string> = {
  admin: "Administração",
  comercial: "Comercial",
  projetos: "Projetos",
  compras: "Compras",
  instalacao: "Instalação",
};

/** Quem edita cada etapa (espelha private.pode_editar_etapa no banco). */
export const PAPEL_DA_ETAPA: Record<EtapaTipo, Papel> = {
  proposta: "comercial",
  contrato: "comercial",
  projeto_2d: "projetos",
  projeto_3d: "projetos",
  reuniao_alinhamento: "projetos",
  detalhamento: "projetos",
  pintura: "projetos",
  comunicacao_visual: "projetos",
  detalhamento_finalizado: "projetos",
  orcamento: "compras",
  instalacao: "instalacao",
  finalizacao: "instalacao",
};

export function temPapel(u: Usuario | null, p: Papel) {
  return !!u && (u.papeis.includes(p) || u.papeis.includes("admin"));
}

// ---------------------------------------------------------------- formatação

export function reais(centavos: number | null) {
  if (centavos == null) return "";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** Hoje no formato AAAA-MM-DD, no fuso de quem usa. */
export function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dataCurta(iso: string | null) {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function lugar(c: Pick<Cliente, "cidade" | "uf">) {
  return [c.cidade, c.uf].filter(Boolean).join("/");
}
