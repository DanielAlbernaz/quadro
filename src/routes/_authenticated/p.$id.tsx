import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeft, CalendarDays, KanbanSquare, Plus, Search, Settings2, X } from "lucide-react";
import { CalendarView } from "@/components/board/CalendarView";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBoard, type Task } from "@/lib/board";
import { useMe, useMembers } from "@/lib/data";
import { insertionPosition, reordered } from "@/lib/board-order";
import { notifyDiscord } from "@/lib/discord";
import { PRIORIDADES, TIPOS, type Prioridade, type Tipo } from "@/lib/meta";
import { BoardColumn } from "@/components/board/BoardColumn";
import { TaskCardView } from "@/components/board/TaskCard";
import { TaskPanel } from "@/components/board/TaskPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/p/$id")({
  head: () => ({ meta: [
    { title: "Quadro do projeto — Quadro" },
    { name: "description", content: "Tarefas, responsáveis e prazos do projeto." },
    { property: "og:title", content: "Quadro do projeto — Quadro" },
    { property: "og:description", content: "Tarefas, responsáveis e prazos do projeto." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProjectBoard,
});

function ProjectBoard() {
  const { id } = Route.useParams();
  const board = useBoard(id);
  const qc = useQueryClient();
  const { data: members = [] } = useMembers();
  const { data: me } = useMe();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [type, setType] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [tag, setTag] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [newColumn, setNewColumn] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"kanban" | "agenda">("kanban");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const columns = board.columns.data ?? [];
  const tasks = board.tasks.data ?? [];
  const tags = board.tags.data ?? [];
  const fields = board.fields.data ?? [];
  const project = board.project.data;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks", id] });
    qc.invalidateQueries({ queryKey: ["columns", id] });
    qc.invalidateQueries({ queryKey: ["projects"] });
  };
  const visible = tasks.filter((task) =>
    `${task.titulo} ${project?.prefixo}-${task.numero}`.toLowerCase().includes(search.toLowerCase()) &&
    (priority === "all" || task.prioridade === priority) && (type === "all" || task.tipo === type) &&
    (assignee === "all" || task.task_assignees.some((a) => a.user_id === (assignee === "me" ? me?.id : assignee))) &&
    (tag === "all" || task.task_tags.some((t) => t.tag_id === tag)));

  async function createTask(columnId: string, titulo: string) {
    const siblings = tasks.filter((t) => t.column_id === columnId);
    const { data, error } = await supabase.from("tasks").insert({ project_id: id, column_id: columnId, titulo, posicao: insertionPosition(siblings, siblings.length) }).select("id").single();
    if (error) return toast.error(error.message);
    refresh();
    void notifyDiscord(data.id, "created");
  }

  async function createColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!columnName.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.from("columns").insert({ project_id: id, nome: columnName.trim(), posicao: insertionPosition(columns, columns.length) });
    setBusy(false);
    if (error) return toast.error(error.message);
    setColumnName(""); setNewColumn(false); refresh();
  }

  async function deleteColumn(columnId: string) {
    if (tasks.some((t) => t.column_id === columnId)) return toast.error("Mova ou exclua as tarefas antes de excluir a coluna.");
    if (!confirm("Excluir esta coluna?")) return;
    const { error } = await supabase.from("columns").delete().eq("id", columnId);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function dragEnd({ active: dragged, over }: DragEndEvent) {
    setActive(null);
    if (!over || dragged.id === over.id) return;
    const activeId = String(dragged.id), overId = String(over.id);
    if (activeId.startsWith("col:")) {
      if (!overId.startsWith("col:")) return;
      const ordered = reordered(columns, activeId.slice(4), overId.slice(4));
      const index = ordered.findIndex((c) => c.id === activeId.slice(4));
      const moved = ordered[index];
      if (!moved) return;
      const posicao = insertionPosition(ordered.filter((c) => c.id !== moved.id), index);
      qc.setQueryData(["columns", id], ordered.map((c) => c.id === moved.id ? { ...c, posicao } : c));
      const { error } = await supabase.from("columns").update({ posicao }).eq("id", moved.id);
      if (error) toast.error(error.message);
      refresh(); return;
    }
    const task = tasks.find((t) => t.id === activeId);
    const target = tasks.find((t) => t.id === overId);
    const columnId = overId.startsWith("col:") ? overId.slice(4) : target?.column_id;
    if (!task || !columnId) return;
    let siblings = tasks.filter((t) => t.column_id === columnId && t.id !== task.id);
    let index = target ? siblings.findIndex((t) => t.id === target.id) : siblings.length;
    if (task.column_id === columnId && target) {
      const sorted = reordered(tasks.filter((t) => t.column_id === columnId), task.id, target.id);
      index = sorted.findIndex((t) => t.id === task.id);
      siblings = sorted.filter((t) => t.id !== task.id);
    }
    const posicao = insertionPosition(siblings, Math.max(0, index));
    qc.setQueryData<Task[]>(["tasks", id], (old) => old?.map((t) => t.id === task.id ? { ...t, column_id: columnId, posicao } : t).sort((a, b) => a.posicao - b.posicao));
    const { error } = await supabase.from("tasks").update({ column_id: columnId, posicao }).eq("id", task.id);
    if (error) toast.error(error.message);
    else if (task.column_id !== columnId) void notifyDiscord(task.id, "moved", columns.find((c) => c.id === task.column_id)?.nome);
    refresh();
  }

  if (board.project.isPending || board.columns.isPending || board.tasks.isPending) return <div className="p-8 text-muted-foreground">Carregando quadro…</div>;
  if (!project || board.project.error || board.columns.error || board.tasks.error) return <div className="p-8"><h1 className="mb-4 text-xl font-semibold">Não foi possível carregar o projeto</h1><Button asChild variant="outline"><Link to="/projetos">Voltar aos projetos</Link></Button></div>;
  const draggedTask = tasks.find((t) => t.id === active);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="space-y-4 border-b px-4 py-5 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Voltar aos projetos"><Link to="/projetos"><ArrowLeft /></Link></Button>
            <div className="min-w-0"><h1 className="break-words text-2xl font-bold">{project.nome}</h1><p className="mt-1 text-sm text-muted-foreground">{project.prefixo} · {tasks.length} tarefas{project.arquivado ? " · Arquivado" : ""}</p></div>
          </div>
          <div className="flex shrink-0 gap-2">
          {mode === "kanban"
            ? <Button variant="outline" onClick={() => setMode("agenda")}><CalendarDays /> Agenda</Button>
            : <Button variant="outline" onClick={() => setMode("kanban")}><KanbanSquare /> Kanban</Button>}
          <Button asChild variant="outline" size="icon" aria-label="Configurações do projeto" title="Configurações do projeto"><Link to="/p/$id/configuracoes" params={{ id }}><Settings2 /></Link></Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-40 flex-1 sm:max-w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar tarefas" placeholder="Buscar tarefas…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger className="w-36" aria-label="Filtrar prioridade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Prioridades</SelectItem>{(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => <SelectItem key={p} value={p}>{PRIORIDADES[p].label}</SelectItem>)}</SelectContent></Select>
          <Select value={type} onValueChange={setType}><SelectTrigger className="w-44" aria-label="Filtrar tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tipos</SelectItem>{(Object.keys(TIPOS) as Tipo[]).map((t) => <SelectItem key={t} value={t}>{TIPOS[t].label}</SelectItem>)}</SelectContent></Select>
          <Select value={assignee} onValueChange={setAssignee}><SelectTrigger className="w-40" aria-label="Filtrar responsável"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Responsáveis</SelectItem><SelectItem value="me">Minhas tarefas</SelectItem>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select>
          <Select value={tag} onValueChange={setTag}><SelectTrigger className="w-36" aria-label="Filtrar etiqueta"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Etiquetas</SelectItem>{tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select>
          {(search || priority !== "all" || type !== "all" || assignee !== "all" || tag !== "all") && <Button variant="ghost" size="icon" aria-label="Limpar filtros" onClick={() => { setSearch(""); setPriority("all"); setType("all"); setAssignee("all"); setTag("all"); }}><X /></Button>}
        </div>
      </header>
      {mode === "agenda" ? <CalendarView projectId={id} /> : <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActive(String(e.active.id))} onDragCancel={() => setActive(null)} onDragEnd={dragEnd}>
        <div className="scrollbar-thin flex min-h-96 flex-1 items-start gap-4 overflow-x-auto p-4 md:p-6">
          <SortableContext items={columns.map((c) => `col:${c.id}`)} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => <BoardColumn key={column.id} column={column} tasks={visible.filter((t) => t.column_id === column.id)} prefixo={project.prefixo} members={members} tags={tags} onOpenTask={setSelected} onNewTask={(titulo) => createTask(column.id, titulo)} onRename={async (nome) => { const { error } = await supabase.from("columns").update({ nome }).eq("id", column.id); if (error) toast.error(error.message); refresh(); }} onDelete={() => deleteColumn(column.id)} />)}
          </SortableContext>
          <div className="w-72 shrink-0">{newColumn ? <form onSubmit={createColumn} className="space-y-2 rounded-lg border bg-card p-3"><Input autoFocus aria-label="Nome da coluna" placeholder="Nome da coluna" value={columnName} onChange={(e) => setColumnName(e.target.value)} /><div className="flex gap-2"><Button type="submit" size="sm" disabled={busy}>Adicionar coluna</Button><Button type="button" variant="ghost" size="sm" onClick={() => setNewColumn(false)}>Cancelar</Button></div></form> : <Button variant="outline" className="w-full justify-start" onClick={() => setNewColumn(true)}><Plus /> Nova coluna</Button>}</div>
        </div>
        <DragOverlay>{draggedTask ? <TaskCardView task={draggedTask} prefixo={project.prefixo} members={members} tags={tags} overlay /> : null}</DragOverlay>
      </DndContext>}
      <TaskPanel task={tasks.find((t) => t.id === selected) ?? null} prefixo={project.prefixo} projectId={id} columns={columns} members={members} tags={tags} fields={fields} onClose={() => setSelected(null)} />
    </div>
  );
}