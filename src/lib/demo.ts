import type { Dados } from "./dados";
import {
  ORDEM_ETAPAS,
  type Cliente,
  type Etapa,
  type EtapaStatus,
  type EtapaTipo,
  type Envio,
  type Historico,
  type Inscricao,
  type Pedido,
  type Projeto,
  type Usuario,
} from "./dominio";

// Modo demonstração: roda sem banco, com clientes fictícios, para ver as telas.

const eu: Usuario = { id: "demo", nome: "Demonstração", email: null, papeis: ["admin"] };

let seq = 0;
const novoId = () => `d${++seq}`;

const clientes: Cliente[] = [];
const projetos: Projeto[] = [];
const etapas: Etapa[] = [];
const pedidos: (Pedido & { projeto_id: string })[] = [];
const historico: (Historico & { projeto_id: string })[] = [];

function semear(
  nome: string,
  cidade: string,
  p: Partial<Projeto>,
  est: Partial<Record<EtapaTipo, EtapaStatus>>,
  peds: Partial<Pedido>[] = [],
) {
  const c: Cliente = {
    id: novoId(), nome, cidade, uf: "MG", razao_social: null, cnpj: null, inscricao_estadual: null,
    contato_nome: null, email: null, telefone: null, endereco: null,
  };
  clientes.push(c);
  const proj: Projeto = {
    id: novoId(), cliente_id: c.id, titulo: `${nome} - ${cidade.toUpperCase()}/MG`, plano: null,
    status_comercial: "nao_iniciada", valor_proposta_centavos: null, data_apresentacao: null,
    data_fechamento: null, data_entrega: null, observacoes: null, ...p,
  };
  projetos.push(proj);
  for (const tipo of ORDEM_ETAPAS) {
    etapas.push({ id: novoId(), projeto_id: proj.id, tipo, status: est[tipo] ?? "nao_iniciada", data: null, observacao: null });
  }
  for (const x of peds) {
    pedidos.push({
      id: novoId(), projeto_id: proj.id, fornecedor: "", orcamento_status: null, orcamento_data: null, codigo: null,
      status: "nao_iniciada", entrega_prevista: null, entregue_em: null, ...x,
    });
  }
}

semear("SUP EXEMPLO", "Viçosa", { plano: "pleno_360", status_comercial: "em_andamento", valor_proposta_centavos: 28000000, data_apresentacao: "2026-10-08" },
  { proposta: "em_andamento", projeto_2d: "aprovacao_interna" });
semear("MERCADO MODELO", "Ubá", { plano: "pleno_180", status_comercial: "nao_iniciada" }, {});
semear("SUP BOA COMPRA", "Muriaé", { plano: "pleno_360", status_comercial: "follow_up", valor_proposta_centavos: 41000000, data_apresentacao: "2026-09-12" },
  { proposta: "concluido", projeto_2d: "concluido", projeto_3d: "concluido" });
semear("SUP PRAÇA", "Manhuaçu", { plano: "pleno_90", status_comercial: "nao_concluida", valor_proposta_centavos: 9500000 },
  { proposta: "concluido", projeto_2d: "desistencia" });
semear("SUP CENTRO", "Ponte Nova", { plano: "pleno_360", status_comercial: "fechado", valor_proposta_centavos: 35000000, data_fechamento: "2026-07-07" },
  { proposta: "concluido", projeto_2d: "concluido", projeto_3d: "concluido", contrato: "concluido", reuniao_alinhamento: "concluido", detalhamento: "em_andamento" },
  [
    { fornecedor: "Tempo", status: "concluido", entrega_prevista: "2026-10-20" },
    { fornecedor: "Pinhões", status: "em_andamento", orcamento_status: "concluido", orcamento_data: "2026-06-03" },
    { fornecedor: "IMF", status: "concluido", codigo: "4521", entrega_prevista: "2026-10-30" },
    { fornecedor: "Gelopar", status: "sem_pedido" },
  ]);

// Calls da Superminas: daqui a 1, 2 e 6 dias, às 10h/15h de Brasília.
const emDias = (d: number, h: number) => {
  const x = new Date(Date.now() + d * 86_400_000);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(x);
  return new Date(`${ymd}T${String(h).padStart(2, "0")}:00:00-03:00`).toISOString();
};
const inscricoes: Inscricao[] = [
  ["SUPERMERCADO SÃO JOSÉ", "11222333000181", "Carangola", "José Carlos Moreira", "32988881111", "jose@supsaojose.com.br", emDias(1, 10), true, false, false],
  ["MERCADINHO DA PRAÇA", "11444777000161", "Cataguases", "Márcia Lopes", "32977772222", "marcia@mercadinhodapraca.com", emDias(2, 15), false, false, false],
  ["SUP BOA VIAGEM", "45723174000110", "Leopoldina", "Rafael Andrade", "32966663333", "rafael@boaviagem.com.br", emDias(6, 11), true, true, true],
].map(([empresa, cnpj, cidade, responsavel, whatsapp, email, call_em, fat, set, vid], n) => ({
  id: novoId(), origem: "superminas-folder", empresa, cnpj, cidade, uf: "MG", responsavel, whatsapp, email, call_em,
  cupom: `SUPERMINAS10-${["K7PQ", "M3XA", "R9TE"][n]}`, status: "agendada", link_call: null,
  recebeu_faturamento: fat, recebeu_setores: set, recebeu_video: vid, observacoes: null, projeto_id: null,
  criado_em: new Date(Date.now() - (3 - n) * 86_400_000).toISOString(),
})) as Inscricao[];
const envios: (Envio & { inscricao_id: string })[] = [];

const pausa = () => new Promise((r) => setTimeout(r, 120));

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
      if (!projeto) throw new Error("Projeto não encontrado.");
      return {
        projeto: { ...projeto },
        cliente: { ...clientes.find((c) => c.id === projeto.cliente_id)! },
        privado: { cpf: null, data_nascimento: null },
        etapas: etapas.filter((e) => e.projeto_id === id).map((e) => ({ ...e })),
        pedidos: pedidos.filter((p) => p.projeto_id === id),
        historico: historico.filter((h) => h.projeto_id === id).slice().reverse(),
      };
    },
    async clientes() {
      await pausa();
      return clientes.map((c) => ({ ...c, projetos: projetos.filter((p) => p.cliente_id === c.id).length }));
    },
    async atualizarProjeto(id, campos) {
      const p = projetos.find((x) => x.id === id)!;
      registrar("projetos", id, p, campos);
      Object.assign(p, campos);
    },
    async atualizarEtapa(id, campos) {
      const e = etapas.find((x) => x.id === id)!;
      registrar("etapas", e.projeto_id, e, campos);
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
        status_comercial: "nao_iniciada", data_fechamento: null, data_entrega: null, observacoes: null,
        ...novo.projeto,
      };
      projetos.unshift(proj);
      for (const tipo of ORDEM_ETAPAS) {
        etapas.push({ id: novoId(), projeto_id: proj.id, tipo, status: "nao_iniciada", data: null, observacao: null });
      }
      return proj.id;
    },
    async inscricoes() {
      await pausa();
      return inscricoes.map((i) => ({ ...i })).sort((a, b) => a.call_em.localeCompare(b.call_em));
    },
    async inscricao(id) {
      await pausa();
      const i = inscricoes.find((x) => x.id === id);
      if (!i) throw new Error("Inscrição não encontrada.");
      return { inscricao: { ...i }, envios: envios.filter((e) => e.inscricao_id === id).slice().reverse() };
    },
    async atualizarInscricao(id, campos) {
      Object.assign(inscricoes.find((x) => x.id === id)!, campos);
    },
    async registrarEnvio(id, canal, tipo, texto) {
      envios.push({ id: envios.length + 1, inscricao_id: id, canal, tipo, texto, usuario: eu.nome, em: new Date().toISOString() });
    },
    async enviarEmail() {
      throw new Error("Modo demonstração: o envio de e-mail pelo servidor não está ligado. Use \"Abrir no meu e-mail\".");
    },
  };
}

function registrar(tabela: string, projetoId: string, antes: object, campos: object) {
  for (const [campo, para] of Object.entries(campos)) {
    const de = (antes as Record<string, unknown>)[campo];
    if (de !== para) {
      historico.push({
        id: historico.length + 1, projeto_id: projetoId, tabela, campo,
        de: de == null ? null : String(de), para: para == null ? null : String(para),
        usuario: eu.nome, em: new Date().toISOString(),
      });
    }
  }
}
