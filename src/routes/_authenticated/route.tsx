import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LayoutGrid, LogOut, Moon, Sun, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { useMembers, useMe } from "@/lib/data";
import { getTheme, setTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated")({

  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

function Layout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: isMember, isLoading } = useQuery({
    queryKey: ["membership"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("claim_invite");
      if (error) throw error;
      return !!data;
    },
  });
  const { data: me } = useMe();
  const { data: members } = useMembers();
  const myProfile = members?.find((m) => m.id === me?.id);
  const [tema, setTema] = useState<"dark" | "light">("dark");
  useEffect(() => setTema(getTheme()), []);

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/85 px-4 backdrop-blur md:px-6">
        <Link to="/projetos" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold">Quadro</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/projetos" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground bg-secondary" }}>
            Projetos
          </Link>
          <Link to="/agenda" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground bg-secondary" }}>
            <CalendarDays className="mr-1 inline h-4 w-4" />
            Agenda
          </Link>
          <Link to="/equipe" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground bg-secondary" }}>
            <Users className="mr-1 inline h-4 w-4" />
            Equipe
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar tema"
            onClick={() => {
              const t = tema === "dark" ? "light" : "dark";
              setTheme(t);
              setTema(t);
            }}
          >
            {tema === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Link to="/equipe">
            <UserAvatar member={myProfile} size={30} />
          </Link>
          <Button variant="ghost" size="icon" aria-label="Sair" onClick={sair}>
            <LogOut />
          </Button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Carregando…</div>
        ) : isMember ? (
          <Outlet />
        ) : (
          <div className="mx-auto mt-24 max-w-md rounded-xl border bg-card p-8 text-center">
            <h2 className="text-xl font-semibold">Aguardando convite</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua conta ainda não faz parte do workspace. Peça ao dono para convidar o e-mail <strong>{me?.email}</strong> e recarregue a página.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
