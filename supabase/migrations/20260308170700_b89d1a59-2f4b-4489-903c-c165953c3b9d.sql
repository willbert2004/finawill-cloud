
CREATE TABLE public.phase_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  default_duration_days integer NOT NULL DEFAULT 14,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage phase templates" ON public.phase_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'admin'));

CREATE POLICY "All authenticated users can view templates" ON public.phase_templates
  FOR SELECT TO authenticated
  USING (true);
