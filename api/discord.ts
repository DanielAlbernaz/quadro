import { createClient } from "@supabase/supabase-js";

// Notifica o canal do Discord quando uma tarefa é criada ou muda de coluna.
// A URL do webhook fica só no servidor (DISCORD_WEBHOOK_URL); o usuário precisa estar logado
// e a tarefa é lida com o token dele, então só membros do workspace conseguem disparar.

const TIPOS: Record<string, string> = { bug: "🐞 Correção", melhoria: "🔧 Melhoria", feature: "✨ Nova funcionalidade" };
const PRIORIDADES: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "🔥 Urgente" };
const CORES = { created: 0x22c55e, moved: 0x3b82f6 } as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const data = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function formatValue(tipo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (tipo === "checkbox") return valor ? "Sim" : "Não";
  if (tipo === "data" && typeof valor === "string") return data(valor);
  return cut(String(valor), 200);
}

export async function POST(request: Request) {
  const webhook = process.env["DISCORD_WEBHOOK_URL"];
  const url = process.env["VITE_SUPABASE_URL"];
  const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!webhook || !url || !key) return json({ error: "Servidor não configurado" }, 500);

  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return json({ error: "Não autenticado" }, 401);

  let body: { taskId?: string; event?: string; from?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const { taskId, event, from } = body;
  if (!taskId || (event !== "created" && event !== "moved")) return json({ error: "Parâmetros inválidos" }, 400);

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: user } = await supabase.auth.getUser(token);
  if (!user.user) return json({ error: "Sessão inválida" }, 401);

  const { data: task, error } = await supabase
    .from("tasks")
    .select(
      "id, numero, titulo, descricao, tipo, prioridade, data_inicio, data_entrega, columns(nome), projects(nome, prefixo), task_assignees(user_id), task_tags(tags(nome)), task_custom_values(valor, custom_fields(nome, tipo, posicao))",
    )
    .eq("id", taskId)
    .single();
  if (error || !task) return json({ error: "Tarefa não encontrada" }, 404);

  const t = task as any;
  const assigneeIds: string[] = (t.task_assignees ?? []).map((a: { user_id: string }) => a.user_id);
  const profileIds = [...new Set([...assigneeIds, user.user.id])];
  const { data: profiles } = await supabase.from("profiles").select("id, nome").in("id", profileIds);
  const nome = (id: string) => profiles?.find((p) => p.id === id)?.nome || "Alguém";

  const coluna: string = t.columns?.nome ?? "—";
  const tags: string[] = (t.task_tags ?? []).map((x: any) => x.tags?.nome).filter(Boolean);
  const custom = [...(t.task_custom_values ?? [])]
    .filter((v: any) => v.custom_fields)
    .sort((a: any, b: any) => a.custom_fields.posicao - b.custom_fields.posicao);

  const fields = [
    { name: "Coluna", value: event === "moved" && from ? `${from} → **${coluna}**` : coluna, inline: true },
    { name: "Tipo", value: TIPOS[t.tipo] ?? t.tipo, inline: true },
    { name: "Prioridade", value: PRIORIDADES[t.prioridade] ?? t.prioridade, inline: true },
    { name: "Início", value: data(t.data_inicio), inline: true },
    { name: "Entrega", value: data(t.data_entrega), inline: true },
    { name: "Responsáveis", value: assigneeIds.length ? assigneeIds.map(nome).join(", ") : "—", inline: true },
    ...(tags.length ? [{ name: "Tags", value: tags.join(", "), inline: false }] : []),
    ...custom.map((v: any) => ({
      name: cut(v.custom_fields.nome, 256),
      value: formatValue(v.custom_fields.tipo, v.valor),
      inline: true,
    })),
  ].slice(0, 25);

  const codigo = `${t.projects?.prefixo ?? ""}-${t.numero}`;
  const origin = new URL(request.url).origin;
  const acao = event === "created" ? "criou" : "moveu";

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "Albertech Studios",
      avatar_url: `${origin}/albertech-logo.webp`,
      content: "@everyone",
      allowed_mentions: { parse: ["everyone"] },
      embeds: [
        {
          title: cut(`${codigo} · ${t.titulo}`, 256),
          description: cut(t.descricao || "*Sem descrição*", 2000),
          color: CORES[event],
          fields,
          footer: { text: `${nome(user.user.id)} ${acao} esta tarefa · ${t.projects?.nome ?? ""}` },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  if (!res.ok) return json({ error: "Discord recusou", status: res.status }, 502);
  return json({ ok: true });
}
