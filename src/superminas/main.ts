import "./estilo.css";
import {
  agruparPorDia,
  arquivoIcs,
  celularValido,
  cnpjValido,
  emailValido,
  hora,
  linkGoogleAgenda,
  mascaraCelular,
  mascaraCnpj,
  nomeDia,
} from "@/lib/superminas";

// Página pública: fala com o banco só pelas funções horarios_livres e agendar_call.
const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

async function rpc<T>(nome: string, corpo: object = {}): Promise<T> {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: CHAVE!, Authorization: `Bearer ${CHAVE}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(json?.message || "Não foi possível falar com o servidor. Tente de novo.");
  return json as T;
}

/** Sem Supabase configurado a página funciona em demonstração (nada é gravado). */
const demo = !URL_SB || !CHAVE;

async function horariosLivres(): Promise<string[]> {
  if (!demo) return rpc<string[]>("horarios_livres");
  const lista: string[] = [];
  const d = new Date();
  for (let i = 1; lista.length < 7 * 20; i++) {
    const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    if (dia.getDay() === 0 || dia.getDay() === 6) continue;
    for (const h of [9, 10, 11, 14, 15, 16, 17]) {
      const ymd = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
      lista.push(new Date(`${ymd}T${String(h).padStart(2, "0")}:00:00-03:00`).toISOString());
    }
  }
  return lista;
}

async function agendar(dados: Record<string, unknown>): Promise<{ cupom: string | null; call_em: string }> {
  if (demo) {
    await new Promise((r) => setTimeout(r, 400));
    return { cupom: "SUPERMINAS10-DEMO", call_em: dados.call_em as string };
  }
  const [r] = await rpc<{ cupom: string | null; call_em: string }[]>("agendar_call", { d: dados });
  return r;
}

// ---------------------------------------------------------------- elementos
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("form");
const etapas = [...form.querySelectorAll<HTMLFieldSetElement>("fieldset[data-etapa]")];
const barras = [...document.querySelectorAll<HTMLSpanElement>(".progresso span")];
const erro = $<HTMLParagraphElement>("erro");
const voltar = $<HTMLButtonElement>("voltar");
const avancar = $<HTMLButtonElement>("avancar");
const campo = (n: string) => form.elements.namedItem(n) as HTMLInputElement;

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
$<HTMLSelectElement>("uf").innerHTML = UFS.map((u) => `<option${u === "MG" ? " selected" : ""}>${u}</option>`).join("");

campo("cnpj").addEventListener("input", (e) => {
  const i = e.target as HTMLInputElement;
  i.value = mascaraCnpj(i.value);
});
campo("whatsapp").addEventListener("input", (e) => {
  const i = e.target as HTMLInputElement;
  i.value = mascaraCelular(i.value);
});
form.addEventListener("input", (e) => {
  (e.target as HTMLElement).removeAttribute("aria-invalid");
  erro.hidden = true;
});

// ---------------------------------------------------------------- etapas
let atual = 0;
let escolhido: string | null = null;

function mostrar(i: number) {
  atual = i;
  etapas.forEach((f, n) => (f.hidden = n !== i));
  barras.forEach((b, n) => b.classList.toggle("feito", n <= i));
  $("contador").textContent = `${i + 1}/3`;
  voltar.hidden = i === 0;
  avancar.innerHTML = i === 2 ? "Confirmar call <span aria-hidden=\"true\">✓</span>" : "Continuar <span aria-hidden=\"true\">→</span>";
  erro.hidden = true;
  if (i === 2 && !horariosCarregados) void carregarHorarios();
}

function falhar(msg: string, alvo?: HTMLInputElement) {
  erro.textContent = msg;
  erro.hidden = false;
  if (alvo) {
    alvo.setAttribute("aria-invalid", "true");
    alvo.focus();
  }
}

function validar(i: number): boolean {
  if (i === 0) {
    if (!campo("empresa").value.trim()) return falhar("Informe o nome da empresa.", campo("empresa")), false;
    if (!cnpjValido(campo("cnpj").value)) return falhar("CNPJ inválido. Confira os números.", campo("cnpj")), false;
    if (!campo("cidade").value.trim()) return falhar("Informe a cidade.", campo("cidade")), false;
  }
  if (i === 1) {
    if (!campo("responsavel").value.trim()) return falhar("Informe o nome do sócio ou responsável.", campo("responsavel")), false;
    if (!celularValido(campo("whatsapp").value)) return falhar("Celular inválido. Use DDD + número.", campo("whatsapp")), false;
    if (!emailValido(campo("email").value)) return falhar("E-mail inválido.", campo("email")), false;
  }
  if (i === 2) {
    if (!escolhido) return falhar("Escolha o dia e o horário da call."), false;
    if (!campo("consentimento").checked) return falhar("Marque a autorização de contato para agendar.", campo("consentimento")), false;
  }
  return true;
}

voltar.addEventListener("click", () => mostrar(atual - 1));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validar(atual)) return;
  if (atual < 2) {
    mostrar(atual + 1);
    etapas[atual].querySelector<HTMLElement>("input, button")?.focus();
    return;
  }
  if (campo("site").value) return; // robô preencheu o campo invisível

  avancar.disabled = true;
  avancar.textContent = "Agendando...";
  try {
    const origem = new URLSearchParams(location.search).get("origem") ?? "superminas";
    const r = await agendar({
      origem,
      empresa: campo("empresa").value,
      cnpj: campo("cnpj").value,
      cidade: campo("cidade").value,
      uf: campo("uf").value,
      responsavel: campo("responsavel").value,
      whatsapp: campo("whatsapp").value,
      email: campo("email").value,
      call_em: escolhido,
      consentimento: campo("consentimento").checked,
    });
    concluir(r.cupom, r.call_em);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    avancar.disabled = false;
    mostrar(2);
    if (/horário/i.test(msg)) await carregarHorarios();
    falhar(msg);
  }
});

// ---------------------------------------------------------------- horários
let horariosCarregados = false;

function opcao(texto: string, valor: string, marcado: boolean) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "opcao";
  b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", String(marcado));
  b.dataset.valor = valor;
  b.textContent = texto;
  return b;
}

async function carregarHorarios() {
  const dias = $("dias");
  const horas = $("horas");
  escolhido = null;
  $("bloco-horas").hidden = true;
  try {
    const porDia = agruparPorDia(await horariosLivres());
    horariosCarregados = true;
    if (!porDia.size) {
      dias.innerHTML = `<p class="suave">Sem horários livres agora. Chame a gente no WhatsApp (32) 98406-9195.</p>`;
      return;
    }
    dias.replaceChildren(...[...porDia].map(([dia, lista]) => opcao(nomeDia(lista[0]), dia, false)));
    dias.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".opcao");
      if (!b) return;
      dias.querySelectorAll(".opcao").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      escolhido = null;
      horas.replaceChildren(...porDia.get(b.dataset.valor!)!.map((h) => opcao(hora(h), h, false)));
      $("bloco-horas").hidden = false;
      horas.querySelector<HTMLButtonElement>(".opcao")?.focus();
    };
    horas.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".opcao");
      if (!b) return;
      horas.querySelectorAll(".opcao").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      escolhido = b.dataset.valor!;
      erro.hidden = true;
    };
  } catch (err) {
    dias.innerHTML = "";
    falhar(err instanceof Error ? err.message : String(err));
  }
}

// ---------------------------------------------------------------- pronto
function concluir(cupom: string | null, callEm: string) {
  form.hidden = true;
  document.querySelector(".form-topo")!.remove();
  document.querySelector(".progresso")!.remove();
  $("pronto-empresa").textContent = campo("empresa").value.trim();
  $("pronto-quando").textContent = `${nomeDia(callEm)} · ${hora(callEm)}`;
  if (cupom) {
    $("cupom").textContent = cupom;
    $("copiar").onclick = async () => {
      await navigator.clipboard?.writeText(cupom).catch(() => {});
      $("copiar").textContent = "Copiado";
    };
  } else {
    $("bloco-cupom").hidden = true;
    $("regras").hidden = true;
  }
  const ics = new Blob([arquivoIcs(callEm, `${callEm}-${campo("cnpj").value}`)], { type: "text/calendar" });
  $<HTMLAnchorElement>("ics").href = URL.createObjectURL(ics);
  $<HTMLAnchorElement>("google").href = linkGoogleAgenda(callEm);
  const pronto = $("pronto");
  pronto.hidden = false;
  pronto.scrollIntoView({ behavior: "smooth", block: "start" });
  pronto.focus({ preventScroll: true });
}

mostrar(0);
