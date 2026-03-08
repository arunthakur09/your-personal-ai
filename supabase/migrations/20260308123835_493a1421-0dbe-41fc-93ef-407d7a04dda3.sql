-- Add user_id to conversations
ALTER TABLE public.conversations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create tasks table for daily planner
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_tasks_user ON public.tasks(user_id);
CREATE INDEX idx_tasks_due ON public.tasks(due_date);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drop old permissive policies on conversations and chat_messages
DROP POLICY IF EXISTS "Allow all access to conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow all access to chat_messages" ON public.chat_messages;

-- New user-scoped policies for conversations
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- User-scoped policies for chat_messages (via conversation ownership)
CREATE POLICY "Users can view own chat messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = chat_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own chat messages" ON public.chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = chat_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own chat messages" ON public.chat_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = chat_messages.conversation_id AND user_id = auth.uid())
);