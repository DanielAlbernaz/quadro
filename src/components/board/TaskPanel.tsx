import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ArrowRight, Check, Plus, Trash2, Users, Tag as TagIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Column, CustomField, Tag, Task } from "@/lib/board";
import type { Member } from "@/lib/data";
import { PRIORIDADES, TAG_CORES, TIPOS, isOverdue, type Prioridade, type Tipo } from "@/lib/meta";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

type Props = {
  task: Task | null;
  prefixo: string;
  projectId: string;
  columns: Column[];
  members: Member[];
  tags: Tag[];
  fields: CustomField[];
  onClose: () => void;
};

export function TaskPanel({ task, prefixo, projectId, columns, members, tags, fields, onClose }: Props) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editDesc, setEditDesc] = useState(false);
  const [comentario, setComentario] = useState("");
  const [novaTag, setNovaTag] = useState("");

  useEffect(() => {
    setTitulo(task?.titulo ?? "");
    setDescricao(task?.descricao ?? "");
    setEditDesc(false);
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const taskId = task?.id;
  const extras = useQuery({
    queryKey: ["task-extras", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId) return { comments: [], activity: [], values: [] };
      const [c, a, v] = await Promise.all([
        supabase.from("comments").select("*").eq("task_id", taskId).order("created_at"),
        supabase.from("task_activity").select("*").eq("task_id", taskId).order("created_at", { ascending: false }),
        supabase.from("task_custom_values").select("*").eq("task_id", taskId),
      ]);
      if (c.error) throw c.error;
      if (a.error) throw a.error;
      if (v.error) throw v.error;
      return { comments: c.data ?? [], activity: a.data ?? [], values: v.data ?? [] };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks", projectId] });
  const refreshExtras = () => qc.invalidateQueries({ queryKey: ["task-extras", taskId] });

  async function update(patch: Partial<Task>) {
    if (!task) return;
    const { task_assignees, task_tags, ...clean } = patch as Task;
    void task_assignees; void task_tags;
    const { error } = await supabase.from("tasks").update(clean).eq("id", task.id);
    if (error) return toast.error(error.message);
    refresh();
    if ("column_id" in clean) refreshExtras();
  }

  async function toggleAssignee(uid: string) {
    if (!task) return;
    const has = task.task_assignees.some((a) => a.user_id === uid);
    const { error } = has ? await supabase.from("task_assignees").delete().eq("task_id", task.id).eq("user_id", uid)
      : await supabase.from("task_assignees").insert({ task_id: task.id, user_id: uid });
    if (error) return toast.error(error.message);
    refresh();
  }

  async function toggleTag(tagId: string) {
    if (!task) return;
    const has = task.task_tags.some((a) => a.tag_id === tagId);
    const { error } = has ? await supabase.from("task_tags").delete().eq("task_id", task.id).eq("tag_id", tagId)
      : await supabase.from("task_tags").insert({ task_id: task.id, tag_id: tagId });
    if (error) return toast.error(error.message);
    refresh();
  }

  async function criarTag() {
    if (!task || !novaTag.trim()) return;
    const cor = TAG_CORES[tags.length % TAG_CORES.length] ?? "#64748b";
    const { data, error } = await supabase.from("tags").insert({ project_id: projectId, nome: novaTag.trim(), cor }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("task_tags").insert({ task_id: task.id, tag_id: data.id });
    setNovaTag("");
    qc.invalidateQueries({ queryKey: ["tags", projectId] });
    refresh();
  }

  async function setValor(fieldId: string, valor: unknown) {
    if (!task) return;
    const { error } = await supabase.from("task_custom_values").upsert({ task_id: task.id, field_id: fieldId, valor: valor as never });
    if (error) return toast.error(error.message);
    refreshExtras();
  }

  async function comentar(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !comentario.trim()) return;
    const { error } = await supabase.from("comments").insert({ task_id: task.id, texto: comentario.trim() });
    if (error) return toast.error(error.message);
    setComentario("");
    refreshExtras();
  }

  async function excluir() {
    if (!task || !confirm("Excluir esta tarefa?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return toast.error(error.message);
    refresh();
    onClose();
  }

  const assignees = members.filter((m) => task?.task_assignees.some((a) => a.user_id === m.id));
  const memberById = (id: string | null) => members.find((m) => m.id === id);

  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {task && (
          <div className="space-y-6">
            <SheetHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-muted-foreground">{prefixo}-{task.numero}</span>
              </div>
              <SheetTitle className="sr-only">{task.titulo}</SheetTitle>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={() => titulo.trim() && titulo !== task.titulo && update({ titulo: titulo.trim() })}
                className="h-auto border-transparent px-1 font-display text-xl font-semibold shadow-none hover:border-input"
              />
            </SheetHeader>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Coluna">
                <Select value={task.column_id} onValueChange={(v) => update({ column_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Tipo">
                <Select value={task.tipo} onValueChange={(v) => update({ tipo: v as Tipo })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPOS) as Tipo[]).map((k) => {
                      const I = TIPOS[k].icon;
                      return <SelectItem key={k} value={k}><span className={cn("flex items-center gap-2", TIPOS[k].text)}><I className="h-4 w-4" />{TIPOS[k].label}</span></SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Prioridade">
                <Select value={task.prioridade} onValueChange={(v) => update({ prioridade: v as Prioridade })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORIDADES) as Prioridade[]).map((k) => <SelectItem key={k} value={k}><span className={PRIORIDADES[k].text}>{PRIORIDADES[k].label}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Responsáveis">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {assignees.length ? (
                        <span className="flex items-center gap-1.5 truncate">{assignees.slice(0, 3).map((m) => <UserAvatar key={m.id} member={m} size={20} />)}<span className="truncate">{assignees.map((a) => a.nome.split(" ")[0]).join(", ")}</span></span>
                      ) : <span className="flex items-center gap-2 text-muted-foreground"><Users /> Ninguém</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-1">
                    {members.map((m) => {
                      const on = task.task_assignees.some((a) => a.user_id === m.id);
                      return (
                        <Button variant="ghost" key={m.id} onClick={() => toggleAssignee(m.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                          <UserAvatar member={m} size={22} /> <span className="flex-1 truncate text-left">{m.nome}</span> {on && <Check className="h-4 w-4 text-primary" />}
                        </Button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </Field>
              <Field label="Data de início">
                <Input type="date" value={task.data_inicio ?? ""} onChange={(e) => update({ data_inicio: e.target.value || null })} />
              </Field>
              <Field label="Data de entrega">
                <Input type="date" value={task.data_entrega ?? ""} onChange={(e) => update({ data_entrega: e.target.value || null })} className={cn(isOverdue(task.data_entrega) && "border-overdue text-overdue")} />
              </Field>
              <div className="col-span-2">
                <Field label="Etiquetas">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tags.filter((t) => task.task_tags.some((x) => x.tag_id === t.id)).map((t) => (
                      <span key={t.id} className="rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${t.cor}26`, color: t.cor }}>{t.nome}</span>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm"><TagIcon /> Etiquetas</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60 p-2">
                        <div className="max-h-48 overflow-y-auto">
                          {tags.map((t) => {
                            const on = task.task_tags.some((x) => x.tag_id === t.id);
                            return (
                              <Button variant="ghost" key={t.id} onClick={() => toggleTag(t.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.cor }} /> <span className="flex-1 text-left">{t.nome}</span> {on && <Check className="h-4 w-4 text-primary" />}
                              </Button>
                            );
                          })}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); criarTag(); }} className="mt-2 flex gap-1">
                          <Input className="h-8" placeholder="Nova etiqueta" value={novaTag} onChange={(e) => setNovaTag(e.target.value)} />
                          <Button size="sm" type="submit" aria-label="Criar etiqueta"><Plus /></Button>
                        </form>
                      </PopoverContent>
                    </Popover>
                  </div>
                </Field>
              </div>
            </div>

            {fields.length > 0 && (
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 text-sm font-semibold">Campos do projeto</h4>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <CustomFieldInput key={f.id} field={f} value={extras.data?.values.find((v) => v.field_id === f.id)?.valor} onChange={(v) => setValor(f.id, v)} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Descrição</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (editDesc && descricao !== task.descricao) update({ descricao });
                    setEditDesc(!editDesc);
                  }}
                >
                  {editDesc ? "Salvar" : "Editar"}
                </Button>
              </div>
              {editDesc ? (
                <Textarea rows={8} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Use **negrito**, listas com -, `código`…" />
              ) : (
                <div className="prose-task min-h-12 rounded-md bg-muted/50 p-3" onDoubleClick={() => setEditDesc(true)}>
                  {task.descricao ? <ReactMarkdown>{task.descricao}</ReactMarkdown> : <p className="text-muted-foreground">Sem descrição.</p>}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Comentários</h4>
              <div className="space-y-3">
                {extras.data?.comments.map((c) => {
                  const a = memberById(c.user_id);
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <UserAvatar member={a} size={28} />
                      <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-xs"><span className="font-semibold">{a?.nome ?? "Alguém"}</span> <span className="text-muted-foreground">· {new Date(c.created_at).toLocaleString("pt-BR")}</span></p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.texto}</p>
                      </div>
                    </div>
                  );
                })}
                <form onSubmit={comentar} className="flex gap-2">
                  <Input placeholder="Escreva um comentário…" value={comentario} onChange={(e) => setComentario(e.target.value)} />
                  <Button type="submit">Enviar</Button>
                </form>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Histórico</h4>
              {extras.data?.activity.length ? (
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {extras.data.activity.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-1">
                      <span className="font-medium text-foreground">{memberById(a.user_id)?.nome ?? "Alguém"}</span> moveu de
                      <span className="rounded bg-secondary px-1.5">{a.de_coluna}</span><ArrowRight className="h-3 w-3" /><span className="rounded bg-secondary px-1.5">{a.para_coluna}</span>
                      <span>· {new Date(a.created_at).toLocaleString("pt-BR")}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted-foreground">Nenhuma movimentação ainda.</p>}
            </div>

            <div className="border-t pt-4">
              <Button variant="ghost" className="text-destructive" onClick={excluir}><Trash2 /> Excluir tarefa</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CustomFieldInput({ field, value, onChange }: { field: CustomField; value: unknown; onChange: (v: unknown) => void }) {
  const [local, setLocal] = useState<string>(value == null ? "" : String(value));
  useEffect(() => setLocal(value == null ? "" : String(value)), [value]);
  const label = `${field.nome}${field.obrigatorio ? " *" : ""}`;
  const missing = field.obrigatorio && (value == null || value === "");
  const cls = cn(missing && "border-prio-alta");
  if (field.tipo === "checkbox")
    return (
      <label className="flex items-center gap-2 pt-5 text-sm">
        <Checkbox checked={value === true} onCheckedChange={(c) => onChange(c === true)} /> {label}
      </label>
    );
  if (field.tipo === "lista")
    return (
      <Field label={label}>
        <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
          <SelectTrigger className={cls}><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{field.opcoes.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    );
  const type = field.tipo === "numero" ? "number" : field.tipo === "data" ? "date" : field.tipo === "link" ? "url" : "text";
  return (
    <Field label={label}>
      <div className="flex gap-1">
        <Input
          type={type}
          className={cls}
          value={local}
          placeholder={field.tipo === "link" ? "https://" : ""}
          onChange={(e) => {
            setLocal(e.target.value);
            if (type === "date") onChange(e.target.value || null);
          }}
          onBlur={() => {
            if (type === "date") return;
            const v = local === "" ? null : field.tipo === "numero" ? Number(local) : local;
            if (String(v ?? "") !== String(value ?? "")) onChange(v);
          }}
        />
        {field.tipo === "link" && typeof value === "string" && value && (
          /^https?:\/\//i.test(value) && <Button variant="outline" size="icon" asChild><a href={value} target="_blank" rel="noreferrer" aria-label="Abrir link">↗</a></Button>
        )}
      </div>
    </Field>
  );
}
