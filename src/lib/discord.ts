import { supabase } from "@/integrations/supabase/client";

/** Avisa o Discord (via /api/discord) que uma tarefa foi criada ou mudou de coluna. Nunca lança erro. */
export async function notifyDiscord(taskId: string, event: "created" | "moved", from?: string) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/discord", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ taskId, event, from }),
    });
  } catch {
    // o aviso no Discord é opcional; falhar não deve atrapalhar o quadro
  }
}
