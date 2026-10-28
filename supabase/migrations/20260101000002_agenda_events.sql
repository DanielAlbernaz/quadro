CREATE TABLE public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  data date NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO authenticated;
GRANT ALL ON public.agenda_events TO service_role;
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all" ON public.agenda_events FOR ALL TO authenticated USING (public.is_member(auth.uid())) WITH CHECK (public.is_member(auth.uid()));