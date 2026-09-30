import { describe, expect, it } from "vitest";
import { linhaDoTempo } from "./tempo";
import type { ProjetoCompleto } from "./dominio";

const base: ProjetoCompleto = {
  projeto: {} as ProjetoCompleto["projeto"],
  cliente: {} as ProjetoCompleto["cliente"],
  privado: null,
  etapas: [{ id: "e1", projeto_id: "p", tipo: "proposta", status: "concluido", data: null, observacao: null },
    { id: "e2", projeto_id: "p", tipo: "projeto_2d", status: "aprovacao_interna", data: null, observacao: null }],
  pedidos: [],
  historico: [],
  atividades: [],
  tarefas: [],
};

describe("linhaDoTempo", () => {
  it("mostra a mudança de etapa e esconde o que ela mudou sozinha", () => {
    const em = "2026-10-01T10:00:00Z";
    const r = linhaDoTempo({
      ...base,
      historico: [
        { id: 1, tabela: "projetos", registro_id: "p", campo: "etapa_atual", de: null, para: "projeto_2d", usuario: "Wander", em },
        { id: 2, tabela: "etapas", registro_id: "e1", campo: "status", de: "nao_iniciada", para: "concluido", usuario: "Wander", em },
        { id: 3, tabela: "etapas", registro_id: "e2", campo: "status", de: "em_andamento", para: "aprovacao_interna", usuario: "Ruan", em: "2026-10-02T09:00:00Z" },
      ],
    });
    expect(r.map((i) => i.texto)).toEqual(["2D: Aprovação (Wander)", "Moveu para 2D"]);
  });

  it("junta comentários e tarefas, mais recente primeiro", () => {
    const r = linhaDoTempo({
      ...base,
      atividades: [{ id: "a", tipo: "ligacao", texto: "Vai decidir com os sócios.", usuario: "Wander", em: "2026-10-01T12:00:00Z" }],
      tarefas: [{ id: "t", titulo: "Enviar 3D", status: "concluido", prazo: "2026-10-05", pessoas: ["Ruan"], projeto_id: "p",
        criado_em: "2026-10-01T08:00:00Z", concluida_em: "2026-10-03T08:00:00Z" }],
    });
    expect(r.map((i) => i.tipo)).toEqual(["tarefa", "ligacao", "tarefa"]);
    expect(r[2].texto).toBe("Criada: Enviar 3D (prazo 05/10/2026) · Ruan");
  });

  it("valor aparece em reais", () => {
    const r = linhaDoTempo({
      ...base,
      historico: [{ id: 1, tabela: "projetos", registro_id: "p", campo: "valor_proposta_centavos", de: null, para: "35000000", usuario: null, em: "2026-10-01T10:00:00Z" }],
    });
    expect(r[0].texto).toMatch(/^Mudou o valor para R\$\s350\.000$/);
    expect(r[0].quem).toBe("Sistema");
  });
});
