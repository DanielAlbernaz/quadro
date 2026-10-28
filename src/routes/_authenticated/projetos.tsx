import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, ArchiveRestore, CalendarDays, FolderKanban, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProjectDialog, type ProjectRow } from "@/components/ProjectDialog";
import { useImageUrl } from "@/lib/data";
import { todayISO } from "@/lib/calendar";

export const Route = createFileRoute("/_authenticated/projetos")({
  head: () => ({
    meta: [
      { title: "Projetos — Quadro" },
      { name: "description", content: "Todos os projetos da equipe em um só lugar." },
      { property: "og:title", content: "Projetos — Quadro" },
      { property: "og:description", content: "Todos os projetos da equipe em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projetos,
});

type P = ProjectRow & { columns: { id: string; posicao: number }[]; tasks: { column_id: string }[] };

function Projetos() {
  const [arquivados, setArquivados] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; project?: ProjectRow | null | undefined }>({ open: false });
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, nome, descricao, capa_url, prefixo, arquivado, created_at, columns(id, posicao), tasks(column_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as P[];
    },
  });
  const list = (data ?? []).filter((p) => p.arquivado === arquivados);

  async function toggleArchive(p: ProjectRow) {
    const { error } = await supabase.from("projects").update({ arquivado: !p.arquivado }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.arquivado ? "Projeto restaurado" : "Projeto arquivado");
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-sm text-muted-foreground">Os jogos e trabalhos em andamento da equipe.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setArquivados(!arquivados)}>
            {arquivados ? "Ver ativos" : "Ver arquivados"}
          </Button>
          <Button onClick={() => setDialog({ open: true, project: null })}>
            <Plus /> Novo projeto
          </Button>
        </div>
      </div>

      <AgendaHoje />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">{arquivados ? "Nenhum projeto arquivado" : "Nenhum projeto ainda"}</h3>
          {!arquivados && <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro para começar a organizar as tarefas.</p>}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProjectCard key={p.id} p={p} onEdit={() => setDialog({ open: true, project: p })} onArchive={() => toggleArchive(p)} />
          ))}
        </div>
      )}
      <ProjectDialog open={dialog.open} project={dialog.project} onOpenChange={(o) => setDialog({ open: o, project: dialog.project })} />
    </div>
  );
}

function ProjectCard({ p, onEdit, onArchive }: { p: P; onEdit: () => void; onArchive: () => void }) {
  const url = useImageUrl(p.capa_url);
  const last = [...p.columns].sort((a, b) => b.posicao - a.posicao)[0];
  const abertas = p.tasks.filter((t) => t.column_id !== last?.id).length;
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
      <Link to="/p/$id" params={{ id: p.id }} className="block">
        <div className="aspect-[16/8] overflow-hidden bg-muted">
          {url ? (
            <img src={url} alt={p.nome} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-4xl font-bold text-muted-foreground/40">{p.prefixo}</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{p.prefixo}</span>
            <h3 className="truncate font-semibold">{p.nome}</h3>
          </div>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{p.descricao || "Sem descrição"}</p>
          <p className="mt-3 text-xs font-medium text-primary">{abertas} {abertas === 1 ? "tarefa aberta" : "tarefas abertas"}</p>
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100" aria-label="Opções">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}><Pencil /> Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>{p.arquivado ? <><ArchiveRestore /> Restaurar</> : <><Archive /> Arquivar</>}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type EvHoje = { id: string; titulo: string; descricao: string; projects: { nome: string; prefixo: string } | null };

function AgendaHoje() {
  const hoje = todayISO();
  const { data: eventos = [] } = useQuery({
    queryKey: ["agenda-hoje", hoje],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_events")
        .select("id, titulo, descricao, projects(nome, prefixo)")
        .eq("data", hoje)
        .order("created_at");
      if (error) throw error;
      return data as unknown as EvHoje[];
    },
  });
  return (
    <section className="mb-8 rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-4 w-4 text-primary" /> Agenda de hoje
          {eventos.length > 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{eventos.length}</span>}
        </h2>
        <Link to="/agenda" className="text-sm text-primary hover:underline">Ver agenda completa</Link>
      </div>
      {eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento para hoje.</p>
      ) : (
        <ul className="space-y-2">
          {eventos.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3 rounded-lg bg-muted/40 px-3 py-2">
              {ev.projects && <span className="mt-0.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{ev.projects.prefixo}</span>}
              <div className="min-w-0">
                <p className="text-sm font-medium">{ev.titulo}</p>
                {ev.descricao && <p className="truncate text-xs text-muted-foreground">{ev.descricao}</p>}
              </div>
              {ev.projects && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{ev.projects.nome}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
