import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Column, Tag, Task } from "@/lib/board";
import type { Member } from "@/lib/data";
import { SortableTask } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  column: Column;
  tasks: Task[];
  prefixo: string;
  members: Member[];
  tags: Tag[];
  onOpenTask: (id: string) => void;
  onNewTask: (titulo: string) => void;
  onRename: (nome: string) => void;
  onDelete: () => void;
};

export function BoardColumn({ column, tasks, prefixo, members, tags, onOpenTask, onNewTask, onRename, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `col:${column.id}`, data: { type: "column" } });
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(column.nome);
  const [adding, setAdding] = useState(false);
  const [titulo, setTitulo] = useState("");

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-column", isDragging && "opacity-40")}
    >
      <div className="flex items-center gap-1.5 px-3 pb-2 pt-3">
        <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab text-muted-foreground/60 hover:text-foreground" aria-label="Arrastar coluna" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </Button>
        {editing ? (
          <Input
            autoFocus
            value={nome}
            className="h-7"
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (nome.trim() && nome !== column.nome) onRename(nome.trim());
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <h3 className="flex-1 truncate text-sm font-semibold" onDoubleClick={() => setEditing(true)}>{column.nome}</h3>
        )}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{tasks.length}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Opções da coluna"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}><Pencil /> Renomear</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 /> Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="scrollbar-thin flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableTask key={t.id} task={t} prefixo={prefixo} members={members} tags={tags} onOpen={() => onOpenTask(t.id)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !adding && (
          <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">Nenhuma tarefa nesta coluna</div>
        )}
      </div>
      <div className="px-2 pb-2">
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (titulo.trim()) onNewTask(titulo.trim());
              setTitulo("");
            }}
            className="space-y-2"
          >
            <Input autoFocus placeholder="Título da tarefa" value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setAdding(false)} />
            <div className="flex gap-2">
              <Button size="sm" type="submit">Adicionar</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus /> Nova tarefa
          </Button>
        )}
      </div>
    </div>
  );
}
