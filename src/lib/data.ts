import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Member = { id: string; nome: string; email: string | null; avatar_url: string | null; role: "owner" | "member" };

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async (): Promise<Member[]> => {
      const [{ data: wm, error: e1 }, { data: profs, error: e2 }] = await Promise.all([
        supabase.from("workspace_members").select("user_id, role"),
        supabase.from("profiles").select("id, nome, email, avatar_url"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return (wm ?? [])
        .map((m) => {
          const p = profs?.find((x) => x.id === m.user_id);
          return { id: m.user_id, role: m.role, nome: p?.nome ?? "Membro", email: p?.email ?? null, avatar_url: p?.avatar_url ?? null };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
}

/** URLs assinadas para imagens no bucket privado. */
export function useImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["img", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data } = await supabase.storage.from("imagens").createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },
  }).data;
}

export async function uploadImage(file: File, folder: string) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("imagens").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}
