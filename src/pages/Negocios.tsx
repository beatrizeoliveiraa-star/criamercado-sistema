import { useMemo, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { Plus, Search } from "lucide-react";
import { dados } from "@/lib/dados";
import {
  NOME_ETAPA,
  NOME_PLANO,
  NOME_STATUS_COMERCIAL,
  ORDEM_ETAPAS,
  dataCurta,
  eLead,
  hoje,
  lugar,
  reais,
  temPapel,
  type ProjetoResumo,
  type Tarefa,
} from "@/lib/dominio";
import { useSessao } from "@/lib/sessao";
import { useCarregar } from "@/lib/useCarregar";
import { Selo } from "@/components/Selo";
import { Carregando, Erro, Titulo } from "@/components/Layout";

type Aba = "todos" | "leads" | "fechados" | "nao_fechados";
const ABAS: [Aba, string][] = [["todos", "Todos"], ["leads", "Leads"], ["fechados", "Fechados"], ["nao_fechados", "Não fechados"]];

const naAba = (p: ProjetoResumo, a: Aba) =>
  a === "todos" ||
  (a === "leads" && eLead(p.status_comercial)) ||
  (a === "fechados" && p.status_comercial === "fechado") ||
  (a === "nao_fechados" && p.status_comercial === "nao_concluida");

export interface ContextoNegocios {
  recarregarLista: () => void;
}

/** Lista de negócios. O card de um negócio abre por cima dela (rota /negocios/:id). */
export function Negocios() {
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const lista = useCarregar(() => Promise.all([dados.projetos(), dados.tarefas()]));
  const [aba, setAba] = useState<Aba>("todos");
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState("");
  const [plano, setPlano] = useState("");

  const proxima = useMemo(() => {
    const m = new Map<string, Tarefa>();
    for (const t of lista.dado?.[1] ?? []) if (t.projeto_id && !m.has(t.projeto_id)) m.set(t.projeto_id, t);
    return m;
  }, [lista.dado]);

  const contexto: ContextoNegocios = { recarregarLista: lista.recarregar };
  const projetos = lista.dado?.[0];
  const q = busca.trim().toLowerCase();
  const filtrados = projetos?.filter(
    (p) =>
      naAba(p, aba) &&
      (!q || `${p.cliente.nome} ${p.cliente.cidade ?? ""}`.toLowerCase().includes(q)) &&
      (!etapa || (p.etapa_atual ?? "lead") === etapa) &&
      (!plano || p.plano === plano),
  );
  const abrir = (id: string) => navegar(`/negocios/${id}`);

  return (
    <>
      <Titulo direita={temPapel(usuario, "comercial") ? <Link to="/novo" className="botao hidden md:inline-flex"><Plus size={16} /> Novo negócio</Link> : null}>
        Negócios
      </Titulo>

      <div className="flex gap-2 flex-wrap mb-4" role="tablist">
        {ABAS.map(([k, nome]) => (
          <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={`aba ${aba === k ? "aba-ativa" : ""}`}>
            <span className="font-titulo font-medium">{nome}</span>
            <span className="text-xs opacity-70 tabular-nums">{projetos?.filter((p) => naAba(p, k)).length ?? ""}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <label className="relative flex-1 min-w-52">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 texto-2" />
          <input className="campo pl-9" type="search" placeholder="Buscar supermercado ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <select className="campo w-auto" value={etapa} onChange={(e) => setEtapa(e.target.value)} aria-label="Etapa">
          <option value="">Todas as etapas</option>
          <option value="lead">Lead</option>
          {ORDEM_ETAPAS.map((t) => <option key={t} value={t}>{NOME_ETAPA[t]}</option>)}
        </select>
        <select className="campo w-auto" value={plano} onChange={(e) => setPlano(e.target.value)} aria-label="Plano">
          <option value="">Todos os planos</option>
          {Object.entries(NOME_PLANO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
      </div>

      {lista.erro ? <Erro msg={lista.erro} /> : !filtrados ? <Carregando /> : (
        <>
          {/* computador: tabela */}
          <div className="cartao overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left texto-2 text-[11px] uppercase tracking-wider font-titulo">
                  <th className="px-4 py-3 font-medium">Supermercado</th>
                  <th className="px-3 font-medium">Status</th>
                  <th className="px-3 font-medium">Etapa</th>
                  <th className="px-3 font-medium">Plano</th>
                  <th className="px-3 font-medium text-right">Valor</th>
                  <th className="px-4 font-medium">Próxima tarefa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--borda)] border-t borda">
                {filtrados.map((p) => (
                  <tr key={p.id} tabIndex={0} onClick={() => abrir(p.id)} onKeyDown={(e) => e.key === "Enter" && abrir(p.id)}
                    className="cursor-pointer hover:bg-marca/5 focus-visible:outline-2 focus-visible:outline-marca">
                    <td className="px-4 py-3"><p className="font-semibold">{p.cliente.nome}</p><p className="text-xs texto-2">{lugar(p.cliente)}</p></td>
                    <td className="px-3"><Selo status={p.status_comercial} texto={NOME_STATUS_COMERCIAL[p.status_comercial]} /></td>
                    <td className="px-3"><EtapaMini p={p} /></td>
                    <td className="px-3 whitespace-nowrap">{p.plano ? NOME_PLANO[p.plano] : <span className="texto-2">A definir</span>}</td>
                    <td className="px-3 text-right tabular-nums whitespace-nowrap">{reais(p.valor_proposta_centavos)}</td>
                    <td className="px-4 py-3"><ProximaTarefa t={proxima.get(p.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtrados.length ? <p className="p-6 text-center text-sm texto-2">Nenhum negócio com esses filtros.</p> : null}
          </div>

          {/* celular: lista */}
          <div className="md:hidden cartao divide-y divide-[var(--borda)]">
            {filtrados.map((p) => (
              <button key={p.id} onClick={() => abrir(p.id)} className="w-full text-left p-3 flex flex-col gap-1.5">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="font-semibold block">{p.cliente.nome}</span>
                    <span className="text-xs texto-2">{lugar(p.cliente)}{p.plano ? ` · ${NOME_PLANO[p.plano]}` : ""}</span>
                  </span>
                  <Selo status={p.status_comercial} texto={NOME_STATUS_COMERCIAL[p.status_comercial]} />
                </span>
                <span className="flex items-end justify-between gap-2">
                  <EtapaMini p={p} />
                  <span className="text-sm font-semibold tabular-nums">{reais(p.valor_proposta_centavos)}</span>
                </span>
                {proxima.get(p.id) ? <ProximaTarefa t={proxima.get(p.id)} /> : null}
              </button>
            ))}
            {!filtrados.length ? <p className="p-6 text-center text-sm texto-2">Nenhum negócio com esses filtros.</p> : null}
          </div>
        </>
      )}

      <Outlet context={contexto} />
    </>
  );
}

function EtapaMini({ p }: { p: ProjetoResumo }) {
  const i = p.etapa_atual ? ORDEM_ETAPAS.indexOf(p.etapa_atual) : -1;
  return (
    <span className="block">
      <span className="text-sm">{p.etapa_atual ? NOME_ETAPA[p.etapa_atual] : "Lead"}</span>
      <span className="flex gap-0.5 mt-1 w-32" aria-hidden>
        {[-1, ...ORDEM_ETAPAS.map((_, k) => k)].map((k) => (
          <i key={k} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-marca" : "bg-[var(--borda)]"}`} />
        ))}
      </span>
    </span>
  );
}

function ProximaTarefa({ t }: { t?: Tarefa }) {
  if (!t) return <span className="text-xs texto-2">Nenhuma</span>;
  const atrasada = t.prazo != null && t.prazo < hoje();
  return (
    <span className="block text-sm">
      {t.titulo}
      <span className={`block text-xs ${atrasada ? "text-red-600 dark:text-red-400" : "texto-2"}`}>
        {[atrasada ? "Atrasada" : null, dataCurta(t.prazo), t.pessoas.join(", ")].filter(Boolean).join(" · ")}
      </span>
    </span>
  );
}
