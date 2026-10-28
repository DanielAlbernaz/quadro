import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quadro — Gestão de tarefas da equipe" },
      { name: "description", content: "Quadros Kanban simples e rápidos para a equipe de jogos Roblox." },
      { property: "og:title", content: "Quadro — Gestão de tarefas da equipe" },
      { property: "og:description", content: "Quadros Kanban simples e rápidos para a equipe de jogos Roblox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/projetos" });
  },
});
