import { createClient } from "@supabase/supabase-js";

// Notifica o canal do Discord quando uma tarefa é criada/muda de coluna ou um evento da agenda é criado/editado.
// A URL do webhook fica só no servidor (DISCORD_WEBHOOK_URL); o usuário precisa estar logado
// e a tarefa é lida com o token dele, então só membros do workspace conseguem disparar.

const TIPOS: Record<string, string> = { bug: "🐞 Correção", melhoria: "🔧 Melhoria", feature: "✨ Nova funcionalidade" };
const PRIORIDADES: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "🔥 Urgente" };
const CORES = { created: 0x22c55e, moved: 0x3b82f6 } as const;
const COR_AGENDA = 0xf39c12;
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

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

  let body: { taskId?: string; agendaId?: string; event?: string; from?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const { taskId, agendaId, event, from } = body;
  const agenda = !!agendaId && (event === "created" || event === "updated");
  if (!agenda && (!taskId || (event !== "created" && event !== "moved"))) return json({ error: "Parâmetros inválidos" }, 400);

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: user } = await supabase.auth.getUser(token);
  if (!user.user) return json({ error: "Sessão inválida" }, 401);

  const post = async (embed: unknown) => {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "Albertech Studios",
        avatar_url: `${new URL(request.url).origin}/albertech-logo.webp`,
        content: "@everyone",
        allowed_mentions: { parse: ["everyone"] },
        embeds: [embed],
      }),
    });
    return res.ok ? json({ ok: true }) : json({ error: "Discord recusou", status: res.status }, 502);
  };

  if (agenda) {
    const { data: ev, error: evError } = await supabase
      .from("agenda_events")
      .select("id, titulo, descricao, data, created_by, projects(nome)")
      .eq("id", agendaId)
      .single();
    if (evError || !ev) return json({ error: "Evento não encontrado" }, 404);
    const { data: autor } = await supabase.from("profiles").select("nome").eq("id", user.user.id).maybeSingle();
    const dia = new Date(`${ev.data}T12:00:00`).getDay();
    return post({
      title: cut(`📅 ${ev.titulo}`, 256),
      description: cut(ev.descricao || "*Sem descrição*", 2000),
      color: COR_AGENDA,
      fields: [
        { name: "Data", value: `${data(ev.data)} (${DIAS[dia]})`, inline: true },
        { name: "Projeto", value: (ev as any).projects?.nome ?? "—", inline: true },
      ],
      footer: { text: `${autor?.nome || "Alguém"} ${event === "created" ? "criou este evento na agenda" : "atualizou este evento da agenda"}` },
      timestamp: new Date().toISOString(),
    });
  }

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
  const acao = event === "created" ? "criou" : "moveu";

  return post({
    title: cut(`${codigo} · ${t.titulo}`, 256),
    description: cut(t.descricao || "*Sem descrição*", 2000),
    color: CORES[event as "created" | "moved"],
    fields,
    footer: { text: `${nome(user.user.id)} ${acao} esta tarefa · ${t.projects?.nome ?? ""}` },
    timestamp: new Date().toISOString(),
  });
}
