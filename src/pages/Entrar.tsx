import { useState } from "react";
import { dados } from "@/lib/dados";
import { useSessao } from "@/lib/sessao";

export function Entrar() {
  const { recarregar } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await dados.entrar(email, senha);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-dvh grid place-items-center p-4 textura">
      <form onSubmit={enviar} className="cartao w-full max-w-sm p-6 flex flex-col gap-4 shadow-xl">
        <div className="pb-2">
          <img src="/marca/logo-escuro.svg" alt="CRIAMERCADO" className="logo-escuro h-8" />
          <img src="/marca/logo-claro.svg" alt="CRIAMERCADO" className="logo-claro h-8" />
        </div>
        <label className="text-sm flex flex-col gap-1">
          E-mail
          <input className="campo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-sm flex flex-col gap-1">
          Senha
          <input className="campo" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
        <button className="botao justify-center" disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</button>
        <p className="text-xs texto-2">As contas são criadas pela administração.</p>
      </form>
    </div>
  );
}

export function SemPapel() {
  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <div className="cartao max-w-sm p-6 text-sm flex flex-col gap-3">
        <p className="font-semibold">Sua conta ainda não foi liberada.</p>
        <p className="texto-2">Peça para a administração definir o seu papel na equipe.</p>
        <button className="botao-2 self-start" onClick={() => dados.sair()}>Sair</button>
      </div>
    </div>
  );
}
