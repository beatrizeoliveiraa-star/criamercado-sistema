import { Link } from "react-router";
import { dados } from "@/lib/dados";
import { NOME_ETAPA, ORDEM_ETAPAS, lugar, type EtapaTipo, type ProjetoResumo } from "@/lib/dominio";
import { useCarregar } from "@/lib/useCarregar";
import { Carregando, Erro, Titulo } from "@/components/Layout";

const PRODUCAO = ORDEM_ETAPAS.slice(ORDEM_ETAPAS.indexOf("reuniao_alinhamento"));

/** Primeira etapa de produção ainda não concluída (onde o projeto está parado). */
export function etapaAtual(p: ProjetoResumo): EtapaTipo | null {
  const status = (t: EtapaTipo) => p.etapas.find((e) => e.tipo === t)?.status;
  if (status("finalizacao") === "concluido") return null;
  return PRODUCAO.find((t) => status(t) !== "concluido") ?? null;
}

export function Projetos() {
  const { dado, erro } = useCarregar(() => dados.projetos());
  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;

  const fechados = dado.filter((p) => p.status_comercial === "fechado");
  const emProducao = fechados.filter((p) => etapaAtual(p) !== null);
  const finalizados = fechados.filter((p) => etapaAtual(p) === null);

  return (
    <>
      <Titulo>Projetos</Titulo>
      <p className="text-sm texto-2 -mt-3 mb-5">Negócios fechados, agrupados pela etapa em que estão.</p>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {PRODUCAO.map((t) => {
          const aqui = emProducao.filter((p) => etapaAtual(p) === t);
          if (!aqui.length) return null;
          return <Grupo key={t} titulo={NOME_ETAPA[t]} itens={aqui} />;
        })}
        {finalizados.length ? <Grupo titulo="Finalizados" itens={finalizados} /> : null}
        {!fechados.length ? <p className="text-sm texto-2">Nenhum negócio fechado ainda.</p> : null}
      </div>
    </>
  );
}

function Grupo({ titulo, itens }: { titulo: string; itens: ProjetoResumo[] }) {
  return (
    <section className="cartao p-4">
      <h2 className="text-sm mb-2">{titulo} <span className="texto-2">{itens.length}</span></h2>
      <ul className="text-sm flex flex-col gap-1">
        {itens.map((p) => (
          <li key={p.id}>
            <Link to={`/projetos/${p.id}`} className="hover:underline">{p.cliente.nome}</Link>
            <span className="texto-2 text-xs"> · {lugar(p.cliente)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
