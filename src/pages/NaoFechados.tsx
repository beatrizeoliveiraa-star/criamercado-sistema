import { Link } from "react-router";
import { dados } from "@/lib/dados";
import { NOME_STATUS_COMERCIAL, dataCurta, lugar, reais } from "@/lib/dominio";
import { useCarregar } from "@/lib/useCarregar";
import { Selo } from "@/components/Selo";
import { Carregando, Erro, Titulo } from "@/components/Layout";

export function NaoFechados() {
  const { dado, erro } = useCarregar(() => dados.projetos());
  const lista = dado?.filter((p) => p.status_comercial === "follow_up" || p.status_comercial === "nao_concluida");
  return (
    <>
      <Titulo>Não fechados</Titulo>
      {erro ? <Erro msg={erro} /> : !lista ? <Carregando /> : (
        <div className="cartao divide-y divide-[var(--borda)]">
          {lista.map((p) => (
            <Link key={p.id} to={`/projetos/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-black/[.02] dark:hover:bg-white/[.03]">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.cliente.nome}</p>
                <p className="text-xs texto-2">{lugar(p.cliente)}{p.data_apresentacao ? ` · apresentado em ${dataCurta(p.data_apresentacao)}` : ""}</p>
              </div>
              <span className="text-sm hidden sm:block">{reais(p.valor_proposta_centavos)}</span>
              <Selo status={p.status_comercial} texto={NOME_STATUS_COMERCIAL[p.status_comercial]} />
            </Link>
          ))}
          {!lista.length ? <p className="p-4 text-sm texto-2">Nenhum lead em follow up ou não concluído.</p> : null}
        </div>
      )}
    </>
  );
}
