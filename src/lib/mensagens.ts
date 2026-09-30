import type { Inscricao } from "./dominio";
import { diaLocal, hora, nomeDia } from "./superminas";

// Mensagens prontas para o cliente da Superminas. O admin pode editar antes de enviar.

export type TipoMensagem = "confirmacao" | "lembrete" | "materiais";

export const NOME_MENSAGEM: Record<TipoMensagem, string> = {
  confirmacao: "Confirmação e link",
  lembrete: "Lembrete da call",
  materiais: "Pedir materiais",
};

export const ASSUNTO: Record<TipoMensagem, string> = {
  confirmacao: "Sua call de diagnóstico com a CRIAMERCADO está confirmada",
  lembrete: "Lembrete: sua call de diagnóstico com a CRIAMERCADO",
  materiais: "O que preparar para a sua call com a CRIAMERCADO",
};

const primeiroNome = (s: string) => s.trim().split(/\s+/)[0] ?? "";

/** "hoje", "amanhã" ou "" conforme o dia da call. */
export function quando(callEm: string, agora = new Date()) {
  const dia = diaLocal(callEm);
  if (dia === diaLocal(agora.toISOString())) return "hoje";
  if (dia === diaLocal(new Date(agora.getTime() + 86_400_000).toISOString())) return "amanhã";
  return "";
}

export function montarMensagem(tipo: TipoMensagem, i: Inscricao, agora = new Date()) {
  const nome = primeiroNome(i.responsavel);
  const data = `${nomeDia(i.call_em)}, às ${hora(i.call_em)}`;
  const link = i.link_call ? `\n\nLink da videochamada: ${i.link_call}` : "";

  if (tipo === "confirmacao") {
    return [
      `Olá, ${nome}! Aqui é da CRIAMERCADO.`,
      `\n\nSua call de diagnóstico está confirmada para ${data}.${link}`,
      i.cupom ? `\n\nSeu cupom: ${i.cupom} (10% de desconto no PLENO 180).` : "",
      "\n\nTraga para a call quem decide com você: sócio, gerente, quem cuida do caixa.",
    ].join("");
  }

  if (tipo === "lembrete") {
    const q = quando(i.call_em, agora);
    return [
      `Olá, ${nome}! Passando para lembrar da nossa call de diagnóstico ${q ? `${q}, ` : ""}${data}.${link}`,
      "\n\nSe ainda não mandou, lembre de enviar o faturamento por setor, a lista de setores e o vídeo da loja.",
      "\n\nQualquer imprevisto, é só responder aqui que a gente remarca.",
    ].join("");
  }

  // materiais: só pede o que ainda não chegou.
  const itens: string[] = [];
  if (!i.recebeu_faturamento) {
    itens.push(
      "*Faturamento detalhado* dos últimos 12 meses, separado por setor (mercearia, açougue, hortifrúti, padaria, frios e laticínios, bebidas, limpeza e higiene...).",
    );
  }
  if (!i.recebeu_setores) {
    itens.push("*Setores do supermercado*: a lista dos setores que vocês têm hoje e, se souber, o tamanho aproximado de cada um.");
  }
  if (!i.recebeu_video) {
    itens.push(
      "*Vídeo de todo o supermercado*: comece pela fachada e a entrada e passe devagar por todos os corredores, checkouts, açougue, padaria, depósito e área externa. Filme com o celular na horizontal.",
    );
  }
  if (!itens.length) return `Olá, ${nome}! Recebemos todo o material, obrigado. Nos vemos na call de ${data}.`;
  return [
    `Olá, ${nome}! Para a nossa call de ${data} render de verdade, pedimos que você prepare e nos envie antes, por aqui mesmo:`,
    "\n\n" + itens.map((t, n) => `${n + 1}. ${t}`).join("\n\n"),
    "\n\nSe tiver a planta baixa da loja, mande também. Obrigado!",
  ].join("");
}

/** Link que abre o WhatsApp (app ou web) com a mensagem pronta para o número do cliente. */
export function linkWhatsApp(numero: string, texto: string) {
  const d = numero.replace(/\D/g, "");
  const comPais = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}

/** No e-mail o negrito do WhatsApp (*texto*) não faz sentido. */
export const textoParaEmail = (texto: string) => texto.replace(/\*([^*\n]+)\*/g, "$1");

export function linkEmail(email: string, assunto: string, texto: string) {
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(textoParaEmail(texto))}`;
}
