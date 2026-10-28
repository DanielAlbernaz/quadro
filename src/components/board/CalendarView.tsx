import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyDiscordAgenda } from "@/lib/discord";
import { monthGrid, todayISO } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Ev = { id: string; titulo: string; descricao: string; data: string; project_id: string; projects: { prefixo: string } | null };
type Draft = { id?: string; titulo: string; descricao: string; data: string; project_id: string };

/** Agenda mensal. Sem `projectId` é a agenda geral, com filtro por projeto. */
export function CalendarView({ projectId }: { projectId?: string }) {
  const qc = useQueryClient();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const geral = !projectId;
  const { data: projetos = [] } = useQuery({
    queryKey: ["projects-lista"],
    enabled: geral,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, nome, prefixo").eq("arquivado", false).order("nome");
      if (error) throw error;
      return data;
    },
  });
  const alvo = projectId ?? (filter === "all" ? null : filter);
  const days = monthGrid(ym.y, ym.m);
  const today = todayISO();
  const monthKey = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}`;
  const key = ["agenda", alvo ?? "all", days[0], days[41]];
  const { data: events = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from("agenda_events").select("id, titulo, descricao, data, project_id, projects(prefixo)")
        .gte("data", days[0]!).lte("data", days[41]!).order("created_at");
      if (alvo) q = q.eq("project_id", alvo);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Ev[];
    },
  });
  const byDay = new Map<string, Ev[]>();
  for (const e of events) byDay.set(e.data, [...(byDay.get(e.data) ?? []), e]);
  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const openCreate = (data: string) => {
    const project_id = alvo ?? projetos[0]?.id;
    if (!project_id) return toast.error("Crie um projeto antes de adicionar eventos.");
    setDraft({ titulo: "", descricao: "", data, project_id });
  };
  const done = () => { setDraft(null); qc.invalidateQueries({ queryKey: ["agenda"] }); qc.invalidateQueries({ queryKey: ["agenda-hoje"] }); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.titulo.trim() || busy) return;
    setBusy(true);
    const payload = { titulo: draft.titulo.trim(), descricao: draft.descricao, data: draft.data, project_id: draft.project_id };
    const { data: saved, error } = draft.id
      ? await supabase.from("agenda_events").update(payload).eq("id", draft.id).select("id").single()
      : await supabase.from("agenda_events").insert(payload).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    void notifyDiscordAgenda(saved.id, draft.id ? "updated" : "created");
    toast.success(draft.id ? "Evento atualizado" : "Evento criado");
    done();
  }

  async function remove() {
    if (!draft?.id || !confirm("Excluir este evento?")) return;
    const { error } = await supabase.from("agenda_events").delete().eq("id", draft.id);
    if (error) return toast.error(error.message);
    done();
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>Hoje</Button>
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => shift(-1)}><ChevronLeft /></Button>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => shift(1)}><ChevronRight /></Button>
        <h2 className="text-xl font-semibold">{MESES[ym.m]} de {ym.y}</h2>
        {geral && (
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="ml-2 w-52" aria-label="Filtrar por projeto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button className="ml-auto" onClick={() => openCreate(monthKey === today.slice(0, 7) ? today : `${monthKey}-01`)}><Plus /> Agenda</Button>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-lg border">
          {DIAS.map((d) => <div key={d} className="border-b bg-muted/50 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
          {days.map((day, i) => {
            const items = byDay.get(day) ?? [];
            const out = !day.startsWith(monthKey);
            return (
              <div key={day} onClick={() => openCreate(day)} className={cn("group relative min-h-28 cursor-pointer border-b border-r p-1.5 transition-colors hover:bg-accent/40", (i + 1) % 7 === 0 && "border-r-0", out && "bg-muted/20 text-muted-foreground")}>
                <div className="mb-1 flex items-center justify-between">
                  <button type="button" aria-label={`Novo evento em ${day}`} onClick={(e) => { e.stopPropagation(); openCreate(day); }} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-primary hover:text-primary-foreground group-hover:opacity-100"><Plus className="h-3.5 w-3.5" /></button>
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", day === today && "bg-primary font-semibold text-primary-foreground")}>{Number(day.slice(8))}</span>
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((ev) => (
                    <button key={ev.id} type="button" onClick={(e) => { e.stopPropagation(); setDraft({ id: ev.id, titulo: ev.titulo, descricao: ev.descricao, data: ev.data, project_id: ev.project_id }); }} className="block w-full truncate rounded bg-primary/15 px-1.5 py-0.5 text-left text-xs text-foreground hover:bg-primary/25">{geral && ev.projects && <span className="mr-1 font-semibold text-primary">{ev.projects.prefixo}</span>}{ev.titulo}</button>
                  ))}
                  {items.length > 3 && <p className="px-1 text-xs text-muted-foreground">+{items.length - 3} mais</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{draft?.id ? "Editar evento" : "Novo evento na agenda"}</DialogTitle></DialogHeader>
          {draft && (
            <form id="agenda-form" onSubmit={save} className="space-y-4">
              {geral && (
                <div className="space-y-1.5"><Label>Projeto</Label>
                  <Select value={draft.project_id} onValueChange={(v) => setDraft({ ...draft, project_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5"><Label>Título</Label><Input autoFocus value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} placeholder="Ex.: Reunião de playtest" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={draft.data} onChange={(e) => e.target.value && setDraft({ ...draft, data: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={3} value={draft.descricao} onChange={(e) => setDraft({ ...draft, descricao: e.target.value })} /></div>
            </form>
          )}
          <DialogFooter className="gap-2">
            {draft?.id && <Button variant="ghost" className="mr-auto text-destructive" onClick={remove}><Trash2 /> Excluir</Button>}
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button>
            <Button type="submit" form="agenda-form" disabled={busy || !draft?.titulo.trim()}>{busy ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
