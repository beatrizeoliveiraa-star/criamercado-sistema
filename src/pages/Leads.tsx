import { Link } from "react-router";
import { dados } from "@/lib/dados";
import {
  NOME_ETAPA_STATUS,
  NOME_PLANO,
  NOME_STATUS_COMERCIAL,
  dataCurta,
  lugar,
  reais,
  temPapel,
  type ProjetoResumo,
  type StatusComercial,
} from "@/lib/dominio";
import { useSessao } from "@/lib/sessao";
import { useCarregar } from "@/lib/useCarregar";
import { Selo } from "@/components/Selo";
import { Carregando, Erro, Titulo } from "@/components/Layout";

const COLUNAS: StatusComercial[] = ["nao_iniciada", "em_andamento", "follow_up", "fechado"];

export function Leads() {
  const { usuario } = useSessao();
  const { dado, erro, recarregar } = useCarregar(() => dados.projetos());
  const podeMover = temPapel(usuario, "comercial");

  const mover = async (p: ProjetoResumo, status: StatusComercial) => {
    await dados.atualizarProjeto(p.id, { status_comercial: status }).catch((e) => alert(e.message));
    recarregar();
  };

  return (
    <>
      <Titulo direita={<Link to="/novo" className="botao hidden md:inline-flex">Novo lead</Link>}>Leads</Titulo>
      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x scroll-px-4 md:scroll-px-0">
          {COLUNAS.map((col) => {
            const itens = dado.filter((p) => p.status_comercial === col && (col !== "fechado" || recente(p)));
            return (
              <section key={col} className="w-[80vw] max-w-72 md:w-72 shrink-0 snap-start">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  {NOME_STATUS_COMERCIAL[col]} <span className="texto-2 font-normal">{itens.length}</span>
                </h2>
                {col === "fechado" ? <p className="text-xs texto-2 mb-2">Fechados nos últimos 30 dias</p> : null}
                <div className="flex flex-col gap-2">
                  {itens.map((p) => <CartaoLead key={p.id} p={p} podeMover={podeMover} mover={mover} />)}
                  {!itens.length ? <p className="text-xs texto-2 py-4 text-center border border-dashed borda rounded-lg">Nenhum</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function recente(p: ProjetoResumo) {
  if (!p.data_fechamento) return false;
  return Date.now() - Date.parse(p.data_fechamento) < 30 * 864e5;
}

function CartaoLead({ p, podeMover, mover }: { p: ProjetoResumo; podeMover: boolean; mover: (p: ProjetoResumo, s: StatusComercial) => void }) {
  const st = (t: string) => p.etapas.find((e) => e.tipo === t)?.status ?? "nao_iniciada";
  return (
    <div className="cartao p-3 flex flex-col gap-2">
      <Link to={`/projetos/${p.id}`} className="font-semibold text-sm leading-snug hover:underline">
        {p.cliente.nome}
        <span className="block text-xs texto-2 font-normal">{lugar(p.cliente)}</span>
      </Link>
      <div className="flex flex-wrap gap-1 text-xs">
        {p.plano ? <span className="rounded-full bg-marca/10 text-marca px-2 py-0.5 font-medium">{NOME_PLANO[p.plano]}</span> : null}
        <Selo status={st("projeto_2d")} texto={`2D: ${NOME_ETAPA_STATUS[st("projeto_2d")]}`} />
        <Selo status={st("projeto_3d")} texto={`3D: ${NOME_ETAPA_STATUS[st("projeto_3d")]}`} />
      </div>
      <div className="flex justify-between text-xs texto-2">
        <span>{p.data_apresentacao ? `Apresentação ${dataCurta(p.data_apresentacao)}` : "Sem apresentação"}</span>
        <span className="font-medium" style={{ color: "var(--texto)" }}>{reais(p.valor_proposta_centavos)}</span>
      </div>
      {podeMover ? (
        <select
          className="campo text-xs py-1"
          value={p.status_comercial}
          onChange={(e) => mover(p, e.target.value as StatusComercial)}
          aria-label="Mudar status"
        >
          {Object.entries(NOME_STATUS_COMERCIAL).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
      ) : null}
    </div>
  );
}
