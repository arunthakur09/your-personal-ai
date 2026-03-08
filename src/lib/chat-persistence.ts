import type { ChatMessage } from "@/lib/jarvis-stream";

const CONVERSATIONS_KEY = "jarvis_conversations";
const MESSAGES_KEY = "jarvis_messages";

interface StoredConversation {
  id: string;
  title: string;
  updated_at: string;
}

function getConversations(): StoredConversation[] {
  try {
    return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || "[]");
  } catch { return []; }
}

function setConversations(convs: StoredConversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
}

function getMessages(conversationId: string): ChatMessage[] {
  try {
    const all = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "{}");
    return all[conversationId] || [];
  } catch { return []; }
}

function setMessagesForConv(conversationId: string, msgs: ChatMessage[]) {
  const all = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "{}");
  all[conversationId] = msgs;
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
}

export async function createConversation(title?: string): Promise<string> {
  const id = crypto.randomUUID();
  const convs = getConversations();
  convs.unshift({ id, title: title || "New Conversation", updated_at: new Date().toISOString() });
  setConversations(convs);
  return id;
}

export async function loadConversations(): Promise<StoredConversation[]> {
  return getConversations().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 20);
}

export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  return getMessages(conversationId);
}

export async function saveMessage(conversationId: string, role: string, content: string) {
  const msgs = getMessages(conversationId);
  msgs.push({ role: role as "user" | "assistant", content });
  setMessagesForConv(conversationId, msgs);

  const convs = getConversations();
  const conv = convs.find(c => c.id === conversationId);
  if (conv) {
    conv.updated_at = new Date().toISOString();
    // Update title from first user message
    if (role === "user" && msgs.filter(m => m.role === "user").length === 1) {
      conv.title = content.slice(0, 60);
    }
    setConversations(convs);
  }
}

export async function deleteConversation(id: string) {
  setConversations(getConversations().filter(c => c.id !== id));
  const all = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "{}");
  delete all[id];
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
}
