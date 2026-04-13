
-- Table to store configurable duplication threshold ranges
CREATE TABLE public.duplication_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL UNIQUE,
  min_score integer NOT NULL,
  max_score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_scores CHECK (min_score >= 0 AND max_score <= 100 AND min_score <= max_score)
);

-- Enable RLS
ALTER TABLE public.duplication_thresholds ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage
CREATE POLICY "Super admins can manage thresholds"
ON public.duplication_thresholds
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- All authenticated users can read (needed by edge function via service key, and UI display)
CREATE POLICY "Authenticated users can view thresholds"
ON public.duplication_thresholds
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_duplication_thresholds_updated_at
BEFORE UPDATE ON public.duplication_thresholds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default values
INSERT INTO public.duplication_thresholds (level, min_score, max_score) VALUES
  ('high', 70, 100),
  ('possible', 35, 69),
  ('low', 0, 34);
