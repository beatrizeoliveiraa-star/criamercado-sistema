import { describe, expect, it } from "vitest";
import { agruparPorDia, arquivoIcs, cnpjValido, hora, linkGoogleAgenda, mascaraCelular, mascaraCnpj, nomeDia } from "./superminas";
import { linkWhatsApp, montarMensagem, quando, textoParaEmail } from "./mensagens";
import type { Inscricao } from "./dominio";

describe("página da Superminas", () => {
  it("máscaras e CNPJ", () => {
    expect(mascaraCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(mascaraCelular("32984069195")).toBe("(32) 98406-9195");
    expect(mascaraCelular("3233334444")).toBe("(32) 3333-4444");
  });

  it("datas no horário de Brasília", () => {
    const iso = "2026-11-24T14:00:00.000Z"; // 11:00 em Brasília
    expect(hora(iso)).toBe("11:00");
    expect(nomeDia(iso)).toBe("terça-feira, 24 de novembro");
    const dias = agruparPorDia(["2026-11-25T12:00:00Z", iso, "2026-11-24T17:00:00Z"]);
    expect([...dias.keys()]).toEqual(["2026-11-24", "2026-11-25"]);
    expect(dias.get("2026-11-24")).toEqual([iso, "2026-11-24T17:00:00Z"]);
  });

  it("agenda: Google e arquivo .ics com uma hora de call", () => {
    expect(linkGoogleAgenda("2026-11-24T14:00:00.000Z")).toContain("dates=20261124T140000Z%2F20261124T150000Z");
    const ics = arquivoIcs("2026-11-24T14:00:00.000Z", "x");
    expect(ics).toContain("DTSTART:20261124T140000Z");
    expect(ics).toContain("DTEND:20261124T150000Z");
  });
});

describe("mensagens", () => {
  const i = {
    responsavel: "José Carlos", call_em: "2026-11-24T14:00:00.000Z", cupom: "SUPERMINAS10-K7PQ", link_call: null,
    recebeu_faturamento: true, recebeu_setores: false, recebeu_video: false,
  } as Inscricao;

  it("pede só os materiais que faltam", () => {
    const t = montarMensagem("materiais", i);
    expect(t).toMatch(/^Olá, José!/);
    expect(t).not.toContain("Faturamento detalhado");
    expect(t).toContain("1. *Setores do supermercado*");
    expect(t).toContain("2. *Vídeo de todo o supermercado*");
  });

  it("lembrete diz amanhã e traz o link", () => {
    const t = montarMensagem("lembrete", { ...i, link_call: "https://meet.google.com/abc" }, new Date("2026-11-23T15:00:00Z"));
    expect(t).toContain("amanhã, terça-feira, 24 de novembro, às 11:00");
    expect(t).toContain("https://meet.google.com/abc");
    expect(quando(i.call_em, new Date("2026-11-24T02:00:00Z"))).toBe("amanhã"); // 23h de 23/11 em Brasília
    expect(quando(i.call_em, new Date("2026-11-24T04:00:00Z"))).toBe("hoje");
  });

  it("WhatsApp com DDI e e-mail sem asteriscos", () => {
    expect(linkWhatsApp("(32) 98406-9195", "oi")).toBe("https://wa.me/5532984069195?text=oi");
    expect(textoParaEmail("1. *Vídeo* da loja")).toBe("1. Vídeo da loja");
  });
});
