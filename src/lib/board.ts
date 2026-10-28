import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Column = T["columns"]["Row"];
export type Tag = T["tags"]["Row"];
export type CustomField = Omit<T["custom_fields"]["Row"], "opcoes"> & { opcoes: string[] };
export type Task = T["tasks"]["Row"] & { task_assignees: { user_id: string }[]; task_tags: { tag_id: string }[] };

export function useBoard(projectId: string) {
  const qc = useQueryClient();
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });
  const columns = useQuery({
    queryKey: ["columns", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("columns").select("*").eq("project_id", projectId).order("posicao");
      if (error) throw error;
      return data;
    },
  });
  const tasks = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_assignees(user_id), task_tags(tag_id)")
        .eq("project_id", projectId)
        .order("posicao");
      if (error) throw error;
      return data as Task[];
    },
  });
  const tags = useTags(projectId);
  const fields = useFields(projectId);

  useEffect(() => {
    const inv = () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["columns", projectId] });
      qc.invalidateQueries({ queryKey: ["tags", projectId] });
      qc.invalidateQueries({ queryKey: ["fields", projectId] });
      qc.invalidateQueries({ queryKey: ["task-extras"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    };
    const ch = supabase
      .channel(`board-${projectId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "columns", filter: `project_id=eq.${projectId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_tags" }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_custom_values" }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "tags", filter: `project_id=eq.${projectId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_fields", filter: `project_id=eq.${projectId}` }, inv)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, qc]);

  return { project, columns, tasks, tags, fields };
}

export function useTags(projectId: string) {
  return useQuery({
    queryKey: ["tags", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").eq("project_id", projectId).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFields(projectId: string) {
  return useQuery({
    queryKey: ["fields", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_fields").select("*").eq("project_id", projectId).order("posicao");
      if (error) throw error;
      return (data ?? []).map((f) => ({ ...f, opcoes: Array.isArray(f.opcoes) ? (f.opcoes as string[]) : [] })) as CustomField[];
    },
  });
}
