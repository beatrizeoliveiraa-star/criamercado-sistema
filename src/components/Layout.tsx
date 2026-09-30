import { NavLink, Outlet } from "react-router";
import { Building2, CircleOff, Columns3, LayoutDashboard, LogOut, Plus } from "lucide-react";
import { dados } from "@/lib/dados";
import { NOME_PAPEL } from "@/lib/dominio";
import { useSessao } from "@/lib/sessao";

const MENU = [
  { para: "/", nome: "Painel", icone: LayoutDashboard },
  { para: "/leads", nome: "Leads", icone: Columns3 },
  { para: "/nao-fechados", nome: "Não fechados", icone: CircleOff },
  { para: "/clientes", nome: "Clientes", icone: Building2 },
];

export function Layout() {
  const { usuario } = useSessao();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r borda p-4 gap-1 sticky top-0 h-dvh">
        <div className="flex items-center gap-2 px-2 pb-5 pt-1">
          <img src="/icone.svg" alt="" className="size-7" />
          <span className="font-bold tracking-tight">CRIAMERCADO</span>
        </div>
        {MENU.map(({ para, nome, icone: Icone }) => (
          <NavLink
            key={para}
            to={para}
            end={para === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${isActive ? "bg-marca/10 text-marca font-semibold" : "texto-2 hover:bg-black/5 dark:hover:bg-white/5"}`
            }
          >
            <Icone size={18} /> {nome}
          </NavLink>
        ))}
        <NavLink to="/novo" className="botao mt-3 justify-center">
          <Plus size={16} /> Novo lead
        </NavLink>
        <div className="mt-auto px-2 text-xs texto-2">
          {dados.modo === "demo" ? (
            <p className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 p-2 mb-2">
              Modo demonstração: dados fictícios, nada é salvo.
            </p>
          ) : null}
          <p className="font-medium" style={{ color: "var(--texto)" }}>{usuario?.nome || usuario?.email}</p>
          <p>{usuario?.papeis.map((p) => NOME_PAPEL[p]).join(", ")}</p>
          {dados.modo === "real" ? (
            <button onClick={() => dados.sair()} className="mt-2 inline-flex items-center gap-1 hover:underline">
              <LogOut size={14} /> Sair
            </button>
          ) : null}
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 pt-4 pb-24 md:p-8">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t borda grid grid-cols-5 text-[11px]" style={{ background: "var(--cartao)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[...MENU.slice(0, 2), { para: "/novo", nome: "Novo", icone: Plus }, ...MENU.slice(2)].map(({ para, nome, icone: Icone }) => (
          <NavLink
            key={para}
            to={para}
            end={para === "/"}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 ${isActive ? "text-marca font-semibold" : "texto-2"}`}
          >
            <Icone size={20} /> {nome}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Titulo({ children, direita }: { children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight">{children}</h1>
      {direita}
    </div>
  );
}

export function Erro({ msg }: { msg: string }) {
  return <p className="rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 p-3 text-sm">{msg}</p>;
}

export function Carregando() {
  return <p className="texto-2 text-sm">Carregando...</p>;
}
