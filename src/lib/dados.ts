import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Cliente,
  ClientePrivado,
  Envio,
  Etapa,
  Inscricao,
  Projeto,
  ProjetoCompleto,
  ProjetoResumo,
  Usuario,
} from "./dominio";
import { dadosDemo } from "./demo";

/** Tudo que as telas pedem ao banco. Duas versões: Supabase (real) e demonstração (na memória). */
export interface Dados {
  modo: "real" | "demo";
  eu(): Promise<Usuario | null>;
  entrar(email: string, senha: string): Promise<void>;
  sair(): Promise<void>;
  aoMudarSessao(cb: () => void): () => void;
  projetos(): Promise<ProjetoResumo[]>;
  projeto(id: string): Promise<ProjetoCompleto>;
  clientes(): Promise<(Cliente & { projetos: number })[]>;
  atualizarProjeto(id: string, campos: Partial<Projeto>): Promise<void>;
  atualizarEtapa(id: string, campos: Partial<Pick<Etapa, "status" | "data" | "observacao">>): Promise<void>;
  criarProjeto(novo: NovoProjeto): Promise<string>;
  inscricoes(): Promise<Inscricao[]>;
  inscricao(id: string): Promise<{ inscricao: Inscricao; envios: Envio[] }>;
  atualizarInscricao(id: string, campos: Partial<Inscricao>): Promise<void>;
  registrarEnvio(id: string, canal: Envio["canal"], tipo: string, texto: string): Promise<void>;
  /** Envia pelo servidor (função enviar-email). Falha se o e-mail ainda não foi configurado. */
  enviarEmail(id: string, tipo: string, assunto: string, texto: string): Promise<void>;
}

export interface NovoProjeto {
  cliente_id?: string;
  cliente?: Pick<Cliente, "nome" | "cidade" | "uf" | "telefone" | "email"> & Partial<Pick<Cliente, "cnpj" | "contato_nome">>;
  projeto: Pick<Projeto, "plano" | "valor_proposta_centavos" | "data_apresentacao">;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

function dadosSupabase(sb: SupabaseClient): Dados {
  return {
    modo: "real",

    async eu() {
      const { data } = await sb.auth.getUser();
      if (!data.user) return null;
      const u = check(await sb.from("usuarios").select("id,nome,email,papeis").eq("id", data.user.id).maybeSingle());
      return (u as Usuario | null) ?? { id: data.user.id, nome: "", email: data.user.email ?? null, papeis: [] };
    },

    async entrar(email, senha) {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw new Error(/invalid login/i.test(error.message) ? "E-mail ou senha não conferem." : error.message);
    },

    async sair() {
      await sb.auth.signOut();
    },

    aoMudarSessao(cb) {
      const { data } = sb.auth.onAuthStateChange(() => setTimeout(cb, 0));
      return () => data.subscription.unsubscribe();
    },

    async projetos() {
      return check(
        await sb
          .from("projetos")
          .select("*, cliente:clientes(id,nome,cidade,uf), etapas(tipo,status)")
          .order("atualizado_em", { ascending: false }),
      ) as ProjetoResumo[];
    },

    async projeto(id) {
      const projeto = check(await sb.from("projetos").select("*").eq("id", id).single()) as Projeto;
      const [cliente, privado, etapas, pedidos, historico] = await Promise.all([
        sb.from("clientes").select("*").eq("id", projeto.cliente_id).single().then(check),
        sb.from("clientes_privado").select("cpf,data_nascimento").eq("cliente_id", projeto.cliente_id).maybeSingle().then(check),
        sb.from("etapas").select("*").eq("projeto_id", id).then(check),
        sb.from("pedidos").select("*, fornecedor:fornecedores(nome,ordem)").eq("projeto_id", id).then(check),
        sb.from("historico").select("*, usuario:usuarios(nome)").eq("projeto_id", id).order("em", { ascending: false }).limit(50).then(check),
      ]);
      return {
        projeto,
        cliente: cliente as Cliente,
        privado: privado as ClientePrivado | null,
        etapas: etapas as Etapa[],
        pedidos: (pedidos as { fornecedor: { nome: string; ordem: number } }[])
          .sort((a, b) => a.fornecedor.ordem - b.fornecedor.ordem)
          .map((p) => ({ ...(p as object), fornecedor: p.fornecedor.nome })) as ProjetoCompleto["pedidos"],
        historico: (historico as { usuario: { nome: string } | null }[]).map((h) => ({
          ...(h as object),
          usuario: h.usuario?.nome ?? null,
        })) as ProjetoCompleto["historico"],
      };
    },

    async clientes() {
      const r = check(await sb.from("clientes").select("*, projetos(count)").order("nome")) as (Cliente & {
        projetos: { count: number }[];
      })[];
      return r.map((c) => ({ ...c, projetos: c.projetos[0]?.count ?? 0 }));
    },

    async atualizarProjeto(id, campos) {
      const r = check(await sb.from("projetos").update(campos).eq("id", id).select("id"));
      if (!r?.length) throw new Error("Você não tem permissão para mudar este projeto.");
    },

    async atualizarEtapa(id, campos) {
      const r = check(await sb.from("etapas").update(campos).eq("id", id).select("id"));
      if (!r?.length) throw new Error("Esta etapa é de outro papel. Peça para quem cuida dela.");
    },

    async criarProjeto(novo) {
      let clienteId = novo.cliente_id;
      if (!clienteId && novo.cliente) {
        clienteId = (check(await sb.from("clientes").insert(novo.cliente).select("id").single()) as { id: string }).id;
      }
      const c = check(await sb.from("clientes").select("nome,cidade,uf").eq("id", clienteId!).single()) as Cliente;
      const titulo = [c.nome, [c.cidade, c.uf].filter(Boolean).join("/")].filter(Boolean).join(" - ");
      const p = check(
        await sb.from("projetos").insert({ ...novo.projeto, cliente_id: clienteId, titulo }).select("id").single(),
      ) as { id: string };
      return p.id;
    },

    async inscricoes() {
      return check(await sb.from("inscricoes").select("*").order("call_em")) as Inscricao[];
    },

    async inscricao(id) {
      const [inscricao, envios] = await Promise.all([
        sb.from("inscricoes").select("*").eq("id", id).single().then(check),
        sb.from("inscricao_envios").select("*, usuario:usuarios(nome)").eq("inscricao_id", id).order("em", { ascending: false }).then(check),
      ]);
      return {
        inscricao: inscricao as Inscricao,
        envios: (envios as { usuario: { nome: string } | null }[]).map((e) => ({ ...(e as object), usuario: e.usuario?.nome ?? null })) as Envio[],
      };
    },

    async atualizarInscricao(id, campos) {
      const r = check(await sb.from("inscricoes").update(campos).eq("id", id).select("id"));
      if (!r?.length) throw new Error("Só o comercial mexe nas calls da Superminas.");
    },

    async registrarEnvio(id, canal, tipo, texto) {
      check(await sb.from("inscricao_envios").insert({ inscricao_id: id, canal, tipo, texto }));
    },

    async enviarEmail(id, tipo, assunto, texto) {
      const { data, error } = await sb.functions.invoke("enviar-email", { body: { inscricao_id: id, tipo, assunto, texto } });
      if (error) {
        const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(corpo?.erro ?? "O envio de e-mail ainda não está ligado no servidor. Use \"Abrir no meu e-mail\".");
      }
      if (data?.erro) throw new Error(data.erro);
    },
  };
}

export const dados: Dados = url && chave ? dadosSupabase(createClient(url, chave)) : dadosDemo();
