import { describe, expect, it } from "vitest";
import { mapearCompromisso, mapearLead, mapearTarefa, separarTitulo } from "./mapear.mjs";

const titulo = (s) => ({ type: "title", title: [{ plain_text: s }] });
const texto = (s) => ({ type: "rich_text", rich_text: [{ plain_text: s }] });
const sel = (s) => ({ type: "select", select: s ? { name: s } : null });
const st = (s) => ({ type: "status", status: { name: s } });
const dt = (s) => ({ type: "date", date: s ? { start: s, end: null } : null });
const num = (n) => ({ type: "number", number: n });
const multi = (...s) => ({ type: "multi_select", multi_select: s.map((name) => ({ name })) });

// Parecido com "SUP MAIS VOCÊ - SANTA BARBARA/MG" lido do Notion em 30/09/2026.
const lead = {
  id: "81b861e1-2580-831a-ba63-010a7dc80969",
  properties: {
    Nome: titulo("SUP MAIS VOCÊ - SANTA BARBARA/MG"),
    Status: st("Fechado"),
    PLENO: st("PLENO 180"),
    "2D": sel("Concluído"),
    "3D": sel("Concluído"),
    "Reunião de alinhamento": sel("Não realizada"),
    Detalhamento: sel("Não inciado"),
    CONTRATO: st("Concluído"),
    "Valor da proposta": num(350000),
    "Data de apresentação": dt("2026-07-01T12:00:00.000Z"),
    "Data fechamento": dt("2026-07-16"),
    PINHÕES: sel("Concluído"),
    "Data Pinhões": dt("2026-06-03"),
    IMF: multi("ENVIADO"),
    "Data IMF": dt("2026-06-03"),
    "Cód IMF": num(4521),
    "Pedido IMF": st("Concluído"),
    "Pedido Pinhões": st("Em andamento"),
    "Pedido Tempo": st("Sem pedido"),
    "Pedido Imperial": st("Em andamento"),
    "Mariana/Instalação": texto('<span color="red">**21/07/2026 (medir)**</span>'),
    CPF: texto(""),
    "item principal": { type: "relation", relation: [] },
  },
};

describe("separarTitulo", () => {
  it("separa nome, cidade e UF", () => {
    expect(separarTitulo("SUP CBAESA - SIMONESIA/MG")).toEqual({ nome: "SUP CBAESA", cidade: "SIMONESIA", uf: "MG" });
  });
  it("usa o último traço", () => {
    expect(separarTitulo("SUP A - B - CIDADE/SP")).toEqual({ nome: "SUP A - B", cidade: "CIDADE", uf: "SP" });
  });
  it("aceita título sem cidade", () => {
    expect(separarTitulo("BETTE SUP")).toEqual({ nome: "BETTE SUP", cidade: null, uf: null });
  });
});

describe("mapearLead", () => {
  const r = mapearLead(lead);

  it("cria cliente e projeto", () => {
    expect(r.cliente).toMatchObject({ nome: "SUP MAIS VOCÊ", cidade: "SANTA BARBARA", uf: "MG", notion_id: lead.id });
    expect(r.projeto).toMatchObject({
      titulo: "SUP MAIS VOCÊ - SANTA BARBARA/MG",
      plano: "pleno_180",
      status_comercial: "fechado",
      valor_proposta_centavos: 35000000,
      data_apresentacao: "2026-07-01",
      data_fechamento: "2026-07-16",
    });
    expect(r.privado).toEqual({ cpf: null, data_nascimento: null });
  });

  it("converte as etapas, incluindo erros de digitação do Notion", () => {
    const e = Object.fromEntries(r.etapas.map((x) => [x.tipo, x.status ?? x.observacao]));
    expect(e.projeto_2d).toBe("concluido");
    expect(e.contrato).toBe("concluido");
    expect(e.reuniao_alinhamento).toBe("nao_iniciada");
    expect(e.detalhamento).toBe("nao_iniciada");
    expect(e.instalacao).toBe("**21/07/2026 (medir)**");
  });

  it("cria um pedido por fornecedor com dados", () => {
    const p = Object.fromEntries(r.pedidos.map((x) => [x.fornecedor, x]));
    expect(Object.keys(p).sort()).toEqual(["IMF", "Imperial", "Pinhões", "Tempo"]);
    expect(p.IMF).toMatchObject({ status: "concluido", codigo: "4521", orcamento_status: "em_andamento", orcamento_data: "2026-06-03" });
    expect(p["Pinhões"]).toMatchObject({ status: "em_andamento", orcamento_status: "concluido" });
    expect(p.Tempo.status).toBe("sem_pedido");
  });
});

describe("agenda e tarefas", () => {
  it("compromisso do Wander vira follow up com o Wander", () => {
    const c = mapearCompromisso(
      { id: "x", properties: { Nome: titulo("Ligar Bette"), Data: dt("2026-10-02"), Tags: multi("SEXTA - FEIRA", "FOLLOW UP"), Status: st("Não iniciada") } },
      { pessoaPadrao: "WANDER" },
    );
    expect(c).toMatchObject({ tipo: "follow_up", pessoas: ["WANDER"], dia_inteiro: true, inicio: "2026-10-02T12:00:00Z" });
  });
  it("folga no calendário mantém as pessoas", () => {
    const c = mapearCompromisso({ id: "y", properties: { Nome: titulo("Folga"), Data: dt("2026-11-02"), Tags: multi("ALINE", "FERIADO - FOLGA") } });
    expect(c).toMatchObject({ tipo: "folga", pessoas: ["ALINE"] });
  });
  it("tarefa guarda os responsáveis", () => {
    const t = mapearTarefa({ id: "z", properties: { Nome: titulo("Render 3D"), Status: st("Em andamento"), Selecionar: multi("RUAN") } });
    expect(t).toMatchObject({ titulo: "Render 3D", status: "em_andamento", pessoas: ["RUAN"] });
  });
});
