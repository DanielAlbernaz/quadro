import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBoard, type CustomField } from "@/lib/board";
import { FIELD_TIPOS, type FieldTipo } from "@/lib/meta";
import { insertionPosition, reordered } from "@/lib/board-order";
import { ProjectDialog } from "@/components/ProjectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/p/$id_/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações do projeto — Quadro" },
    { name: "description", content: "Dados do projeto e campos personalizados das tarefas." },
    { property: "og:title", content: "Configurações do projeto — Quadro" },
    { property: "og:description", content: "Dados do projeto e campos personalizados das tarefas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProjectSettings,
});

function ProjectSettings() {
  const { id } = Route.useParams();
  const board = useBoard(id);
  const qc = useQueryClient();
  const fields = board.fields.data ?? [];
  const project = board.project.data;
  const [editProject, setEditProject] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<FieldTipo>("texto");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["fields", id] });

  function edit(field: CustomField | null) {
    setEditing(field); setNome(field?.nome ?? ""); setTipo(field?.tipo ?? "texto");
    setRequired(field?.obrigatorio ?? false); setOptions(field?.opcoes.join("\n") ?? ""); setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || saving) return;
    const opcoes = [...new Set(options.split("\n").map((s) => s.trim()).filter(Boolean))];
    if (tipo === "lista" && !opcoes.length) return toast.error("Adicione pelo menos uma opção.");
    setSaving(true);
    const payload = { nome: nome.trim(), tipo, obrigatorio: required, opcoes: tipo === "lista" ? opcoes : [] };
    const { error } = editing ? await supabase.from("custom_fields").update(payload).eq("id", editing.id) : await supabase.from("custom_fields").insert({ ...payload, project_id: id, posicao: insertionPosition(fields, fields.length) });
    setSaving(false);
    if (error) return toast.error(error.message);
    refresh(); setOpen(false); toast.success("Campo salvo");
  }

  async function move(field: CustomField, direction: number) {
    const index = fields.findIndex((f) => f.id === field.id);
    const target = fields[index + direction];
    if (!target) return;
    const ordered = reordered(fields, field.id, target.id);
    const posicao = insertionPosition(ordered.filter((f) => f.id !== field.id), index + direction);
    const { error } = await supabase.from("custom_fields").update({ posicao }).eq("id", field.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  if (board.project.isPending) return <div className="p-8 text-muted-foreground">Carregando configurações…</div>;
  if (!project) return <div className="p-8">Projeto não encontrado.</div>;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 md:px-6">
      <div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon" aria-label="Voltar ao quadro"><Link to="/p/$id" params={{ id }}><ArrowLeft /></Link></Button><div className="min-w-0"><h1 className="text-2xl font-bold">Configurações</h1><p className="break-words text-sm text-muted-foreground">{project.nome}</p></div></div>
      <section className="border-b pb-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Dados do projeto</h2><p className="mt-1 text-sm text-muted-foreground">{project.prefixo} · {project.descricao || "Sem descrição"}</p></div><Button variant="outline" onClick={() => setEditProject(true)}><Pencil /> Editar</Button></div></section>
      <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Campos personalizados</h2><Button onClick={() => edit(null)}><Plus /> Novo campo</Button></div>
        {board.fields.isPending ? <p className="text-sm text-muted-foreground">Carregando campos…</p> : fields.length === 0 ? <p className="border-y py-10 text-center text-sm text-muted-foreground">Nenhum campo personalizado.</p> : <ul className="divide-y border-y">{fields.map((field, index) => <li key={field.id} className="flex flex-wrap items-center gap-2 py-4"><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{field.nome}{field.obrigatorio ? " *" : ""}</h3><p className="text-xs text-muted-foreground">{FIELD_TIPOS[field.tipo]}{field.tipo === "lista" ? ` · ${field.opcoes.length} opções` : ""}</p></div><Button size="icon" variant="ghost" aria-label={`Mover ${field.nome} para cima`} disabled={index === 0} onClick={() => move(field, -1)}><ArrowUp /></Button><Button size="icon" variant="ghost" aria-label={`Mover ${field.nome} para baixo`} disabled={index === fields.length - 1} onClick={() => move(field, 1)}><ArrowDown /></Button><Button size="icon" variant="ghost" aria-label={`Editar ${field.nome}`} onClick={() => edit(field)}><Pencil /></Button><Button size="icon" variant="ghost" className="text-destructive" aria-label={`Excluir ${field.nome}`} onClick={async () => { if (!confirm("Excluir este campo e seus valores nas tarefas?")) return; const { error } = await supabase.from("custom_fields").delete().eq("id", field.id); if (error) return toast.error(error.message); refresh(); }}><Trash2 /></Button></li>)}</ul>}
      </section>
      <ProjectDialog open={editProject} onOpenChange={setEditProject} project={project} />
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar campo" : "Novo campo"}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4"><div className="space-y-1.5"><Label htmlFor="field-name">Nome do campo</Label><Input id="field-name" value={nome} onChange={(e) => setNome(e.target.value)} required /></div><div className="space-y-1.5"><Label>Tipo</Label><Select value={tipo} onValueChange={(v) => setTipo(v as FieldTipo)}><SelectTrigger aria-label="Tipo do campo"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(FIELD_TIPOS) as FieldTipo[]).map((t) => <SelectItem key={t} value={t}>{FIELD_TIPOS[t]}</SelectItem>)}</SelectContent></Select></div>{tipo === "lista" && <div className="space-y-1.5"><Label htmlFor="field-options">Opções (uma por linha)</Label><Textarea id="field-options" value={options} onChange={(e) => setOptions(e.target.value)} required /></div>}<label className="flex items-center gap-2 text-sm"><Checkbox checked={required} onCheckedChange={(v) => setRequired(v === true)} />Campo obrigatório</label><DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar campo"}</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}