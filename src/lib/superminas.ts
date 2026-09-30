// Regras da página da Superminas usadas pelo site do cliente e pelo admin.

const FUSO = "America/Sao_Paulo";

export const soDigitos = (s: string) => s.replace(/\D/g, "");

export function mascaraCnpj(s: string) {
  const d = soDigitos(s).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Mesmo cálculo de private.cnpj_valido no banco. */
export function cnpjValido(s: string) {
  const c = soDigitos(s);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const digito = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((t, p, i) => t + Number(c[i]) * p, 0);
    return soma % 11 < 2 ? 0 : 11 - (soma % 11);
  };
  return digito(12) === Number(c[12]) && digito(13) === Number(c[13]);
}

export function mascaraCelular(s: string) {
  const d = soDigitos(s).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const celularValido = (s: string) => /^\d{10,11}$/.test(soDigitos(s));
export const emailValido = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

/** "2026-11-24" no fuso de Brasília. */
export function diaLocal(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** "terça-feira, 24 de novembro" */
export function nomeDia(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "2-digit", month: "long" }).format(new Date(iso));
}

/** "11:00" */
export function hora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** "24/11 · 11:00" */
export function dataCurta(iso: string) {
  const d = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" }).format(new Date(iso));
  return `${d} · ${hora(iso)}`;
}

/** Agrupa os horários livres por dia, mantendo a ordem. */
export function agruparPorDia(horarios: string[]) {
  const dias = new Map<string, string[]>();
  for (const h of [...horarios].sort()) {
    const d = diaLocal(h);
    if (!dias.has(d)) dias.set(d, []);
    dias.get(d)!.push(h);
  }
  return dias;
}

const DURACAO_MIN = 60;
const TITULO_CALL = "Call de diagnóstico · CRIAMERCADO";
const DESCRICAO_CALL =
  "O link da videochamada será enviado no seu WhatsApp e e-mail. Traga quem decide com você: sócio, gerente, quem cuida do caixa. Dúvidas: (32) 98406-9195.";

const utcCompacto = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function linkGoogleAgenda(inicioIso: string) {
  const ini = new Date(inicioIso);
  const fim = new Date(ini.getTime() + DURACAO_MIN * 60_000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: TITULO_CALL,
    dates: `${utcCompacto(ini)}/${utcCompacto(fim)}`,
    details: DESCRICAO_CALL,
    ctz: FUSO,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function arquivoIcs(inicioIso: string, uid: string) {
  const ini = new Date(inicioIso);
  const fim = new Date(ini.getTime() + DURACAO_MIN * 60_000);
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CRIAMERCADO//Superminas//PT",
    "BEGIN:VEVENT",
    `UID:${uid}@criamercado.com.br`,
    `DTSTAMP:${utcCompacto(new Date())}`,
    `DTSTART:${utcCompacto(ini)}`,
    `DTEND:${utcCompacto(fim)}`,
    `SUMMARY:${esc(TITULO_CALL)}`,
    `DESCRIPTION:${esc(DESCRICAO_CALL)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(TITULO_CALL)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
