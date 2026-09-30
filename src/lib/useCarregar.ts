import { useCallback, useEffect, useState } from "react";

/** Carrega dados de uma função assíncrona, com estado de erro e recarga. */
export function useCarregar<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [dado, setDado] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(() => {
    fn().then(
      (d) => {
        setDado(d);
        setErro(null);
      },
      (e) => setErro(e instanceof Error ? e.message : String(e)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(carregar, [carregar]);
  return { dado, erro, recarregar: carregar };
}
