import { supabase } from "@/integrations/supabase/client";

/** Avisa o Discord (via /api/discord) que uma tarefa foi criada ou mudou de coluna. Nunca lança erro. */
export async function notifyDiscord(taskId: string, event: "created" | "moved", from?: string) {
  await send({ taskId, event, from });
}

/** Avisa o Discord que um evento da agenda foi criado ou editado. */
export async function notifyDiscordAgenda(agendaId: string, event: "created" | "updated") {
  await send({ agendaId, event });
}

async function send(payload: Record<string, unknown>) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/discord", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    // o aviso no Discord é opcional; falhar não deve atrapalhar o quadro
  }
}
