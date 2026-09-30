import { BrowserRouter, Route, Routes } from "react-router";
import { SessaoProvider, useSessao } from "@/lib/sessao";
import { Carregando, Layout } from "@/components/Layout";
import { Entrar, SemPapel } from "@/pages/Entrar";
import { Negocios } from "@/pages/Negocios";
import { Negocio } from "@/pages/Negocio";
import { Tarefas } from "@/pages/Tarefas";
import { Clientes } from "@/pages/Clientes";
import { Novo } from "@/pages/Novo";

function Rotas() {
  const { pronto, usuario } = useSessao();
  if (!pronto) return <div className="p-8"><Carregando /></div>;
  if (!usuario) return <Entrar />;
  if (!usuario.papeis.length) return <SemPapel />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Negocios />}>
          <Route path="negocios/:id" element={<Negocio />} />
        </Route>
        <Route path="tarefas" element={<Tarefas />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="novo" element={<Novo />} />
        <Route path="*" element={<Negocios />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <SessaoProvider>
      <BrowserRouter>
        <Rotas />
      </BrowserRouter>
    </SessaoProvider>
  );
}
