// App configuration backed by Supabase with version history and rollback
import { supabase } from "@/integrations/supabase/client";

export interface AppConfig {
  greeting: string;
  subtitle: string;
  quickButtons: string[];
  headerTitle: string;
  headerSubtitle: string;
}

const DEFAULT_CONFIG: AppConfig = {
  greeting: "Good day, {name}.",
  subtitle: "I'm at your service. Type a message or tap the microphone to speak.",
  quickButtons: [
    "What's the weather in Chandigarh?",
    "News about AI",
    "Help me plan my day",
    "Explain quantum computing",
  ],
  headerTitle: "J.A.R.V.I.S.",
  headerSubtitle: "Just A Rather Very Intelligent System",
};

// Local cache for sync access
let cachedConfig: AppConfig | null = null;
let cachedConfigId: string | null = null;

export function getAppConfig(): AppConfig {
  return cachedConfig ?? { ...DEFAULT_CONFIG };
}

// Load config from DB (call on app init)
export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const { data, error } = await supabase
      .from("app_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      cachedConfig = {
        greeting: data.greeting,
        subtitle: data.subtitle,
        quickButtons: data.quick_buttons as string[],
        headerTitle: data.header_title,
        headerSubtitle: data.header_subtitle,
      };
      cachedConfigId = data.id;
    } else {
      cachedConfig = { ...DEFAULT_CONFIG };
    }
  } catch (e) {
    console.error("Failed to load config:", e);
    cachedConfig = { ...DEFAULT_CONFIG };
  }
  window.dispatchEvent(new Event("config-updated"));
  return cachedConfig;
}

// Save a snapshot to history before making changes
async function saveToHistory(userId: string, config: AppConfig, version: number, description: string) {
  await supabase.from("app_config_history").insert({
    config_id: cachedConfigId!,
    user_id: userId,
    greeting: config.greeting,
    subtitle: config.subtitle,
    quick_buttons: config.quickButtons as unknown as any,
    header_title: config.headerTitle,
    header_subtitle: config.headerSubtitle,
    version,
    change_description: description,
  });
}

export async function updateAppConfig(partial: Partial<AppConfig>, userId?: string, description?: string): Promise<AppConfig> {
  const current = getAppConfig();
  const updated = { ...current, ...partial };

  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    if (!userId) throw new Error("Not authenticated");

    const { data: existing } = await supabase
      .from("app_config")
      .select("id, version")
      .eq("user_id", userId)
      .maybeSingle();

    const currentVersion = existing?.version ?? 0;
    const newVersion = currentVersion + 1;

    if (existing) {
      await saveToHistory(userId, current, currentVersion, description || "Config change");
    }

    const row = {
      user_id: userId,
      greeting: updated.greeting,
      subtitle: updated.subtitle,
      quick_buttons: updated.quickButtons as unknown as any,
      header_title: updated.headerTitle,
      header_subtitle: updated.headerSubtitle,
      version: newVersion,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("app_config").update(row).eq("id", existing.id);
      cachedConfigId = existing.id;
    } else {
      const { data } = await supabase.from("app_config").insert(row).select("id").single();
      cachedConfigId = data?.id ?? null;
    }

    cachedConfig = updated;
    window.dispatchEvent(new Event("config-updated"));
    return updated;
  } catch (e) {
    console.error("Failed to save config:", e);
    cachedConfig = updated;
    window.dispatchEvent(new Event("config-updated"));
    return updated;
  }
}

export async function resetAppConfig(userId?: string): Promise<AppConfig> {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    if (userId) {
      const { data: existing } = await supabase
        .from("app_config")
        .select("id, version")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const current = getAppConfig();
        await saveToHistory(userId, current, existing.version, "Reset to defaults");
        await supabase.from("app_config").delete().eq("id", existing.id);
      }
    }
  } catch (e) {
    console.error("Failed to reset config:", e);
  }
  cachedConfig = { ...DEFAULT_CONFIG };
  cachedConfigId = null;
  window.dispatchEvent(new Event("config-updated"));
  return cachedConfig;
}

export async function getConfigHistory(userId?: string): Promise<Array<{
  id: string;
  version: number;
  change_description: string | null;
  created_at: string;
}>> {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    if (!userId) return [];

    const { data, error } = await supabase
      .from("app_config_history")
      .select("id, version, change_description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("Failed to load history:", e);
    return [];
  }
}

export async function rollbackToVersion(historyId: string, userId?: string): Promise<AppConfig | null> {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    if (!userId) return null;

    const { data: entry, error } = await supabase
      .from("app_config_history")
      .select("*")
      .eq("id", historyId)
      .single();

    if (error || !entry) return null;

    const restored: AppConfig = {
      greeting: entry.greeting,
      subtitle: entry.subtitle,
      quickButtons: entry.quick_buttons as string[],
      headerTitle: entry.header_title,
      headerSubtitle: entry.header_subtitle,
    };

    return await updateAppConfig(restored, userId, `Rollback to v${entry.version}`);
  } catch (e) {
    console.error("Rollback failed:", e);
    return null;
  }
}

export async function undoLastChange(userId?: string): Promise<AppConfig | null> {
  const history = await getConfigHistory(userId);
  if (history.length === 0) return null;
  return rollbackToVersion(history[0].id, userId);
}

// Parse admin commands and return config changes + response
export function parseAdminCommand(text: string): { config: Partial<AppConfig>; response: string; description: string } | null {
  const lower = text.toLowerCase();

  let m = text.match(/(?:change|set|update)\s+(?:the\s+)?greeting\s+to\s+["""]?(.+?)["""]?\s*$/i);
  if (m) return { config: { greeting: m[1] }, response: `✅ Greeting updated to: **"${m[1]}"**\n\n_Version saved. Say "undo" to revert._`, description: `Greeting → "${m[1]}"` };

  m = text.match(/(?:change|set|update)\s+(?:the\s+)?subtitle\s+to\s+["""]?(.+?)["""]?\s*$/i);
  if (m) return { config: { subtitle: m[1] }, response: `✅ Subtitle updated to: **"${m[1]}"**\n\n_Version saved. Say "undo" to revert._`, description: `Subtitle → "${m[1]}"` };

  m = text.match(/(?:change|set|update)\s+(?:the\s+)?(?:header\s+)?title\s+to\s+["""]?(.+?)["""]?\s*$/i);
  if (m) return { config: { headerTitle: m[1] }, response: `✅ Header title updated to: **"${m[1]}"**\n\n_Version saved. Say "undo" to revert._`, description: `Title → "${m[1]}"` };

  m = text.match(/(?:change|set|update)\s+(?:the\s+)?header\s+subtitle\s+to\s+["""]?(.+?)["""]?\s*$/i);
  if (m) return { config: { headerSubtitle: m[1] }, response: `✅ Header subtitle updated to: **"${m[1]}"**\n\n_Version saved. Say "undo" to revert._`, description: `Header subtitle → "${m[1]}"` };

  m = text.match(/add\s+(?:a\s+)?(?:quick\s+)?button\s+["""]?(.+?)["""]?\s*$/i);
  if (m) {
    const config = getAppConfig();
    const buttons = [...config.quickButtons, m[1]];
    return { config: { quickButtons: buttons }, response: `✅ Quick button added: **"${m[1]}"**\n\n_Version saved. Say "undo" to revert._`, description: `Added button "${m[1]}"` };
  }

  m = text.match(/(?:remove|delete)\s+(?:the\s+)?(?:quick\s+)?button\s+["""]?(.+?)["""]?\s*$/i);
  if (m) {
    const config = getAppConfig();
    const query = m[1].toLowerCase();
    const buttons = config.quickButtons.filter(b => !b.toLowerCase().includes(query));
    return { config: { quickButtons: buttons }, response: `✅ Quick button matching **"${m[1]}"** removed.\n\n_Version saved. Say "undo" to revert._`, description: `Removed button "${m[1]}"` };
  }

  m = text.match(/(?:set|replace)\s+(?:the\s+)?(?:quick\s+)?buttons?\s+to\s+(.+)/i);
  if (m) {
    const buttons = m[1].split(/[,;]/).map(b => b.replace(/["""]/g, "").trim()).filter(Boolean);
    if (buttons.length > 0) {
      return { config: { quickButtons: buttons }, response: `✅ Quick buttons replaced.\n\n_Version saved. Say "undo" to revert._`, description: `Replaced buttons` };
    }
  }

  if (/^undo$/i.test(lower.trim()) || /undo\s+(?:last|that|the last)\s+(?:change|update|edit)/i.test(lower)) {
    return { config: {}, response: "__UNDO__", description: "" };
  }

  if (/(?:show|view|list)\s+(?:version|change)?\s*(?:history|versions|log)/i.test(lower)) {
    return { config: {}, response: "__HISTORY__", description: "" };
  }

  if (/reset\s+(?:all\s+)?(?:config|settings|everything|to\s+default)/i.test(lower)) {
    return { config: {}, response: "__RESET__", description: "Reset to defaults" };
  }

  if (/(?:show|what(?:'s| are| is)|list|current)\s+(?:the\s+)?(?:config|settings|configuration)/i.test(lower)) {
    const c = getAppConfig();
    const response = `## ⚙️ Current Configuration\n\n| Setting | Value |\n|---------|-------|\n| **Greeting** | ${c.greeting} |\n| **Subtitle** | ${c.subtitle} |\n| **Header Title** | ${c.headerTitle} |\n| **Header Subtitle** | ${c.headerSubtitle} |\n| **Quick Buttons** | ${c.quickButtons.join(", ")} |\n\n_Say "show history" to see past versions, or "undo" to revert._`;
    return { config: {}, response, description: "" };
  }

  return null;
}
