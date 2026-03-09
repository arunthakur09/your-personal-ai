
-- AI Skills: custom commands/abilities Jarvis learns
CREATE TABLE public.ai_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_pattern TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'prompt',
  action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills" ON public.ai_skills FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skills" ON public.ai_skills FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skills" ON public.ai_skills FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own skills" ON public.ai_skills FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AI Memory: learning and preferences storage
CREATE TABLE public.ai_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'preference',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  source TEXT DEFAULT 'conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory" ON public.ai_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memory" ON public.ai_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memory" ON public.ai_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memory" ON public.ai_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AI Improvements: proposed changes with sandbox status
CREATE TABLE public.ai_improvements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  sandbox_result JSONB,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own improvements" ON public.ai_improvements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own improvements" ON public.ai_improvements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own improvements" ON public.ai_improvements FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own improvements" ON public.ai_improvements FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add update trigger for updated_at
CREATE TRIGGER update_ai_skills_updated_at BEFORE UPDATE ON public.ai_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_memory_updated_at BEFORE UPDATE ON public.ai_memory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_improvements_updated_at BEFORE UPDATE ON public.ai_improvements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
