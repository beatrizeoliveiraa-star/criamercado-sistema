import { BrowserRouter, Route, Routes } from "react-router";
import { SessaoProvider, useSessao } from "@/lib/sessao";
import { Carregando, Layout } from "@/components/Layout";
import { Entrar, SemPapel } from "@/pages/Entrar";
import { Leads } from "@/pages/Leads";
import { Projetos } from "@/pages/Projetos";
import { Clientes } from "@/pages/Clientes";
import { Projeto } from "@/pages/Projeto";
import { Novo } from "@/pages/Novo";

function Rotas() {
  const { pronto, usuario } = useSessao();
  if (!pronto) return <div className="p-8"><Carregando /></div>;
  if (!usuario) return <Entrar />;
  if (!usuario.papeis.length) return <SemPapel />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Leads />} />
        <Route path="projetos" element={<Projetos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="novo" element={<Novo />} />
        <Route path="projetos/:id" element={<Projeto />} />
        <Route path="*" element={<Leads />} />
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
