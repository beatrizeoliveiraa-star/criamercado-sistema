import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { ArrowRight, Check, MessageSquare, Pencil, Phone, X } from "lucide-react";
import { dados } from "@/lib/dados";
import {
  NOME_ETAPA,
  NOME_ETAPA_STATUS,
  NOME_PEDIDO_STATUS,
  NOME_PLANO,
  NOME_STATUS_COMERCIAL,
  ORDEM_ETAPAS,
  PAPEL_DA_ETAPA,
  STATUS_DA_ETAPA,
  dataCurta,
  hoje,
  lugar,
  reais,
  temPapel,
  type Etapa,
  type EtapaStatus,
  type EtapaTipo,
  type Plano,
  type Projeto,
  type StatusComercial,
  type Tarefa,
} from "@/lib/dominio";
import { linhaDoTempo, type ItemTipo } from "@/lib/tempo";
import { useSessao } from "@/lib/sessao";
import { useCarregar } from "@/lib/useCarregar";
import { Selo } from "@/components/Selo";
import { Carregando, Erro } from "@/components/Layout";
import type { ContextoNegocios } from "./Negocios";

/** Card do negócio, aberto por cima da lista (como no Bitrix). */
export function Negocio() {
  const { id = "" } = useParams();
  const navegar = useNavigate();
  const { recarregarLista } = useOutletContext<ContextoNegocios>();
  const { usuario } = useSessao();
  const { dado, erro, recarregar } = useCarregar(() => Promise.all([dados.projeto(id), dados.equipe()]), [id]);
  const [falha, setFalha] = useState<string | null>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);

  const fechar = () => navegar("/");
  useEffect(() => {
    fecharRef.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && navegar("/");
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
  }, [navegar]);

  const salvar = async (fn: () => Promise<void>) => {
    setFalha(null);
    try {
      await fn();
    } catch (e) {
      setFalha(e instanceof Error ? e.message : String(e));
    }
    recarregar();
    recarregarLista();
  };

  const comercial = temPapel(usuario, "comercial");

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/45" onClick={fechar} />
      <section role="dialog" aria-modal="true" aria-label="Negócio"
        className="gaveta absolute top-0 right-0 bottom-0 w-full max-w-5xl flex flex-col shadow-2xl" style={{ background: "var(--fundo)", paddingTop: "env(safe-area-inset-top)" }}>
        {erro ? <div className="p-6"><Erro msg={erro} /></div> : !dado ? <div className="p-6"><Carregando /></div> : (() => {
          const [d, equipe] = dado;
          const { projeto: p, cliente: c } = d;
          const mudarProjeto = (campos: Partial<Projeto>) => salvar(() => dados.atualizarProjeto(p.id, campos));
          return (
            <>
              <header className="border-b borda px-4 md:px-6 pt-4 pb-3" style={{ background: "var(--cartao)" }}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl text-balance">{c.nome}</h1>
                    <p className="text-sm texto-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {lugar(c)} <Selo status={p.status_comercial} texto={NOME_STATUS_COMERCIAL[p.status_comercial]} />
                    </p>
                  </div>
                  <button ref={fecharRef} onClick={fechar} className="botao-2 ml-auto px-2" aria-label="Fechar"><X size={18} /></button>
                </div>
                <Funil atual={p.etapa_atual} etapas={d.etapas}
                  pode={(t) => (t ? comercial || temPapel(usuario, PAPEL_DA_ETAPA[t]) : comercial)}
                  mover={(t) => salvar(() => dados.moverEtapa(p.id, t))} />
                {falha ? <div className="mt-2"><Erro msg={falha} /></div> : null}
              </header>

              <div className="flex-1 overflow-y-auto grid lg:grid-cols-[340px_1fr] gap-4 p-4 md:p-6 items-start">
                <div className="flex flex-col gap-4 min-w-0">
                  <Bloco titulo="Negócio">
                    <Linha rotulo="Status">
                      {comercial ? (
                        <select className="campo py-1" value={p.status_comercial} onChange={(e) => mudarProjeto({ status_comercial: e.target.value as StatusComercial })}>
                          {Object.entries(NOME_STATUS_COMERCIAL).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                        </select>
                      ) : NOME_STATUS_COMERCIAL[p.status_comercial]}
                    </Linha>
                    <Linha rotulo="Plano">
                      {comercial ? (
                        <select className="campo py-1" value={p.plano ?? ""} onChange={(e) => mudarProjeto({ plano: (e.target.value || null) as Plano | null })}>
                          <option value="">A definir</option>
                          {Object.entries(NOME_PLANO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                        </select>
                      ) : p.plano ? NOME_PLANO[p.plano] : "A definir"}
                    </Linha>
                    <Linha rotulo="Valor">
                      {comercial ? <ValorCampo centavos={p.valor_proposta_centavos} mudar={(v) => mudarProjeto({ valor_proposta_centavos: v })} />
                        : reais(p.valor_proposta_centavos) || "A definir"}
                    </Linha>
                    <DataLinha rotulo="Apresentação" valor={p.data_apresentacao} pode={comercial} mudar={(v) => mudarProjeto({ data_apresentacao: v })} />
                    <DataLinha rotulo="Fechamento" valor={p.data_fechamento} pode={comercial} mudar={(v) => mudarProjeto({ data_fechamento: v })} />
                    <DataLinha rotulo="Entrega" valor={p.data_entrega} pode={comercial} mudar={(v) => mudarProjeto({ data_entrega: v })} />
                  </Bloco>

                  <Bloco titulo="Cliente">
                    <Linha rotulo="Contato">{c.contato_nome || "—"}</Linha>
                    <Linha rotulo="Telefone">{c.telefone || "—"}</Linha>
                    <Linha rotulo="E-mail">{c.email || "—"}</Linha>
                    <Linha rotulo="Razão social">{c.razao_social || "—"}</Linha>
                    <Linha rotulo="CNPJ">{c.cnpj || "—"}</Linha>
                    {d.privado ? <Linha rotulo="CPF">{d.privado.cpf || "—"}</Linha> : null}
                    <Linha rotulo="Endereço">{c.endereco || "—"}</Linha>
                  </Bloco>

                  {d.pedidos.length ? (
                    <Bloco titulo="Pedidos aos fornecedores">
                      {d.pedidos.map((x) => (
                        <Linha key={x.id} rotulo={x.fornecedor}>
                          <span className="flex flex-wrap items-center gap-2">
                            <Selo status={x.status} texto={NOME_PEDIDO_STATUS[x.status]} />
                            {x.codigo ? <span className="text-xs texto-2">cód. {x.codigo}</span> : null}
                            {x.entrega_prevista ? <span className="text-xs texto-2">entrega {dataCurta(x.entrega_prevista)}</span> : null}
                          </span>
                        </Linha>
                      ))}
                    </Bloco>
                  ) : null}

                  <details className="cartao">
                    <summary className="px-4 py-3 cursor-pointer text-xs uppercase tracking-wider texto-2 font-titulo font-medium">Situação de cada etapa</summary>
                    <ul className="divide-y divide-[var(--borda)] border-t borda">
                      {ORDEM_ETAPAS.map((t) => {
                        const e = d.etapas.find((x) => x.tipo === t);
                        if (!e) return null;
                        const pode = temPapel(usuario, PAPEL_DA_ETAPA[t]);
                        return (
                          <li key={t} className="px-4 py-2 flex items-center gap-2 text-sm">
                            <span className="flex-1 min-w-0">{NOME_ETAPA[t]}{e.observacao ? <span className="block text-xs texto-2">{e.observacao}</span> : null}</span>
                            {pode ? (
                              <select className="campo w-auto text-xs py-1" value={e.status} aria-label={`Situação de ${NOME_ETAPA[t]}`}
                                onChange={(ev) => salvar(() => dados.atualizarEtapa(e.id, { status: ev.target.value as EtapaStatus }))}>
                                {STATUS_DA_ETAPA[t].map((s) => <option key={s} value={s}>{NOME_ETAPA_STATUS[s]}</option>)}
                              </select>
                            ) : <Selo status={e.status} texto={NOME_ETAPA_STATUS[e.status]} />}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </div>

                <div className="flex flex-col gap-4 min-w-0">
                  <Escrever projetoId={p.id} equipe={equipe} eu={usuario?.nome ?? ""} salvar={salvar} />
                  <TarefasAbertas tarefas={d.tarefas} concluir={(t) => salvar(() => dados.concluirTarefa(t.id, true))} />
                  <Bloco titulo="Linha do tempo">
                    <LinhaDoTempo itens={linhaDoTempo(d)} />
                  </Bloco>
                </div>
              </div>
            </>
          );
        })()}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- funil de etapas

function Funil({ atual, etapas, pode, mover }: {
  atual: EtapaTipo | null;
  etapas: Etapa[];
  pode: (t: EtapaTipo | null) => boolean;
  mover: (t: EtapaTipo | null) => void;
}) {
  const i = atual ? ORDEM_ETAPAS.indexOf(atual) : -1;
  const lista: (EtapaTipo | null)[] = [null, ...ORDEM_ETAPAS];
  const atualRef = useRef<HTMLButtonElement>(null);
  useEffect(() => atualRef.current?.scrollIntoView({ block: "nearest", inline: "center" }), [atual]);
  return (
    <>
      <div className="flex gap-[3px] mt-3 overflow-x-auto pb-1 -mx-1 px-1">
        {lista.map((t, k) => {
          const pos = k - 1;
          const estado = pos < i ? "seta-feita" : pos === i ? "seta-atual" : "";
          const desistiu = t && etapas.find((e) => e.tipo === t)?.status === "desistencia";
          return (
            <button key={t ?? "lead"} ref={pos === i ? atualRef : undefined} disabled={!pode(t)} onClick={() => mover(t)}
              aria-current={pos === i ? "step" : undefined}
              title={pode(t) ? `Mover para ${t ? NOME_ETAPA[t] : "Lead"}` : "Esta etapa é de outro papel"}
              className={`seta ${estado} ${desistiu ? "line-through" : ""}`}>
              {t ? NOME_ETAPA[t] : "Lead"}
            </button>
          );
        })}
      </div>
      <p className="text-xs texto-2 mt-1.5">Clique numa etapa para mover o negócio. Fica tudo registrado na linha do tempo.</p>
    </>
  );
}

// ---------------------------------------------------------------- registrar comentário, ligação ou tarefa

type Modo = "comentario" | "ligacao" | "tarefa";
const MODOS: { k: Modo; nome: string; rotulo: string; exemplo: string }[] = [
  { k: "comentario", nome: "Comentário", rotulo: "Escreva um comentário", exemplo: "Ex.: cliente pediu para mudar a cor das gôndolas" },
  { k: "ligacao", nome: "Ligação", rotulo: "O que foi conversado na ligação?", exemplo: "Ex.: vai decidir depois da reunião com os sócios" },
  { k: "tarefa", nome: "Tarefa", rotulo: "Qual é a tarefa?", exemplo: "Ex.: enviar o 3D até sexta" },
];

function Escrever({ projetoId, equipe, eu, salvar }: {
  projetoId: string;
  equipe: string[];
  eu: string;
  salvar: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [modo, setModo] = useState<Modo>("comentario");
  const [texto, setTexto] = useState("");
  const [prazo, setPrazo] = useState(hoje());
  const [pessoa, setPessoa] = useState(eu);
  const [enviando, setEnviando] = useState(false);
  const m = MODOS.find((x) => x.k === modo)!;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setEnviando(true);
    await salvar(() =>
      modo === "tarefa"
        ? dados.criarTarefa({ titulo: t, prazo: prazo || null, pessoas: pessoa ? [pessoa] : [], projeto_id: projetoId })
        : dados.registrar(projetoId, modo, t),
    );
    setTexto("");
    setEnviando(false);
  };

  return (
    <form onSubmit={enviar} className="cartao p-4 flex flex-col gap-2.5">
      <div className="flex gap-1.5 flex-wrap" role="tablist">
        {MODOS.map((x) => (
          <button type="button" key={x.k} role="tab" aria-selected={modo === x.k} onClick={() => setModo(x.k)}
            className={`aba py-1 text-xs ${modo === x.k ? "aba-verde" : ""}`}>{x.nome}</button>
        ))}
      </div>
      <label className="text-xs texto-2 flex flex-col gap-1">
        {m.rotulo}
        <textarea id="escrever-texto" className="campo min-h-16 text-sm" placeholder={m.exemplo} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        {modo === "tarefa" ? (
          <>
            <label className="text-xs texto-2 flex flex-col gap-1">Prazo
              <input id="escrever-prazo" type="date" className="campo w-auto py-1.5" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </label>
            <label className="text-xs texto-2 flex flex-col gap-1">Responsável
              <select id="escrever-pessoa" className="campo w-auto py-1.5" value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
                <option value="">Ninguém</option>
                {[...new Set([eu, ...equipe])].filter(Boolean).map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          </>
        ) : null}
        <button className="botao ml-auto" disabled={enviando || !texto.trim()}>Salvar</button>
      </div>
    </form>
  );
}

function TarefasAbertas({ tarefas, concluir }: { tarefas: Tarefa[]; concluir: (t: Tarefa) => void }) {
  const abertas = tarefas.filter((t) => t.status !== "concluido").sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
  if (!abertas.length) return null;
  return (
    <Bloco titulo="Tarefas abertas">
      <ul className="flex flex-col gap-2">
        {abertas.map((t) => <ItemTarefa key={t.id} t={t} concluir={() => concluir(t)} />)}
      </ul>
    </Bloco>
  );
}

export function ItemTarefa({ t, concluir, extra }: { t: Tarefa; concluir: () => void; extra?: React.ReactNode }) {
  const atrasada = t.prazo != null && t.prazo < hoje();
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-1 size-4 accent-[var(--color-marca)]" onChange={concluir} aria-label={`Concluir ${t.titulo}`} />
      <span className="min-w-0">
        {t.titulo}
        <span className={`block text-xs ${atrasada ? "text-red-600 dark:text-red-400" : "texto-2"}`}>
          {[atrasada ? "Atrasada" : null, t.prazo ? dataCurta(t.prazo) : "Sem prazo", t.pessoas.join(", ")].filter(Boolean).join(" · ")}
        </span>
        {extra}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------- linha do tempo

const ICONE: Record<ItemTipo, { icone: typeof Check; cor: string }> = {
  etapa: { icone: ArrowRight, cor: "bg-marca text-white" },
  comentario: { icone: MessageSquare, cor: "bg-[var(--borda)] texto-2" },
  ligacao: { icone: Phone, cor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  tarefa: { icone: Check, cor: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  mudanca: { icone: Pencil, cor: "bg-[var(--borda)] texto-2" },
};

function LinhaDoTempo({ itens }: { itens: ReturnType<typeof linhaDoTempo> }) {
  if (!itens.length) return <p className="text-sm texto-2">Nada registrado ainda. Use o quadro acima para anotar a primeira ligação ou comentário.</p>;
  return (
    <ol className="flex flex-col">
      {itens.map((it, k) => {
        const { icone: Icone, cor } = ICONE[it.tipo];
        return (
          <li key={it.chave} className="grid grid-cols-[28px_1fr] gap-3 relative pb-4 last:pb-0">
            {k < itens.length - 1 ? <span className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-[var(--borda)]" aria-hidden /> : null}
            <span className={`size-7 rounded-full grid place-items-center ${cor}`}><Icone size={14} /></span>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs texto-2"><span className="font-semibold" style={{ color: "var(--texto)" }}>{it.quem}</span> · {quando(it.em)}</p>
              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{it.texto}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function quando(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------- pedaços

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-4">
      <h2 className="text-xs uppercase tracking-wider texto-2 mb-3">{titulo}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-2 items-center text-sm min-h-7">
      <span className="text-xs texto-2">{rotulo}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function DataLinha({ rotulo, valor, pode, mudar }: { rotulo: string; valor: string | null; pode: boolean; mudar: (v: string | null) => void }) {
  return (
    <Linha rotulo={rotulo}>
      {pode ? <input type="date" className="campo py-1" value={valor ?? ""} onChange={(e) => mudar(e.target.value || null)} /> : dataCurta(valor) || "—"}
    </Linha>
  );
}

function ValorCampo({ centavos, mudar }: { centavos: number | null; mudar: (v: number | null) => void }) {
  const [txt, setTxt] = useState(centavos == null ? "" : String(Math.round(centavos / 100)));
  useEffect(() => setTxt(centavos == null ? "" : String(Math.round(centavos / 100))), [centavos]);
  const gravar = () => {
    const n = txt.trim() ? Math.round(Number(txt.replace(/\./g, "").replace(",", ".")) * 100) : null;
    if (n !== centavos && (n == null || Number.isFinite(n))) mudar(n);
  };
  return (
    <span className="relative block">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm texto-2">R$</span>
      <input className="campo py-1 pl-8 tabular-nums" inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={gravar}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} aria-label="Valor da proposta" />
    </span>
  );
}
