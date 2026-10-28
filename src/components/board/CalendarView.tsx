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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Ev = { id: string; titulo: string; descricao: string; data: string };
type Draft = { id?: string; titulo: string; descricao: string; data: string };

export function CalendarView({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const days = monthGrid(ym.y, ym.m);
  const today = todayISO();
  const monthKey = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}`;
  const key = ["agenda", projectId, days[0], days[41]];
  const { data: events = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("agenda_events").select("id, titulo, descricao, data")
        .eq("project_id", projectId).gte("data", days[0]!).lte("data", days[41]!).order("created_at");
      if (error) throw error;
      return data as Ev[];
    },
  });
  const byDay = new Map<string, Ev[]>();
  for (const e of events) byDay.set(e.data, [...(byDay.get(e.data) ?? []), e]);
  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const openCreate = (data: string) => setDraft({ titulo: "", descricao: "", data });
  const done = () => { setDraft(null); qc.invalidateQueries({ queryKey: ["agenda", projectId] }); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.titulo.trim() || busy) return;
    setBusy(true);
    const payload = { titulo: draft.titulo.trim(), descricao: draft.descricao, data: draft.data };
    const { data: saved, error } = draft.id
      ? await supabase.from("agenda_events").update(payload).eq("id", draft.id).select("id").single()
      : await supabase.from("agenda_events").insert({ ...payload, project_id: projectId }).select("id").single();
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
                    <button key={ev.id} type="button" onClick={(e) => { e.stopPropagation(); setDraft({ ...ev }); }} className="block w-full truncate rounded bg-primary/15 px-1.5 py-0.5 text-left text-xs text-foreground hover:bg-primary/25">{ev.titulo}</button>
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
