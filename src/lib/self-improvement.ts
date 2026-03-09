import { supabase } from "@/integrations/supabase/client";

export type AISkill = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  trigger_pattern: string;
  action_type: string;
  action_data: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AIMemory = {
  id: string;
  user_id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  created_at: string;
  updated_at: string;
};

export type AIImprovement = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  proposed_changes: Record<string, any>;
  status: string;
  sandbox_result: Record<string, any> | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
};

// Skills CRUD
export async function loadSkills(): Promise<AISkill[]> {
  const { data, error } = await supabase
    .from("ai_skills")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AISkill[];
}

export async function createSkill(skill: {
  name: string;
  description: string;
  trigger_pattern: string;
  action_type: string;
  action_data: Record<string, any>;
}): Promise<AISkill> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("ai_skills")
    .insert({ ...skill, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as AISkill;
}

export async function updateSkill(id: string, updates: Partial<AISkill>): Promise<void> {
  const { error } = await supabase.from("ai_skills").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteSkill(id: string): Promise<void> {
  const { error } = await supabase.from("ai_skills").delete().eq("id", id);
  if (error) throw error;
}

// Memory CRUD
export async function loadMemories(): Promise<AIMemory[]> {
  const { data, error } = await supabase
    .from("ai_memory")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AIMemory[];
}

export async function saveMemory(mem: {
  category: string;
  key: string;
  value: string;
  source?: string;
}): Promise<AIMemory> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Upsert by key
  const { data: existing } = await supabase
    .from("ai_memory")
    .select("id")
    .eq("user_id", user.id)
    .eq("key", mem.key)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("ai_memory")
      .update({ value: mem.value, category: mem.category, source: mem.source || "conversation" })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as AIMemory;
  }

  const { data, error } = await supabase
    .from("ai_memory")
    .insert({ ...mem, user_id: user.id, source: mem.source || "conversation" })
    .select()
    .single();
  if (error) throw error;
  return data as AIMemory;
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from("ai_memory").delete().eq("id", id);
  if (error) throw error;
}

// Improvements CRUD
export async function loadImprovements(): Promise<AIImprovement[]> {
  const { data, error } = await supabase
    .from("ai_improvements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AIImprovement[];
}

export async function proposeImprovement(imp: {
  type: string;
  title: string;
  description: string;
  proposed_changes: Record<string, any>;
}): Promise<AIImprovement> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("ai_improvements")
    .insert({ ...imp, user_id: user.id, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data as AIImprovement;
}

export async function sandboxTestImprovement(id: string): Promise<{ success: boolean; message: string }> {
  // Run sandbox validation via edge function
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: improvement } = await supabase
    .from("ai_improvements")
    .select("*")
    .eq("id", id)
    .single();
  if (!improvement) throw new Error("Improvement not found");

  const imp = improvement as AIImprovement;

  // Sandbox validation logic
  const result = validateImprovement(imp);

  await supabase
    .from("ai_improvements")
    .update({
      status: result.success ? "tested" : "failed",
      sandbox_result: result as any,
    })
    .eq("id", id);

  return result;
}

function validateImprovement(imp: AIImprovement): { success: boolean; message: string; details?: string } {
  // Safety checks
  const changes = imp.proposed_changes;

  // Check for dangerous patterns
  const dangerousPatterns = [
    /eval\s*\(/i,
    /Function\s*\(/i,
    /document\.write/i,
    /innerHTML\s*=/i,
    /<script/i,
  ];

  const changesStr = JSON.stringify(changes);
  for (const pattern of dangerousPatterns) {
    if (pattern.test(changesStr)) {
      return { success: false, message: "Blocked: contains potentially unsafe code patterns", details: `Pattern matched: ${pattern}` };
    }
  }

  // Validate by type
  switch (imp.type) {
    case "skill":
      if (!changes.name || !changes.trigger_pattern) {
        return { success: false, message: "Skill must have a name and trigger pattern" };
      }
      try {
        new RegExp(changes.trigger_pattern);
      } catch {
        return { success: false, message: "Invalid trigger pattern (must be valid regex)" };
      }
      return { success: true, message: "Skill validated successfully" };

    case "prompt":
      if (!changes.prompt_addition || changes.prompt_addition.length > 2000) {
        return { success: false, message: "Prompt addition must be between 1-2000 characters" };
      }
      return { success: true, message: "Prompt improvement validated" };

    case "memory":
      if (!changes.key || !changes.value) {
        return { success: false, message: "Memory entry must have key and value" };
      }
      return { success: true, message: "Memory entry validated" };

    case "workflow":
      if (!changes.name || !changes.steps || !Array.isArray(changes.steps)) {
        return { success: false, message: "Workflow must have name and steps array" };
      }
      return { success: true, message: "Workflow validated" };

    default:
      return { success: false, message: `Unknown improvement type: ${imp.type}` };
  }
}

export async function applyImprovement(id: string): Promise<string> {
  const { data: improvement } = await supabase
    .from("ai_improvements")
    .select("*")
    .eq("id", id)
    .single();
  if (!improvement) throw new Error("Improvement not found");

  const imp = improvement as AIImprovement;
  if (imp.status !== "tested") {
    throw new Error("Improvement must pass sandbox testing before applying");
  }

  const changes = imp.proposed_changes;

  switch (imp.type) {
    case "skill":
      await createSkill({
        name: changes.name,
        description: changes.description || imp.description,
        trigger_pattern: changes.trigger_pattern,
        action_type: changes.action_type || "prompt",
        action_data: changes.action_data || {},
      });
      break;

    case "memory":
      await saveMemory({
        category: changes.category || "learned",
        key: changes.key,
        value: changes.value,
        source: "self-improvement",
      });
      break;

    case "prompt":
      await saveMemory({
        category: "prompt_enhancement",
        key: `prompt_${Date.now()}`,
        value: changes.prompt_addition,
        source: "self-improvement",
      });
      break;

    case "workflow":
      await createSkill({
        name: changes.name,
        description: changes.description || imp.description,
        trigger_pattern: changes.trigger || changes.name.toLowerCase(),
        action_type: "workflow",
        action_data: { steps: changes.steps },
      });
      break;
  }

  await supabase
    .from("ai_improvements")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", id);

  return `✅ Improvement "${imp.title}" applied successfully.`;
}

export async function rejectImprovement(id: string): Promise<void> {
  await supabase
    .from("ai_improvements")
    .update({ status: "rejected" })
    .eq("id", id);
}

// Match user input against custom skills
export async function matchSkill(text: string): Promise<AISkill | null> {
  const skills = await loadSkills();
  for (const skill of skills) {
    if (!skill.is_active) continue;
    try {
      const regex = new RegExp(skill.trigger_pattern, "i");
      if (regex.test(text)) return skill;
    } catch {
      if (text.toLowerCase().includes(skill.trigger_pattern.toLowerCase())) return skill;
    }
  }
  return null;
}

// Build context from memory for AI prompts
export async function buildMemoryContext(): Promise<string> {
  const memories = await loadMemories();
  if (memories.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const mem of memories) {
    if (!grouped[mem.category]) grouped[mem.category] = [];
    grouped[mem.category].push(`${mem.key}: ${mem.value}`);
  }

  let context = "\n\n[User Memory & Preferences]\n";
  for (const [cat, entries] of Object.entries(grouped)) {
    context += `\n${cat}:\n${entries.map(e => `- ${e}`).join("\n")}`;
  }
  return context;
}

// Detect self-improvement commands in chat
export function detectSelfImprovementCommand(text: string): {
  type: "learn" | "add_skill" | "forget" | "show_skills" | "show_memory" | "improve" | null;
  data?: any;
} {
  const lower = text.toLowerCase();

  if (/^(?:learn|remember)\s+that\s+/i.test(text)) {
    const content = text.replace(/^(?:learn|remember)\s+that\s+/i, "").trim();
    return { type: "learn", data: { content } };
  }

  if (/^(?:add|create)\s+(?:a\s+)?skill\s+/i.test(text)) {
    const content = text.replace(/^(?:add|create)\s+(?:a\s+)?skill\s+/i, "").trim();
    return { type: "add_skill", data: { content } };
  }

  if (/^forget\s+/i.test(text)) {
    const key = text.replace(/^forget\s+/i, "").trim();
    return { type: "forget", data: { key } };
  }

  if (/(?:show|list|view)\s+(?:my\s+)?(?:skills|abilities|capabilities)/i.test(lower)) {
    return { type: "show_skills" };
  }

  if (/(?:show|list|view)\s+(?:my\s+)?(?:memory|memories|what you (?:know|remember))/i.test(lower)) {
    return { type: "show_memory" };
  }

  if (/^(?:improve yourself|self.?improve|upgrade|evolve|enhance yourself)/i.test(lower)) {
    return { type: "improve" };
  }

  return { type: null };
}
