import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dados } from "./dados";
import type { Usuario } from "./dominio";

interface Sessao {
  pronto: boolean;
  usuario: Usuario | null;
  recarregar: () => Promise<void>;
}

const Ctx = createContext<Sessao>({ pronto: false, usuario: null, recarregar: async () => {} });
export const useSessao = () => useContext(Ctx);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const recarregar = async () => {
    setUsuario(await dados.eu().catch(() => null));
    setPronto(true);
  };

  useEffect(() => {
    void recarregar();
    return dados.aoMudarSessao(() => void recarregar());
  }, []);

  return <Ctx.Provider value={{ pronto, usuario, recarregar }}>{children}</Ctx.Provider>;
}
