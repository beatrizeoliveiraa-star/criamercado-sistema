import { Link } from "react-router";
import { dados } from "@/lib/dados";
import {
  NOME_ETAPA,
  NOME_STATUS_COMERCIAL,
  ORDEM_ETAPAS,
  lugar,
  type EtapaTipo,
  type ProjetoResumo,
  type StatusComercial,
} from "@/lib/dominio";
import { useCarregar } from "@/lib/useCarregar";
import { Carregando, Erro, Titulo } from "@/components/Layout";

const PRODUCAO = ORDEM_ETAPAS.slice(ORDEM_ETAPAS.indexOf("reuniao_alinhamento"));

/** Primeira etapa de produção ainda não concluída (onde o projeto está parado). */
export function etapaAtual(p: ProjetoResumo): EtapaTipo | null {
  const status = (t: EtapaTipo) => p.etapas.find((e) => e.tipo === t)?.status;
  if (status("finalizacao") === "concluido") return null;
  return PRODUCAO.find((t) => status(t) !== "concluido") ?? null;
}

export function Painel() {
  const { dado, erro } = useCarregar(() => dados.projetos());
  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;

  const contar = (s: StatusComercial) => dado.filter((p) => p.status_comercial === s).length;
  const emProducao = dado.filter((p) => p.status_comercial === "fechado" && etapaAtual(p) !== null);
  const finalizados = dado.filter((p) => p.status_comercial === "fechado" && etapaAtual(p) === null).length;

  return (
    <>
      <Titulo>Painel</Titulo>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {(["nao_iniciada", "em_andamento", "follow_up", "nao_concluida"] as StatusComercial[]).map((s) => (
          <Numero key={s} rotulo={NOME_STATUS_COMERCIAL[s]} valor={contar(s)} para={s === "follow_up" || s === "nao_concluida" ? "/nao-fechados" : "/leads"} />
        ))}
        <Numero rotulo="Finalizados" valor={finalizados} />
      </div>

      <h2 className="font-semibold mb-3">Em produção <span className="texto-2 font-normal">{emProducao.length}</span></h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {PRODUCAO.map((t) => {
          const aqui = emProducao.filter((p) => etapaAtual(p) === t);
          if (!aqui.length) return null;
          return (
            <section key={t} className="cartao p-4">
              <h3 className="text-sm font-semibold mb-2">{NOME_ETAPA[t]} <span className="texto-2 font-normal">{aqui.length}</span></h3>
              <ul className="text-sm flex flex-col gap-1">
                {aqui.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projetos/${p.id}`} className="hover:underline">{p.cliente.nome}</Link>
                    <span className="texto-2 text-xs"> · {lugar(p.cliente)}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!emProducao.length ? <p className="text-sm texto-2">Nenhum projeto em produção.</p> : null}
      </div>
    </>
  );
}

function Numero({ rotulo, valor, para }: { rotulo: string; valor: number; para?: string }) {
  const corpo = (
    <>
      <p className="text-xs texto-2">{rotulo}</p>
      <p className="text-2xl font-bold mt-1">{valor}</p>
    </>
  );
  return para ? <Link to={para} className="cartao p-4 hover:border-marca">{corpo}</Link> : <div className="cartao p-4">{corpo}</div>;
}
