import { useState } from "react";
import { Link } from "react-router";
import { dados } from "@/lib/dados";
import { hoje, type Tarefa } from "@/lib/dominio";
import { useSessao } from "@/lib/sessao";
import { useCarregar } from "@/lib/useCarregar";
import { Carregando, Erro, Titulo } from "@/components/Layout";
import { ItemTarefa } from "./Negocio";

/** Todas as tarefas em aberto, de todos os negócios, separadas pelo prazo. */
export function Tarefas() {
  const { usuario } = useSessao();
  const { dado, erro, recarregar } = useCarregar(() => Promise.all([dados.tarefas(), dados.equipe()]));
  const [minhas, setMinhas] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const concluir = async (t: Tarefa) => {
    setFalha(null);
    await dados.concluirTarefa(t.id, true).catch((e) => setFalha(e.message));
    recarregar();
  };

  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;
  const [todas, equipe] = dado;
  const eu = usuario?.nome ?? "";
  const lista = minhas ? todas.filter((t) => t.pessoas.includes(eu)) : todas;
  const h = hoje();
  const grupos: [string, Tarefa[]][] = [
    ["Atrasadas", lista.filter((t) => t.prazo && t.prazo < h)],
    ["Hoje", lista.filter((t) => t.prazo === h)],
    ["Próximos dias", lista.filter((t) => t.prazo && t.prazo > h)],
    ["Sem prazo", lista.filter((t) => !t.prazo)],
  ];

  return (
    <>
      <Titulo>Tarefas</Titulo>
      <NovaTarefa equipe={equipe} eu={eu} criada={recarregar} />
      <div className="flex gap-2 mb-4">
        <button className={`aba ${!minhas ? "aba-ativa" : ""}`} onClick={() => setMinhas(false)}>Da equipe <span className="text-xs opacity-70">{todas.length}</span></button>
        <button className={`aba ${minhas ? "aba-ativa" : ""}`} onClick={() => setMinhas(true)}>Minhas <span className="text-xs opacity-70">{todas.filter((t) => t.pessoas.includes(eu)).length}</span></button>
      </div>
      {falha ? <div className="mb-3"><Erro msg={falha} /></div> : null}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        {grupos.map(([nome, itens]) => itens.length ? (
          <section key={nome} className="cartao p-4">
            <h2 className={`text-xs uppercase tracking-wider mb-3 ${nome === "Atrasadas" ? "text-red-600 dark:text-red-400" : "texto-2"}`}>{nome} · {itens.length}</h2>
            <ul className="flex flex-col gap-3">
              {itens.map((t) => (
                <ItemTarefa key={t.id} t={t} concluir={() => concluir(t)}
                  extra={t.negocio ? <Link to={`/negocios/${t.negocio.id}`} className="text-xs text-marca hover:underline">{t.negocio.nome}</Link> : null} />
              ))}
            </ul>
          </section>
        ) : null)}
      </div>
      {!lista.length ? <p className="text-sm texto-2">Nenhuma tarefa em aberto.</p> : null}
    </>
  );
}

function NovaTarefa({ equipe, eu, criada }: { equipe: string[]; eu: string; criada: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState(hoje());
  const [pessoa, setPessoa] = useState(eu);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    await dados.criarTarefa({ titulo: titulo.trim(), prazo: prazo || null, pessoas: pessoa ? [pessoa] : [], projeto_id: null });
    setTitulo("");
    criada();
  };
  return (
    <form onSubmit={enviar} className="cartao p-3 mb-4 flex flex-wrap gap-2 items-center">
      <input id="nova-tarefa" className="campo flex-1 min-w-52" placeholder="Nova tarefa sem negócio (ex.: pedir orçamento de tinta)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <input id="nova-tarefa-prazo" type="date" className="campo w-auto" value={prazo} onChange={(e) => setPrazo(e.target.value)} aria-label="Prazo" />
      <select id="nova-tarefa-pessoa" className="campo w-auto" value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="Responsável">
        <option value="">Ninguém</option>
        {[...new Set([eu, ...equipe])].filter(Boolean).map((n) => <option key={n}>{n}</option>)}
      </select>
      <button className="botao" disabled={!titulo.trim()}>Adicionar</button>
    </form>
  );
}
