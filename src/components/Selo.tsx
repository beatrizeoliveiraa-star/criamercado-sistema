import type { EtapaStatus, PedidoStatus, StatusComercial } from "@/lib/dominio";

type Qualquer = EtapaStatus | PedidoStatus | StatusComercial;

const COR: Record<Qualquer, string> = {
  nao_iniciada: "bg-stone-500/10 text-stone-600 dark:text-stone-300",
  em_andamento: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  pausado: "bg-red-500/15 text-red-700 dark:text-red-300",
  aprovacao_interna: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  aprovacao_cliente: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  concluido: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  desistencia: "bg-amber-800/15 text-amber-800 dark:text-amber-300",
  sem_pedido: "bg-stone-500/10 text-stone-500",
  nao_concluida: "bg-red-500/15 text-red-700 dark:text-red-300",
  follow_up: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  fechado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function Selo({ status, texto }: { status: Qualquer; texto: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${COR[status]}`}>
      {texto}
    </span>
  );
}
