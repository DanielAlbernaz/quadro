import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays } from "lucide-react";
import type { Task, Tag } from "@/lib/board";
import type { Member } from "@/lib/data";
import { PRIORIDADES, TIPOS, formatDate, isOverdue } from "@/lib/meta";
import { AvatarStack } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export function TaskCardView({ task, prefixo, members, tags, overlay, onClick }: { task: Task; prefixo: string; members: Member[]; tags: Tag[]; overlay?: boolean; onClick?: () => void }) {
  const tipo = TIPOS[task.tipo];
  const prio = PRIORIDADES[task.prioridade];
  const Icon = tipo.icon;
  const assignees = members.filter((m) => task.task_assignees.some((a) => a.user_id === m.id));
  const taskTags = tags.filter((t) => task.task_tags.some((x) => x.tag_id === t.id));
  const late = isOverdue(task.data_entrega);
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border bg-card p-3 text-left shadow-sm transition hover:border-primary/40",
        overlay && "rotate-2 border-primary/60 shadow-xl",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px]">
        <span className={cn("flex h-5 w-5 items-center justify-center rounded", tipo.bg, tipo.text)} title={tipo.label}>
          <Icon className="h-3 w-3" />
        </span>
        <span className="font-mono text-muted-foreground">{prefixo}-{task.numero}</span>
        <span className={cn("ml-auto rounded px-1.5 py-0.5 font-medium", prio.bg, prio.text)}>{prio.label}</span>
      </div>
      <p className="text-sm font-medium leading-snug">{task.titulo}</p>
      {taskTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {taskTags.map((t) => (
            <span key={t.id} className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${t.cor}26`, color: t.cor }}>
              {t.nome}
            </span>
          ))}
        </div>
      )}
      {(assignees.length > 0 || task.data_entrega) && (
        <div className="mt-2.5 flex items-center justify-between">
          {task.data_entrega ? (
            <span className={cn("flex items-center gap-1 text-[11px]", late ? "font-semibold text-overdue" : "text-muted-foreground")}>
              <CalendarDays className="h-3 w-3" />
              {formatDate(task.data_entrega)}
            </span>
          ) : <span />}
          <AvatarStack members={assignees} />
        </div>
      )}
    </div>
  );
}

export function SortableTask(props: { task: Task; prefixo: string; members: Member[]; tags: Tag[]; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id, data: { type: "task" } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && "opacity-30")} {...attributes} {...listeners}>
      <TaskCardView {...props} onClick={props.onOpen} />
    </div>
  );
}
