import type { Dados } from "./dados";
import {
  ORDEM_ETAPAS,
  hoje,
  type Atividade,
  type Cliente,
  type Etapa,
  type EtapaStatus,
  type EtapaTipo,
  type Historico,
  type Pedido,
  type Projeto,
  type Tarefa,
  type Usuario,
} from "./dominio";

// Modo demonstração: roda sem banco, com negócios fictícios, para ver as telas.

const eu: Usuario = { id: "demo", nome: "Bea", email: null, papeis: ["admin"] };
const EQUIPE = ["Aline", "Bea", "Mariana", "Ruan", "Wander"];

let seq = 0;
const novoId = () => `d${++seq}`;
const agora = () => new Date().toISOString();

const clientes: Cliente[] = [];
const projetos: Projeto[] = [];
const etapas: Etapa[] = [];
const pedidos: (Pedido & { projeto_id: string })[] = [];
const historico: (Historico & { projeto_id: string })[] = [];
const atividades: (Atividade & { projeto_id: string })[] = [];
const tarefas: Tarefa[] = [];

/** Data relativa a hoje, para o exemplo nunca ficar velho. */
function dia(delta: number) {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
const quando = (delta: number, hora = 10) => `${dia(delta)}T${String(hora).padStart(2, "0")}:00:00.000Z`;

interface Semente {
  projeto?: Partial<Projeto>;
  cliente?: Partial<Cliente>;
  etapa?: EtapaTipo | null;
  status?: Partial<Record<EtapaTipo, EtapaStatus>>;
  pedidos?: Partial<Pedido>[];
  tarefas?: [titulo: string, prazo: number, pessoa: string][];
  tempo?: [quem: string, tipo: "comentario" | "ligacao" | "etapa", diasAtras: number, texto: string][];
}

function semear(nome: string, cidade: string, s: Semente = {}) {
  const c: Cliente = {
    id: novoId(), nome, cidade, uf: "MG", razao_social: null, cnpj: null, inscricao_estadual: null,
    contato_nome: null, email: null, telefone: null, endereco: null, ...s.cliente,
  };
  clientes.push(c);
  const etapa = s.etapa ?? null;
  const proj: Projeto = {
    id: novoId(), cliente_id: c.id, titulo: `${nome} - ${cidade.toUpperCase()}/MG`, plano: null,
    status_comercial: "em_andamento", valor_proposta_centavos: null, data_apresentacao: null,
    data_fechamento: null, data_entrega: null, observacoes: null, etapa_atual: etapa, ...s.projeto,
  };
  projetos.push(proj);
  const posicao = etapa ? ORDEM_ETAPAS.indexOf(etapa) : -1;
  for (const [i, tipo] of ORDEM_ETAPAS.entries()) {
    const padrao: EtapaStatus = i < posicao ? "concluido" : i === posicao ? "em_andamento" : "nao_iniciada";
    etapas.push({ id: novoId(), projeto_id: proj.id, tipo, status: s.status?.[tipo] ?? padrao, data: null, observacao: null });
  }
  for (const x of s.pedidos ?? []) {
    pedidos.push({
      id: novoId(), projeto_id: proj.id, fornecedor: "", orcamento_status: null, orcamento_data: null, codigo: null,
      status: "nao_iniciada", entrega_prevista: null, entregue_em: null, ...x,
    });
  }
  for (const [titulo, prazo, pessoa] of s.tarefas ?? []) {
    tarefas.push({ id: novoId(), titulo, status: "nao_iniciada", prazo: dia(prazo), pessoas: [pessoa], projeto_id: proj.id,
      criado_em: quando(Math.min(prazo - 5, -1), 9), concluida_em: null });
  }
  for (const [quem, tipo, atras, texto] of s.tempo ?? []) {
    if (tipo === "etapa") {
      historico.push({ id: historico.length + 1, projeto_id: proj.id, tabela: "projetos", registro_id: proj.id,
        campo: "etapa_atual", de: null, para: texto, usuario: quem, em: quando(-atras) });
    } else {
      atividades.push({ id: novoId(), projeto_id: proj.id, tipo, texto, usuario: quem, em: quando(-atras, 14) });
    }
  }
}

semear("SUP EXEMPLO", "Viçosa", {
  projeto: { plano: "pleno_360", valor_proposta_centavos: 28000000, data_apresentacao: dia(8) },
  cliente: { contato_nome: "Carlos (dono)", telefone: "(31) 9 8888-0001" },
  etapa: "projeto_2d", status: { projeto_2d: "aprovacao_interna" },
  tarefas: [["Enviar 2D revisado", 2, "Ruan"]],
  tempo: [["Ruan", "etapa", 4, "projeto_2d"], ["Wander", "ligacao", 6, "Cliente quer ampliar a área de hortifrúti."], ["Wander", "etapa", 10, "proposta"]],
});
semear("MERCADO MODELO", "Ubá", {
  projeto: { plano: "pleno_180", status_comercial: "nao_iniciada" },
  cliente: { contato_nome: "Ana", telefone: "(32) 9 7777-0002" },
  tarefas: [["Ligar para marcar visita", -1, "Wander"]],
  tempo: [["Wander", "comentario", 2, "Indicação do SUP CENTRO."]],
});
semear("SUP BOA COMPRA", "Muriaé", {
  projeto: { plano: "pleno_360", status_comercial: "follow_up", valor_proposta_centavos: 41000000, data_apresentacao: dia(-18) },
  etapa: "projeto_3d", status: { projeto_3d: "concluido" },
  tarefas: [["Follow up da proposta", 3, "Wander"]],
  tempo: [["Wander", "ligacao", 8, "Vai decidir depois da reunião com os sócios."], ["Ruan", "etapa", 15, "projeto_3d"]],
});
semear("SUP PRAÇA", "Manhuaçu", {
  projeto: { plano: "pleno_90", status_comercial: "nao_concluida", valor_proposta_centavos: 9500000 },
  etapa: "projeto_2d", status: { projeto_2d: "desistencia" },
  tempo: [["Wander", "comentario", 20, "Não fechou: achou o valor alto. Tentar de novo em 2027."]],
});
semear("SUP CENTRO", "Ponte Nova", {
  projeto: { plano: "pleno_360", status_comercial: "fechado", valor_proposta_centavos: 35000000, data_apresentacao: dia(-100), data_fechamento: dia(-85) },
  cliente: { contato_nome: "Marcos", telefone: "(31) 9 6666-0003", cnpj: "12.345.678/0001-90" },
  etapa: "detalhamento",
  pedidos: [
    { fornecedor: "Tempo", status: "concluido", entrega_prevista: dia(20) },
    { fornecedor: "Pinhões", status: "em_andamento", orcamento_status: "concluido", orcamento_data: dia(-30) },
    { fornecedor: "IMF", status: "concluido", codigo: "4521", entrega_prevista: dia(30) },
    { fornecedor: "Gelopar", status: "sem_pedido" },
  ],
  tarefas: [["Aprovar detalhamento com o cliente", 6, "Aline"]],
  tempo: [["Aline", "etapa", 12, "detalhamento"], ["Aline", "comentario", 28, "Reunião de alinhamento feita, cliente aprovou o layout."], ["Wander", "etapa", 85, "contrato"]],
});
semear("SUP MAIS VOCÊ", "Santa Bárbara", {
  projeto: { plano: "pleno_180", status_comercial: "fechado", valor_proposta_centavos: 35000000, data_fechamento: dia(-76) },
  etapa: "instalacao",
  pedidos: [{ fornecedor: "Pinhões", status: "em_andamento" }, { fornecedor: "IMF", status: "concluido" }, { fornecedor: "Imperial", status: "em_andamento" }],
  tarefas: [["Medir a loja", 21, "Mariana"]],
  tempo: [["Mariana", "etapa", 5, "instalacao"]],
});
semear("SUP CBAESA", "Simonésia", {
  projeto: { plano: "pleno_90", valor_proposta_centavos: 12000000, data_apresentacao: dia(14) },
  etapa: "proposta",
  tempo: [["Wander", "etapa", 3, "proposta"]],
});
semear("BETTE SUP", "Caratinga", {
  projeto: { plano: "representacao_mg", status_comercial: "follow_up" },
  tarefas: [["Ligar Bette", 2, "Wander"]],
});
semear("SUP FAMÍLIA", "Ervália", {
  projeto: { plano: "pleno_360", status_comercial: "fechado", valor_proposta_centavos: 39000000, data_fechamento: dia(-200), data_entrega: dia(-18) },
  etapa: "finalizacao", status: { finalizacao: "concluido" },
  tempo: [["Mariana", "comentario", 18, "Loja inaugurada."]],
});
semear("SUP ECONÔMICO", "Rio Pomba", {
  projeto: { plano: "pleno_180", status_comercial: "nao_concluida", valor_proposta_centavos: 16000000 },
  etapa: "proposta",
  tempo: [["Wander", "comentario", 31, "Fechou com outra empresa."]],
});

const pausa = () => new Promise((r) => setTimeout(r, 120));

function registrarMudanca(tabela: string, projetoId: string, registroId: string, antes: object, campos: object, em = agora()) {
  for (const [campo, para] of Object.entries(campos)) {
    const de = (antes as Record<string, unknown>)[campo];
    if (de !== para) {
      historico.push({
        id: historico.length + 1, projeto_id: projetoId, tabela, registro_id: registroId, campo,
        de: de == null ? null : String(de), para: para == null ? null : String(para), usuario: eu.nome, em,
      });
    }
  }
}

function nomeDoNegocio(projetoId: string | null) {
  const p = projetos.find((x) => x.id === projetoId);
  const c = p && clientes.find((x) => x.id === p.cliente_id);
  return p && c ? { id: p.id, nome: c.nome } : null;
}

export function dadosDemo(): Dados {
  return {
    modo: "demo",
    async eu() {
      return eu;
    },
    async entrar() {},
    async sair() {},
    aoMudarSessao() {
      return () => {};
    },
    async projetos() {
      await pausa();
      return projetos.map((p) => {
        const c = clientes.find((x) => x.id === p.cliente_id)!;
        return {
          ...p,
          cliente: { id: c.id, nome: c.nome, cidade: c.cidade, uf: c.uf },
          etapas: etapas.filter((e) => e.projeto_id === p.id).map(({ tipo, status }) => ({ tipo, status })),
        };
      });
    },
    async projeto(id) {
      await pausa();
      const projeto = projetos.find((p) => p.id === id);
      if (!projeto) throw new Error("Negócio não encontrado.");
      return {
        projeto: { ...projeto },
        cliente: { ...clientes.find((c) => c.id === projeto.cliente_id)! },
        privado: { cpf: null, data_nascimento: null },
        etapas: etapas.filter((e) => e.projeto_id === id).map((e) => ({ ...e })),
        pedidos: pedidos.filter((p) => p.projeto_id === id),
        historico: historico.filter((h) => h.projeto_id === id),
        atividades: atividades.filter((a) => a.projeto_id === id),
        tarefas: tarefas.filter((t) => t.projeto_id === id).map((t) => ({ ...t })),
      };
    },
    async clientes() {
      await pausa();
      return clientes.map((c) => ({ ...c, projetos: projetos.filter((p) => p.cliente_id === c.id).length }));
    },
    async atualizarProjeto(id, campos) {
      const p = projetos.find((x) => x.id === id)!;
      registrarMudanca("projetos", id, id, p, campos);
      Object.assign(p, campos);
    },
    async atualizarEtapa(id, campos) {
      const e = etapas.find((x) => x.id === id)!;
      registrarMudanca("etapas", e.projeto_id, e.id, e, campos);
      Object.assign(e, campos);
    },
    async criarProjeto(novo) {
      let clienteId = novo.cliente_id;
      if (!clienteId && novo.cliente) {
        const c: Cliente = {
          id: novoId(), razao_social: null, cnpj: null, inscricao_estadual: null, contato_nome: null, endereco: null,
          ...novo.cliente,
        };
        clientes.push(c);
        clienteId = c.id;
      }
      const c = clientes.find((x) => x.id === clienteId)!;
      const proj: Projeto = {
        id: novoId(), cliente_id: c.id, titulo: [c.nome, [c.cidade, c.uf].filter(Boolean).join("/")].filter(Boolean).join(" - "),
        status_comercial: "nao_iniciada", data_fechamento: null, data_entrega: null, observacoes: null, etapa_atual: null,
        ...novo.projeto,
      };
      projetos.unshift(proj);
      for (const tipo of ORDEM_ETAPAS) {
        etapas.push({ id: novoId(), projeto_id: proj.id, tipo, status: "nao_iniciada", data: null, observacao: null });
      }
      return proj.id;
    },
    // Mesma regra de public.mover_etapa no banco.
    async moverEtapa(projetoId, etapa) {
      const p = projetos.find((x) => x.id === projetoId)!;
      const atual = p.etapa_atual;
      if (atual === etapa) return;
      const em = agora();
      registrarMudanca("projetos", p.id, p.id, p, { etapa_atual: etapa }, em);
      p.etapa_atual = etapa;
      const ordem = (t: EtapaTipo | null) => (t ? ORDEM_ETAPAS.indexOf(t) : -1);
      if (etapa && ordem(etapa) > ordem(atual)) {
        for (const e of etapas.filter((x) => x.projeto_id === p.id)) {
          if (ordem(e.tipo) < ordem(etapa) && ["nao_iniciada", "em_andamento", "aprovacao_interna", "aprovacao_cliente"].includes(e.status)) {
            e.status = "concluido";
          } else if (e.tipo === etapa && e.status === "nao_iniciada") {
            e.status = "em_andamento";
          }
        }
      }
      if (ordem(etapa) >= ordem("contrato") && p.status_comercial !== "fechado") {
        registrarMudanca("projetos", p.id, p.id, p, { status_comercial: "fechado" }, em);
        p.status_comercial = "fechado";
        p.data_fechamento ??= hoje();
      }
    },
    async registrar(projetoId, tipo, texto) {
      atividades.push({ id: novoId(), projeto_id: projetoId, tipo, texto, usuario: eu.nome, em: agora() });
    },
    async tarefas() {
      await pausa();
      return tarefas
        .filter((t) => t.status !== "concluido")
        .sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"))
        .map((t) => ({ ...t, negocio: nomeDoNegocio(t.projeto_id) }));
    },
    async criarTarefa(nova) {
      tarefas.push({ id: novoId(), status: "nao_iniciada", criado_em: agora(), concluida_em: null, ...nova });
    },
    async concluirTarefa(id, feita) {
      const t = tarefas.find((x) => x.id === id)!;
      t.status = feita ? "concluido" : "nao_iniciada";
      t.concluida_em = feita ? agora() : null;
    },
    async equipe() {
      return EQUIPE;
    },
  };
}
