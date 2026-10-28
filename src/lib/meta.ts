import { Bug, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export type Tipo = Database["public"]["Enums"]["task_tipo"];
export type Prioridade = Database["public"]["Enums"]["task_prioridade"];
export type FieldTipo = Database["public"]["Enums"]["field_tipo"];

export const TIPOS: Record<Tipo, { label: string; icon: LucideIcon; text: string; bg: string }> = {
  bug: { label: "Correção", icon: Bug, text: "text-bug", bg: "bg-bug/15" },
  melhoria: { label: "Melhoria", icon: Wrench, text: "text-melhoria", bg: "bg-melhoria/15" },
  feature: { label: "Nova funcionalidade", icon: Sparkles, text: "text-feature", bg: "bg-feature/15" },
};

export const PRIORIDADES: Record<Prioridade, { label: string; text: string; bg: string; ordem: number }> = {
  baixa: { label: "Baixa", text: "text-prio-baixa", bg: "bg-prio-baixa/15", ordem: 0 },
  media: { label: "Média", text: "text-prio-media", bg: "bg-prio-media/15", ordem: 1 },
  alta: { label: "Alta", text: "text-prio-alta", bg: "bg-prio-alta/15", ordem: 2 },
  urgente: { label: "Urgente", text: "text-prio-urgente", bg: "bg-prio-urgente/15", ordem: 3 },
};

export const FIELD_TIPOS: Record<FieldTipo, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  lista: "Lista de opções",
  checkbox: "Checkbox",
  link: "Link (URL)",
};

export const TAG_CORES = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#64748b"];

export function isOverdue(date: string | null) {
  if (!date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return date < today;
}

export function formatDate(date: string | null) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${(y ?? "").slice(2)}`;
}

/** Posição entre dois vizinhos (ordenação fracionária). */
export function between(before: number | undefined, after: number | undefined) {
  if (before === undefined && after === undefined) return 1;
  if (before === undefined) return (after ?? 1) - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
