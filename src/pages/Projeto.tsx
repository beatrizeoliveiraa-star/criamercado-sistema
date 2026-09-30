import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { dados } from "@/lib/dados";
import {
  NOME_ETAPA,
  NOME_ETAPA_STATUS,
  NOME_PEDIDO_STATUS,
  NOME_PLANO,
  NOME_STATUS_COMERCIAL,
  ORDEM_ETAPAS,
  PAPEL_DA_ETAPA,
  STATUS_DA_ETAPA,
  dataCurta,
  lugar,
  reais,
  temPapel,
  type Etapa,
  type EtapaStatus,
  type Historico,
  type Plano,
  type Projeto as TProjeto,
  type StatusComercial,
} from "@/lib/dominio";
import { useSessao } from "@/lib/sessao";
import { useCarregar } from "@/lib/useCarregar";
import { Selo } from "@/components/Selo";
import { Carregando, Erro } from "@/components/Layout";

export function Projeto() {
  const { id = "" } = useParams();
  const { usuario } = useSessao();
  const { dado, erro, recarregar } = useCarregar(() => dados.projeto(id), [id]);
  const [falha, setFalha] = useState<string | null>(null);

  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;
  const { projeto: p, cliente: c, privado, etapas, pedidos, historico } = dado;
  const comercial = temPapel(usuario, "comercial");

  const salvar = async (fn: () => Promise<void>) => {
    setFalha(null);
    await fn().catch((e) => setFalha(e.message));
    recarregar();
  };
  const mudarProjeto = (campos: Partial<TProjeto>) => salvar(() => dados.atualizarProjeto(p.id, campos));
  const mudarEtapa = (e: Etapa, campos: Partial<Etapa>) => salvar(() => dados.atualizarEtapa(e.id, campos));

  return (
    <div className="max-w-5xl">
      <Link to="/leads" className="text-sm texto-2 inline-flex items-center gap-1 mb-3 hover:underline"><ArrowLeft size={14} /> Leads</Link>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">{c.nome}</h1>
          <p className="texto-2 text-sm">{lugar(c)}{p.plano ? ` · ${NOME_PLANO[p.plano]}` : ""}</p>
        </div>
        {comercial ? (
          <select className="campo w-auto font-medium" value={p.status_comercial} onChange={(e) => mudarProjeto({ status_comercial: e.target.value as StatusComercial })} aria-label="Status comercial">
            {Object.entries(NOME_STATUS_COMERCIAL).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        ) : <Selo status={p.status_comercial} texto={NOME_STATUS_COMERCIAL[p.status_comercial]} />}
      </div>
      {falha ? <div className="mb-4"><Erro msg={falha} /></div> : null}

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="flex flex-col gap-5">
          <section className="cartao">
            <h2 className="font-semibold text-sm px-4 pt-4 pb-2">Etapas</h2>
            <ul className="divide-y divide-[var(--borda)]">
              {ORDEM_ETAPAS.map((t) => {
                const e = etapas.find((x) => x.tipo === t);
                if (!e) return null;
                const pode = temPapel(usuario, PAPEL_DA_ETAPA[t]);
                return (
                  <li key={t} className="px-4 py-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm flex-1 min-w-40">{NOME_ETAPA[t]}
                      {e.observacao ? <span className="block text-xs texto-2">{e.observacao}</span> : null}
                    </span>
                    {pode ? (
                      <select className="campo w-auto text-xs py-1" value={e.status} onChange={(ev) => mudarEtapa(e, { status: ev.target.value as EtapaStatus })} aria-label={`Status de ${NOME_ETAPA[t]}`}>
                        {STATUS_DA_ETAPA[t].map((s) => <option key={s} value={s}>{NOME_ETAPA_STATUS[s]}</option>)}
                      </select>
                    ) : <Selo status={e.status} texto={NOME_ETAPA_STATUS[e.status]} />}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="cartao overflow-x-auto">
            <h2 className="font-semibold text-sm px-4 pt-4 pb-2">Pedidos a fornecedores</h2>
            {pedidos.length ? (
              <table className="w-full text-sm">
                <thead className="texto-2 text-xs text-left">
                  <tr><th className="px-4 py-2 font-medium">Fornecedor</th><th className="px-2 font-medium">Orçamento</th><th className="px-2 font-medium">Código</th><th className="px-2 font-medium">Pedido</th><th className="px-4 font-medium">Entrega</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--borda)]">
                  {pedidos.map((x) => (
                    <tr key={x.id}>
                      <td className="px-4 py-2 font-medium">{x.fornecedor}</td>
                      <td className="px-2">{x.orcamento_status ? <Selo status={x.orcamento_status} texto={NOME_PEDIDO_STATUS[x.orcamento_status]} /> : null} <span className="text-xs texto-2">{dataCurta(x.orcamento_data)}</span></td>
                      <td className="px-2">{x.codigo}</td>
                      <td className="px-2"><Selo status={x.status} texto={NOME_PEDIDO_STATUS[x.status]} /></td>
                      <td className="px-4">{dataCurta(x.entregue_em ?? x.entrega_prevista)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="px-4 pb-4 text-sm texto-2">Nenhum pedido ainda. A edição de pedidos chega na fase 2.</p>}
          </section>

          <HistoricoLista itens={historico} />
        </div>

        <div className="flex flex-col gap-5">
          <section className="cartao p-4 flex flex-col gap-3 text-sm">
            <h2 className="font-semibold">Proposta</h2>
            <Campo rotulo="Plano">
              {comercial ? (
                <select className="campo" value={p.plano ?? ""} onChange={(e) => mudarProjeto({ plano: (e.target.value || null) as Plano | null })}>
                  <option value="">A definir</option>
                  {Object.entries(NOME_PLANO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                </select>
              ) : p.plano ? NOME_PLANO[p.plano] : "A definir"}
            </Campo>
            <Campo rotulo="Valor da proposta">{reais(p.valor_proposta_centavos) || "—"}</Campo>
            <DataCampo rotulo="Apresentação" valor={p.data_apresentacao} pode={comercial} mudar={(v) => mudarProjeto({ data_apresentacao: v })} />
            <DataCampo rotulo="Fechamento" valor={p.data_fechamento} pode={comercial} mudar={(v) => mudarProjeto({ data_fechamento: v })} />
            <DataCampo rotulo="Entrega" valor={p.data_entrega} pode={comercial} mudar={(v) => mudarProjeto({ data_entrega: v })} />
          </section>

          <section className="cartao p-4 flex flex-col gap-2 text-sm">
            <h2 className="font-semibold">Cliente</h2>
            <Info rotulo="Razão social" valor={c.razao_social} />
            <Info rotulo="CNPJ" valor={c.cnpj} />
            <Info rotulo="Inscrição estadual" valor={c.inscricao_estadual} />
            <Info rotulo="Responsável" valor={c.contato_nome} />
            {privado ? <Info rotulo="CPF" valor={privado.cpf} /> : null}
            {privado ? <Info rotulo="Nascimento" valor={dataCurta(privado.data_nascimento)} /> : null}
            <Info rotulo="Telefone" valor={c.telefone} />
            <Info rotulo="E-mail" valor={c.email} />
            <Info rotulo="Endereço" valor={c.endereco} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><span className="text-xs texto-2">{rotulo}</span>{children}</div>;
}

function DataCampo({ rotulo, valor, pode, mudar }: { rotulo: string; valor: string | null; pode: boolean; mudar: (v: string | null) => void }) {
  return (
    <Campo rotulo={rotulo}>
      {pode ? <input type="date" className="campo" value={valor ?? ""} onChange={(e) => mudar(e.target.value || null)} /> : dataCurta(valor) || "—"}
    </Campo>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="texto-2">{rotulo}</span>
      <span className="text-right break-all">{valor || "—"}</span>
    </div>
  );
}

const NOME_CAMPO: Record<string, string> = {
  status_comercial: "Status", status: "Status", plano: "Plano", valor_proposta_centavos: "Valor",
  data_apresentacao: "Apresentação", data_fechamento: "Fechamento", data_entrega: "Entrega", observacao: "Observação",
};

function HistoricoLista({ itens }: { itens: Historico[] }) {
  if (!itens.length) return null;
  return (
    <section className="cartao p-4">
      <h2 className="font-semibold text-sm mb-2">Histórico</h2>
      <ul className="text-xs flex flex-col gap-1.5">
        {itens.map((h) => (
          <li key={h.id} className="texto-2">
            <span style={{ color: "var(--texto)" }}>{h.usuario ?? "Alguém"}</span> mudou {NOME_CAMPO[h.campo] ?? h.campo}
            {h.tabela === "etapas" ? " de uma etapa" : ""}: {traduzir(h.de)} → <span style={{ color: "var(--texto)" }}>{traduzir(h.para)}</span>
            <span> · {new Date(h.em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function traduzir(v: string | null) {
  if (v == null) return "vazio";
  return (
    (NOME_STATUS_COMERCIAL as Record<string, string>)[v] ??
    (NOME_ETAPA_STATUS as Record<string, string>)[v] ??
    (NOME_PLANO as Record<string, string>)[v] ??
    v
  );
}
