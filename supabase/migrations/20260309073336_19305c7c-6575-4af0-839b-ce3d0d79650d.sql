
-- App configuration table (single row per user, stores current config)
CREATE TABLE public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  greeting text NOT NULL DEFAULT 'Good day, {name}.',
  subtitle text NOT NULL DEFAULT 'I''m at your service. Type a message or tap the microphone to speak.',
  quick_buttons jsonb NOT NULL DEFAULT '["What''s the weather in Chandigarh?","News about AI","Help me plan my day","Explain quantum computing"]'::jsonb,
  header_title text NOT NULL DEFAULT 'J.A.R.V.I.S.',
  header_subtitle text NOT NULL DEFAULT 'Just A Rather Very Intelligent System',
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Version history table for rollback
CREATE TABLE public.app_config_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES public.app_config(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  greeting text NOT NULL,
  subtitle text NOT NULL,
  quick_buttons jsonb NOT NULL,
  header_title text NOT NULL,
  header_subtitle text NOT NULL,
  version integer NOT NULL,
  change_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config_history ENABLE ROW LEVEL SECURITY;

-- Admin can read/write their own config
CREATE POLICY "Users can read own config" ON public.app_config FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own config" ON public.app_config FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own config" ON public.app_config FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Anyone authenticated can read config (so all users see admin's customizations)
-- We'll use a specific admin user_id approach - admin sets config, all users read it
CREATE POLICY "Anyone can read any config" ON public.app_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read own history" ON public.app_config_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.app_config_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
