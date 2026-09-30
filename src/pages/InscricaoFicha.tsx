import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Mail, MessageCircle, Send } from "lucide-react";
import { dados } from "@/lib/dados";
import { NOME_INSCRICAO_STATUS, temPapel, type Inscricao, type InscricaoStatus } from "@/lib/dominio";
import { ASSUNTO, NOME_MENSAGEM, linkEmail, linkWhatsApp, montarMensagem, textoParaEmail, type TipoMensagem } from "@/lib/mensagens";
import { diaLocal, hora, mascaraCelular, mascaraCnpj, nomeDia } from "@/lib/superminas";
import { useSessao } from "@/lib/sessao";
import { useCarregar } from "@/lib/useCarregar";
import { Carregando, Erro } from "@/components/Layout";

const MATERIAIS: [keyof Inscricao & `recebeu_${string}`, string][] = [
  ["recebeu_faturamento", "Faturamento por setor"],
  ["recebeu_setores", "Lista de setores"],
  ["recebeu_video", "Vídeo do supermercado"],
];

/** "2026-11-24T11:00" (horário de Brasília) para o campo de data e hora. */
const paraCampo = (iso: string) => `${diaLocal(iso)}T${hora(iso)}`;
const doCampo = (v: string) => new Date(`${v}:00-03:00`).toISOString();

export function InscricaoFicha() {
  const { id = "" } = useParams();
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const { dado, erro, recarregar } = useCarregar(() => dados.inscricao(id), [id]);
  const [falha, setFalha] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoMensagem>("lembrete");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const i = dado?.inscricao;
  // Remonta o texto ao trocar o tipo ou quando os materiais mudam.
  useEffect(() => {
    if (i) setTexto(montarMensagem(tipo, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, i?.id, i?.recebeu_faturamento, i?.recebeu_setores, i?.recebeu_video, i?.link_call, i?.call_em]);

  if (!temPapel(usuario, "comercial")) return <Erro msg="Só o comercial vê as calls da Superminas." />;
  if (erro) return <Erro msg={erro} />;
  if (!dado || !i) return <Carregando />;

  const salvar = async (fn: () => Promise<void>, ok?: string) => {
    setFalha(null);
    setAviso(null);
    try {
      await fn();
      if (ok) setAviso(ok);
    } catch (e) {
      setFalha(e instanceof Error ? e.message : String(e));
    }
    recarregar();
  };
  const mudar = (campos: Partial<Inscricao>) => salvar(() => dados.atualizarInscricao(i.id, campos));

  const whatsapp = () => {
    window.open(linkWhatsApp(i.whatsapp, texto), "_blank", "noopener");
    void salvar(() => dados.registrarEnvio(i.id, "whatsapp", tipo, texto));
  };
  const emailPeloSistema = async () => {
    setEnviando(true);
    await salvar(() => dados.enviarEmail(i.id, tipo, ASSUNTO[tipo], textoParaEmail(texto)), `E-mail enviado para ${i.email}.`);
    setEnviando(false);
  };
  const emailPeloComputador = () => {
    window.location.href = linkEmail(i.email, ASSUNTO[tipo], texto);
    void salvar(() => dados.registrarEnvio(i.id, "email", tipo, textoParaEmail(texto)));
  };

  const virarLead = () =>
    salvar(async () => {
      const projetoId = await dados.criarProjeto({
        cliente: {
          nome: i.empresa.toUpperCase(), cidade: i.cidade, uf: i.uf, telefone: mascaraCelular(i.whatsapp), email: i.email,
          cnpj: mascaraCnpj(i.cnpj), contato_nome: i.responsavel,
        },
        projeto: { plano: "pleno_180", valor_proposta_centavos: null, data_apresentacao: null },
      });
      await dados.atualizarInscricao(i.id, { status: "virou_lead", projeto_id: projetoId });
      navegar(`/projetos/${projetoId}`);
    });

  return (
    <div className="max-w-5xl">
      <Link to="/inscricoes" className="text-sm texto-2 inline-flex items-center gap-1 mb-3 hover:underline"><ArrowLeft size={14} /> Superminas</Link>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl">{i.empresa}</h1>
          <p className="texto-2 text-sm">{[i.cidade && `${i.cidade}/${i.uf}`, `call ${nomeDia(i.call_em)} às ${hora(i.call_em)}`].filter(Boolean).join(" · ")}</p>
        </div>
        <select className="campo w-auto font-medium" value={i.status} onChange={(e) => mudar({ status: e.target.value as InscricaoStatus })} aria-label="Status da call">
          {Object.entries(NOME_INSCRICAO_STATUS).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
      </div>
      {falha ? <div className="mb-4"><Erro msg={falha} /></div> : null}
      {aviso ? <p className="mb-4 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-3 text-sm">{aviso}</p> : null}

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="flex flex-col gap-5">
          <section className="cartao p-4 flex flex-col gap-3">
            <h2 className="font-semibold text-sm">Mandar mensagem</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(NOME_MENSAGEM) as TipoMensagem[]).map((t) => (
                <button key={t} onClick={() => setTipo(t)} className={`rounded-full px-3 py-1.5 text-sm border borda ${tipo === t ? "bg-marca text-white border-transparent" : ""}`}>
                  {NOME_MENSAGEM[t]}
                </button>
              ))}
            </div>
            <textarea className="campo min-h-64 leading-relaxed" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto da mensagem" />
            <p className="text-xs texto-2">Pode editar antes de mandar. No WhatsApp, *texto* sai em negrito.</p>
            <div className="flex flex-wrap gap-2">
              <button className="botao" onClick={whatsapp}><MessageCircle size={16} /> Enviar no WhatsApp</button>
              <button className="botao-2" onClick={emailPeloSistema} disabled={enviando}><Send size={16} /> {enviando ? "Enviando..." : "Enviar e-mail"}</button>
              <button className="botao-2" onClick={emailPeloComputador}><Mail size={16} /> Abrir no meu e-mail</button>
            </div>
          </section>

          <section className="cartao">
            <h2 className="font-semibold text-sm px-4 pt-4 pb-2">Mensagens enviadas</h2>
            {dado.envios.length ? (
              <ul className="divide-y divide-[var(--borda)] text-sm">
                {dado.envios.map((e) => (
                  <li key={e.id} className="px-4 py-2.5">
                    <p>
                      <span className="font-medium">{e.canal === "whatsapp" ? "WhatsApp" : "E-mail"} · {NOME_MENSAGEM[e.tipo as TipoMensagem] ?? e.tipo}</span>
                      <span className="texto-2 text-xs"> · {new Date(e.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}{e.usuario ? ` · ${e.usuario}` : ""}</span>
                    </p>
                    <p className="texto-2 text-xs line-clamp-2 whitespace-pre-line">{e.texto}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="px-4 pb-4 text-sm texto-2">Nenhuma mensagem enviada ainda.</p>}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="cartao p-4 flex flex-col gap-3 text-sm">
            <h2 className="font-semibold">Materiais recebidos</h2>
            {MATERIAIS.map(([campo, nome]) => (
              <label key={campo} className="flex items-center gap-2">
                <input type="checkbox" className="size-4 accent-[var(--color-marca)]" checked={i[campo]} onChange={(e) => mudar({ [campo]: e.target.checked })} />
                {nome}
              </label>
            ))}
          </section>

          <section className="cartao p-4 flex flex-col gap-3 text-sm">
            <h2 className="font-semibold">Call</h2>
            <label className="flex flex-col gap-1"><span className="text-xs texto-2">Dia e hora (Brasília)</span>
              <input type="datetime-local" className="campo" defaultValue={paraCampo(i.call_em)} key={i.call_em}
                onBlur={(e) => e.target.value && doCampo(e.target.value) !== i.call_em && mudar({ call_em: doCampo(e.target.value) })} />
            </label>
            <label className="flex flex-col gap-1"><span className="text-xs texto-2">Link da videochamada</span>
              <input className="campo" placeholder="https://meet.google.com/..." defaultValue={i.link_call ?? ""} key={i.link_call}
                onBlur={(e) => e.target.value.trim() !== (i.link_call ?? "") && mudar({ link_call: e.target.value.trim() || null })} />
            </label>
            <Info rotulo="Cupom" valor={i.cupom ?? "Sem cupom (fora do prazo)"} />
          </section>

          <section className="cartao p-4 flex flex-col gap-2 text-sm">
            <h2 className="font-semibold">Contato</h2>
            <Info rotulo="Responsável" valor={i.responsavel} />
            <Info rotulo="WhatsApp" valor={<a className="text-marca hover:underline" href={linkWhatsApp(i.whatsapp, "")} target="_blank" rel="noopener">{mascaraCelular(i.whatsapp)}</a>} />
            <Info rotulo="E-mail" valor={<a className="text-marca hover:underline break-all" href={`mailto:${i.email}`}>{i.email}</a>} />
            <Info rotulo="CNPJ" valor={mascaraCnpj(i.cnpj)} />
            <Info rotulo="Inscrição" valor={`${new Date(i.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}${i.origem ? ` · ${i.origem}` : ""}`} />
          </section>

          <section className="cartao p-4 flex flex-col gap-2 text-sm">
            <h2 className="font-semibold">Observações</h2>
            <textarea className="campo min-h-24" defaultValue={i.observacoes ?? ""} key={i.observacoes}
              onBlur={(e) => e.target.value.trim() !== (i.observacoes ?? "") && mudar({ observacoes: e.target.value.trim() || null })} />
          </section>

          {i.projeto_id ? (
            <Link to={`/projetos/${i.projeto_id}`} className="botao-2 justify-center">Abrir o lead</Link>
          ) : (
            <button className="botao justify-center" onClick={virarLead}>Transformar em lead</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="texto-2">{rotulo}</span>
      <span className="text-right">{valor}</span>
    </p>
  );
}
