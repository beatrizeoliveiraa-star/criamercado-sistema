import { useState } from "react";
import { Link } from "react-router";
import { dados } from "@/lib/dados";
import {
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
import { Carregando, Erro, Titulo } from "@/components/Layout";

// Todo negócio ainda não fechado é um lead, em uma destas colunas (os mesmos status do Notion).
const COLUNAS: StatusComercial[] = ["nao_iniciada", "em_andamento", "follow_up", "nao_concluida"];

export function Leads() {
  const { usuario } = useSessao();
  const { dado, erro, recarregar } = useCarregar(() => dados.projetos());
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<StatusComercial | "fechado" | null>(null);
  const podeMover = temPapel(usuario, "comercial");

  const mover = async (id: string, status: StatusComercial) => {
    setArrastando(null);
    setAlvo(null);
    await dados.atualizarProjeto(id, { status_comercial: status }).catch((e) => alert(e.message));
    recarregar();
  };

  const soltar = (status: StatusComercial) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!arrastando) return;
      e.preventDefault();
      setAlvo(status);
    },
    onDragLeave: () => setAlvo(null),
    onDrop: () => arrastando && mover(arrastando, status),
  });

  return (
    <>
      <Titulo direita={podeMover ? <Link to="/novo" className="botao hidden md:inline-flex">Novo lead</Link> : null}>Leads</Titulo>
      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x scroll-px-4 md:scroll-px-0">
            {COLUNAS.map((col) => {
              const itens = dado.filter((p) => p.status_comercial === col);
              const total = itens.reduce((s, p) => s + (p.valor_proposta_centavos ?? 0), 0);
              return (
                <section
                  key={col}
                  {...soltar(col)}
                  className={`w-[80vw] max-w-72 md:w-72 lg:w-auto lg:max-w-none lg:flex-1 lg:min-w-0 shrink-0 snap-start rounded-xl p-2 -m-2 transition-colors ${alvo === col ? "bg-marca/10" : ""}`}
                >
                  <h2 className="text-sm mb-3 flex items-baseline gap-2">
                    {NOME_STATUS_COMERCIAL[col]} <span className="texto-2">{itens.length}</span>
                    {total ? <span className="texto-2 text-xs ml-auto">{reais(total)}</span> : null}
                  </h2>
                  <div className="flex flex-col gap-2 min-h-16">
                    {itens.map((p) => (
                      <CartaoLead key={p.id} p={p} arrastavel={podeMover} aoArrastar={() => setArrastando(p.id)} aoSoltar={() => setArrastando(null)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          {podeMover ? <p className="text-xs texto-2 mt-2 hidden md:block">Arraste um card para mudar o status. Para fechar um negócio, abra o lead e escolha Fechado.</p> : null}
        </>
      )}
    </>
  );
}

function CartaoLead({ p, arrastavel, aoArrastar, aoSoltar }: { p: ProjetoResumo; arrastavel: boolean; aoArrastar: () => void; aoSoltar: () => void }) {
  return (
    <Link
      to={`/projetos/${p.id}`}
      draggable={arrastavel}
      onDragStart={aoArrastar}
      onDragEnd={aoSoltar}
      className="cartao p-3 flex flex-col gap-1.5 hover:border-marca"
    >
      <span className="font-semibold text-sm leading-snug">{p.cliente.nome}</span>
      <span className="text-xs texto-2">{lugar(p.cliente)}{p.plano ? ` · ${NOME_PLANO[p.plano]}` : ""}</span>
      {p.valor_proposta_centavos || p.data_apresentacao ? (
        <span className="flex justify-between text-xs texto-2">
          <span>{p.data_apresentacao ? `Apresentação ${dataCurta(p.data_apresentacao)}` : ""}</span>
          <span className="font-semibold" style={{ color: "var(--texto)" }}>{reais(p.valor_proposta_centavos)}</span>
        </span>
      ) : null}
    </Link>
  );
}
