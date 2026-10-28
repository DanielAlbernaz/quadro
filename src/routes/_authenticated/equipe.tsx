import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Copy, Crown, Mail, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { uploadImage, useMe, useMembers } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Quadro" },
      { name: "description", content: "Seu perfil, membros do workspace e convites." },
      { property: "og:title", content: "Equipe — Quadro" },
      { property: "og:description", content: "Seu perfil, membros do workspace e convites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Equipe,
});

function Equipe() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: members = [] } = useMembers();
  const mine = members.find((m) => m.id === me?.id);
  const isOwner = mine?.role === "owner";
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => setNome(mine?.nome ?? ""), [mine?.nome]);

  const { data: invites = [] } = useQuery({
    queryKey: ["invites"],
    enabled: isOwner,
    queryFn: async () => (await supabase.from("invites").select("*").order("created_at")).data ?? [],
  });

  async function saveProfile(patch: { nome?: string; avatar_url?: string }) {
    if (!me) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", me.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["members"] });
  }

  async function onAvatar(f?: File) {
    if (!f || !me) return;
    try {
      const path = await uploadImage(f, `avatars/${me.id}`);
      await saveProfile({ avatar_url: path });
    } catch {
      toast.error("Falha no upload");
    }
  }

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) return;
    if (members.some((m) => m.email?.toLowerCase() === em)) return toast.error("Essa pessoa já é membro");
    const { error } = await supabase.from("invites").insert({ email: em, invited_by: me?.id ?? null });
    if (error) return toast.error(error.message.includes("duplicate") ? "Convite já enviado" : error.message);
    setEmail("");
    toast.success("Convite criado. Envie o link de cadastro para a pessoa.");
    qc.invalidateQueries({ queryKey: ["invites"] });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 md:px-6">
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Meu perfil</h2>
        <div className="flex items-center gap-5">
          <label className="group relative cursor-pointer">
            <UserAvatar member={mine} size={72} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
          </label>
          <div className="flex flex-1 items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <Button onClick={() => saveProfile({ nome })}>Salvar</Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{me?.email}</p>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Membros ({members.length})</h2>
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <UserAvatar member={m} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              {m.role === "owner" ? (
                <span className="flex items-center gap-1 text-xs text-prio-alta"><Crown className="h-3.5 w-3.5" /> Dono</span>
              ) : isOwner ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover membro"
                  onClick={async () => {
                    if (!confirm(`Remover ${m.nome} do workspace?`)) return;
                    await supabase.from("workspace_members").delete().eq("user_id", m.id);
                    qc.invalidateQueries({ queryKey: ["members"] });
                  }}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Convidar membros</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Adicione o e-mail da pessoa. Nenhum e-mail é enviado: avise a pessoa para abrir o site, clicar em “Criar senha” e usar esse mesmo e-mail. Ela entra automaticamente no workspace.
          </p>
          <form onSubmit={convidar} className="flex gap-2">
            <Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit"><Mail /> Convidar</Button>
          </form>
          <Button
            variant="link"
            className="mt-2 px-0"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/auth`);
              toast.success("Link de cadastro copiado");
            }}
          >
            <Copy /> Copiar link de cadastro
          </Button>
          {invites.length > 0 && (
            <ul className="mt-3 space-y-1">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                  <span>{i.email} <span className="text-xs text-muted-foreground">· pendente</span></span>
                  <button
                    aria-label="Cancelar convite"
                    onClick={async () => {
                      await supabase.from("invites").delete().eq("id", i.id);
                      qc.invalidateQueries({ queryKey: ["invites"] });
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
