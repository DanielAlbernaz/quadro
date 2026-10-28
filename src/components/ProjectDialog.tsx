import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage, useImageUrl } from "@/lib/data";

export type ProjectRow = { id: string; nome: string; descricao: string; capa_url: string | null; prefixo: string; arquivado: boolean };

export function ProjectDialog({ open, onOpenChange, project }: { open: boolean; onOpenChange: (o: boolean) => void; project?: ProjectRow | null | undefined }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prefixo, setPrefixo] = useState("");
  const [capa, setCapa] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const capaUrl = useImageUrl(capa);

  useEffect(() => {
    if (open) {
      setNome(project?.nome ?? "");
      setDescricao(project?.descricao ?? "");
      setPrefixo(project?.prefixo ?? "");
      setCapa(project?.capa_url ?? null);
    }
  }, [open, project]);

  async function onFile(f?: File) {
    if (!f) return;
    try {
      setCapa(await uploadImage(f, "capas"));
    } catch (e) {
      toast.error("Falha no upload da imagem");
    }
  }

  async function save() {
    if (!nome.trim()) return toast.error("Informe o nome");
    const pre = (prefixo || nome.replace(/[^A-Za-z]/g, "").slice(0, 3)).toUpperCase().slice(0, 5) || "PRJ";
    setSaving(true);
    const payload = { nome: nome.trim(), descricao, prefixo: pre, capa_url: capa };
    const { error } = project
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(project ? "Projeto atualizado" : "Projeto criado");
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["project"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="relative flex aspect-[16/7] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted text-muted-foreground hover:bg-accent">
            {capaUrl ? <img src={capaUrl} alt="Capa" className="h-full w-full object-cover" /> : (
              <span className="flex flex-col items-center gap-1 text-sm"><ImagePlus className="h-6 w-6" />Foto de capa</span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ghost Hunter Kingdom" />
            </div>
            <div className="space-y-1.5">
              <Label>Prefixo</Label>
              <Input value={prefixo} onChange={(e) => setPrefixo(e.target.value.toUpperCase().slice(0, 5))} placeholder="GHK" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição curta</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
