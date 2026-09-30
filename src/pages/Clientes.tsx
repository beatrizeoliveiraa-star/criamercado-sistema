import { useState } from "react";
import { dados } from "@/lib/dados";
import { lugar } from "@/lib/dominio";
import { useCarregar } from "@/lib/useCarregar";
import { Carregando, Erro, Titulo } from "@/components/Layout";

export function Clientes() {
  const { dado, erro } = useCarregar(() => dados.clientes());
  const [busca, setBusca] = useState("");
  const lista = dado?.filter((c) => `${c.nome} ${c.cidade ?? ""}`.toLowerCase().includes(busca.toLowerCase()));
  return (
    <>
      <Titulo>Clientes</Titulo>
      <input className="campo mb-4 max-w-sm" placeholder="Buscar por nome ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {erro ? <Erro msg={erro} /> : !lista ? <Carregando /> : (
        <div className="cartao divide-y divide-[var(--borda)]">
          {lista.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.nome}</p>
                <p className="text-xs texto-2">{[lugar(c), c.telefone, c.email].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="text-xs texto-2">{c.projetos} {c.projetos === 1 ? "projeto" : "projetos"}</span>
            </div>
          ))}
          {!lista.length ? <p className="p-4 text-sm texto-2">Nenhum cliente encontrado.</p> : null}
        </div>
      )}
    </>
  );
}
