import { useState } from "react";
import { useNavigate } from "react-router";
import { dados } from "@/lib/dados";
import { NOME_PLANO, temPapel, type Plano } from "@/lib/dominio";
import { useSessao } from "@/lib/sessao";
import { useCarregar } from "@/lib/useCarregar";
import { Erro, Titulo } from "@/components/Layout";

export function Novo() {
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const { dado: clientes } = useCarregar(() => dados.clientes());
  const [clienteId, setClienteId] = useState("");
  const [f, setF] = useState({ nome: "", cidade: "", uf: "MG", telefone: "", email: "", plano: "", valor: "", apresentacao: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value }) });

  if (!temPapel(usuario, "comercial")) return <Erro msg="Só o comercial cadastra negócios." />;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const valor = f.valor ? Math.round(Number(f.valor.replace(/\./g, "").replace(",", ".")) * 100) : null;
      const id = await dados.criarProjeto({
        cliente_id: clienteId || undefined,
        cliente: clienteId ? undefined : {
          nome: f.nome.trim().toUpperCase(), cidade: f.cidade.trim() || null, uf: f.uf.trim().toUpperCase() || null,
          telefone: f.telefone.trim() || null, email: f.email.trim() || null,
        },
        projeto: { plano: (f.plano || null) as Plano | null, valor_proposta_centavos: Number.isFinite(valor) ? valor : null, data_apresentacao: f.apresentacao || null },
      });
      navegar(`/negocios/${id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setEnviando(false);
    }
  };

  return (
    <>
      <Titulo>Novo negócio</Titulo>
      <form onSubmit={salvar} className="cartao p-5 max-w-xl flex flex-col gap-4">
        <label className="text-sm flex flex-col gap-1">
          Cliente
          <select className="campo" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Novo cliente</option>
            {clientes?.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.cidade ? ` · ${c.cidade}` : ""}</option>)}
          </select>
        </label>
        {!clienteId ? (
          <div className="grid grid-cols-6 gap-3">
            <label className="text-sm flex flex-col gap-1 col-span-6">Nome do supermercado<input className="campo" required placeholder="SUP EXEMPLO" {...campo("nome")} /></label>
            <label className="text-sm flex flex-col gap-1 col-span-4">Cidade<input className="campo" {...campo("cidade")} /></label>
            <label className="text-sm flex flex-col gap-1 col-span-2">UF<input className="campo" maxLength={2} {...campo("uf")} /></label>
            <label className="text-sm flex flex-col gap-1 col-span-3">Telefone<input className="campo" type="tel" {...campo("telefone")} /></label>
            <label className="text-sm flex flex-col gap-1 col-span-3">E-mail<input className="campo" type="email" {...campo("email")} /></label>
          </div>
        ) : null}
        <div className="grid grid-cols-6 gap-3">
          <label className="text-sm flex flex-col gap-1 col-span-6 sm:col-span-2">Plano
            <select className="campo" {...campo("plano")}>
              <option value="">A definir</option>
              {Object.entries(NOME_PLANO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1 col-span-3 sm:col-span-2">Valor da proposta (R$)<input className="campo" inputMode="decimal" placeholder="350.000" {...campo("valor")} /></label>
          <label className="text-sm flex flex-col gap-1 col-span-3 sm:col-span-2">Apresentação<input className="campo" type="date" {...campo("apresentacao")} /></label>
        </div>
        {erro ? <Erro msg={erro} /> : null}
        <button className="botao self-start" disabled={enviando}>{enviando ? "Salvando..." : "Criar lead"}</button>
      </form>
    </>
  );
}
