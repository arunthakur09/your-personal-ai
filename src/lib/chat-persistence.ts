import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/lib/jarvis-stream";

export async function createConversation(title?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: title || "New Conversation", user_id: user.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function loadConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data as { id: string; title: string; updated_at: string }[];
}

export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as ChatMessage[];
}

export async function saveMessage(conversationId: string, role: string, content: string) {
  const { error } = await supabase
    .from("chat_messages")
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw error;

  if (role === "user") {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .limit(2);
    if (msgs && msgs.length === 1) {
      await supabase
        .from("conversations")
        .update({ title: content.slice(0, 60) })
        .eq("id", conversationId);
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
  }
}

export async function deleteConversation(id: string) {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}
