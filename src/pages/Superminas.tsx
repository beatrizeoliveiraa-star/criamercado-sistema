import { useState } from "react";
import { Link } from "react-router";
import { Download, ExternalLink } from "lucide-react";
import { dados } from "@/lib/dados";
import { NOME_INSCRICAO_STATUS, temPapel, type Inscricao } from "@/lib/dominio";
import { dataCurta, diaLocal, mascaraCelular, mascaraCnpj, nomeDia } from "@/lib/superminas";
import { useSessao } from "@/lib/sessao";
import { useCarregar } from "@/lib/useCarregar";
import { Selo } from "@/components/Selo";
import { Carregando, Erro, Titulo } from "@/components/Layout";

type Filtro = "proximas" | "anteriores" | "todas";

export function Superminas() {
  const { usuario } = useSessao();
  const { dado, erro } = useCarregar(() => dados.inscricoes());
  const [filtro, setFiltro] = useState<Filtro>("proximas");
  const [busca, setBusca] = useState("");

  if (!temPapel(usuario, "comercial")) return <Erro msg="Só o comercial vê as calls da Superminas." />;

  const hoje = diaLocal(new Date().toISOString());
  const lista = dado
    ?.filter((i) =>
      filtro === "todas" ? true
      : filtro === "proximas" ? diaLocal(i.call_em) >= hoje && i.status === "agendada"
      : diaLocal(i.call_em) < hoje || i.status !== "agendada",
    )
    .filter((i) => `${i.empresa} ${i.cidade ?? ""} ${i.responsavel} ${i.cupom ?? ""}`.toLowerCase().includes(busca.toLowerCase()));
  if (filtro === "anteriores") lista?.reverse();

  const pendentes = (i: Inscricao) => [!i.recebeu_faturamento, !i.recebeu_setores, !i.recebeu_video].filter(Boolean).length;

  return (
    <>
      <Titulo direita={
        <div className="flex gap-2">
          <a href="/superminas/" target="_blank" rel="noopener" className="botao-2"><ExternalLink size={16} /> <span className="hidden sm:inline">Ver página</span></a>
          <button className="botao-2" onClick={() => dado && baixarCsv(dado)} disabled={!dado?.length}><Download size={16} /> <span className="hidden sm:inline">Planilha</span></button>
        </div>
      }>Superminas</Titulo>

      {dado ? <Resumo lista={dado} hoje={hoje} /> : null}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["proximas", "anteriores", "todas"] as Filtro[]).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`rounded-full px-3 py-1.5 text-sm border borda ${filtro === f ? "bg-marca text-white border-transparent" : ""}`}>
            {{ proximas: "Próximas calls", anteriores: "Já passaram", todas: "Todas" }[f]}
          </button>
        ))}
        <input className="campo sm:max-w-xs sm:ml-auto" placeholder="Buscar empresa, cidade, cupom" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {erro ? <Erro msg={erro} /> : !lista ? <Carregando /> : (
        <div className="cartao divide-y divide-[var(--borda)]">
          {lista.map((i, n) => {
            const dia = diaLocal(i.call_em);
            const novoDia = filtro === "proximas" && (n === 0 || diaLocal(lista[n - 1].call_em) !== dia);
            const falta = pendentes(i);
            return (
              <div key={i.id}>
                {novoDia ? (
                  <p className="px-3 pt-3 pb-1 text-xs font-semibold texto-2 uppercase">
                    {dia === hoje ? "Hoje · " : ""}{nomeDia(i.call_em)}
                  </p>
                ) : null}
                <Link to={`/inscricoes/${i.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm hover:bg-black/5 dark:hover:bg-white/5">
                  <span className="font-semibold tabular-nums w-24 shrink-0">{dataCurta(i.call_em)}</span>
                  <span className="flex-1 min-w-48">
                    <span className="font-medium block truncate">{i.empresa}</span>
                    <span className="text-xs texto-2">{[i.cidade && `${i.cidade}/${i.uf}`, i.responsavel, mascaraCelular(i.whatsapp)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={`text-xs ${falta ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                    {falta ? `Falta${falta > 1 ? "m" : ""} ${falta} de 3 materiais` : "Materiais recebidos"}
                  </span>
                  <Selo status={i.status} texto={NOME_INSCRICAO_STATUS[i.status]} />
                </Link>
              </div>
            );
          })}
          {!lista.length ? <p className="p-4 text-sm texto-2">Nenhuma call aqui.</p> : null}
        </div>
      )}
    </>
  );
}

function Resumo({ lista, hoje }: { lista: Inscricao[]; hoje: string }) {
  const ativas = lista.filter((i) => i.status !== "cancelada");
  const itens = [
    ["Inscrições", ativas.length],
    ["Calls hoje", ativas.filter((i) => i.status === "agendada" && diaLocal(i.call_em) === hoje).length],
    ["Próximas", ativas.filter((i) => i.status === "agendada" && diaLocal(i.call_em) >= hoje).length],
    ["Viraram lead", ativas.filter((i) => i.status === "virou_lead").length],
  ] as const;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {itens.map(([nome, n]) => (
        <div key={nome} className="cartao p-3">
          <p className="text-xs texto-2">{nome}</p>
          <p className="text-2xl font-semibold tabular-nums">{n}</p>
        </div>
      ))}
    </div>
  );
}

function baixarCsv(lista: Inscricao[]) {
  const colunas: [string, (i: Inscricao) => string][] = [
    ["Call", (i) => new Date(i.call_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
    ["Empresa", (i) => i.empresa],
    ["CNPJ", (i) => mascaraCnpj(i.cnpj)],
    ["Cidade", (i) => i.cidade ?? ""],
    ["UF", (i) => i.uf ?? ""],
    ["Responsável", (i) => i.responsavel],
    ["WhatsApp", (i) => mascaraCelular(i.whatsapp)],
    ["E-mail", (i) => i.email],
    ["Cupom", (i) => i.cupom ?? ""],
    ["Status", (i) => NOME_INSCRICAO_STATUS[i.status]],
    ["Faturamento", (i) => (i.recebeu_faturamento ? "sim" : "não")],
    ["Setores", (i) => (i.recebeu_setores ? "sim" : "não")],
    ["Vídeo", (i) => (i.recebeu_video ? "sim" : "não")],
    ["Origem", (i) => i.origem ?? ""],
    ["Inscrito em", (i) => new Date(i.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
    ["Observações", (i) => i.observacoes ?? ""],
  ];
  const cel = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [colunas.map(([n]) => cel(n)).join(";"), ...lista.map((i) => colunas.map(([, f]) => cel(f(i))).join(";"))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `superminas-${diaLocal(new Date().toISOString())}.csv`;
  a.click();
}
