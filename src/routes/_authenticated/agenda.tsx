import { createFileRoute } from "@tanstack/react-router";
import { CalendarView } from "@/components/board/CalendarView";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Quadro" },
      { name: "description", content: "Agenda da equipe, de todos os projetos ou de um só." },
    ],
  }),
  component: () => (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
      <CalendarView />
    </div>
  ),
});
