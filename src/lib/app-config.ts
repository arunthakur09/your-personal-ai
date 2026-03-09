// App configuration stored in localStorage, modifiable by admin via chat

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

const CONFIG_KEY = "jarvis-app-config";

export function getAppConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function updateAppConfig(partial: Partial<AppConfig>): AppConfig {
  const current = getAppConfig();
  const updated = { ...current, ...partial };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("config-updated"));
  return updated;
}

export function resetAppConfig(): AppConfig {
  localStorage.removeItem(CONFIG_KEY);
  window.dispatchEvent(new Event("config-updated"));
  return { ...DEFAULT_CONFIG };
}

// Parse admin commands and return config changes + response
export function parseAdminCommand(text: string): { config: Partial<AppConfig>; response: string } | null {
  const lower = text.toLowerCase();

  // Change greeting
  let m = text.match(/(?:change|set|update)\s+(?:the\s+)?greeting\s+to\s+["""]?(.+?)["""]?\s*$/i);
  if (m) return { config: { greeting: m[1] }, response: `✅ Greeting updated to: **"${m[1]}"**` };

  // Change subtitle
  m = text.match(/(?:change|set|update)\s+(?:the\s+)?subtitle\s+to\s+["""]?(.+?)["""]?\s*$/i);
  if (m) return { config: { subtitle: m[1] }, response: `✅ Subtitle updated to: **"${m[1]}"**` };

  // Change header title
  m = text.match(/(?:change|set|update)\s+(?:the\s+)?(?:header\s+)?title\s+to\s+["""]?(.+?)["""]?\s*$/i);
  if (m) return { config: { headerTitle: m[1] }, response: `✅ Header title updated to: **"${m[1]}"**` };

  // Change header subtitle
  m = text.match(/(?:change|set|update)\s+(?:the\s+)?header\s+subtitle\s+to\s+["""]?(.+?)["""]?\s*$/i);
  if (m) return { config: { headerSubtitle: m[1] }, response: `✅ Header subtitle updated to: **"${m[1]}"**` };

  // Add quick button
  m = text.match(/add\s+(?:a\s+)?(?:quick\s+)?button\s+["""]?(.+?)["""]?\s*$/i);
  if (m) {
    const config = getAppConfig();
    const buttons = [...config.quickButtons, m[1]];
    return { config: { quickButtons: buttons }, response: `✅ Quick button added: **"${m[1]}"**` };
  }

  // Remove quick button
  m = text.match(/(?:remove|delete)\s+(?:the\s+)?(?:quick\s+)?button\s+["""]?(.+?)["""]?\s*$/i);
  if (m) {
    const config = getAppConfig();
    const query = m[1].toLowerCase();
    const buttons = config.quickButtons.filter(b => !b.toLowerCase().includes(query));
    return { config: { quickButtons: buttons }, response: `✅ Quick button matching **"${m[1]}"** removed.` };
  }

  // Replace all quick buttons
  m = text.match(/(?:set|replace)\s+(?:the\s+)?(?:quick\s+)?buttons?\s+to\s+(.+)/i);
  if (m) {
    const buttons = m[1].split(/[,;]/).map(b => b.replace(/["""]/g, "").trim()).filter(Boolean);
    if (buttons.length > 0) {
      return { config: { quickButtons: buttons }, response: `✅ Quick buttons replaced with: ${buttons.map(b => `**"${b}"**`).join(", ")}` };
    }
  }

  // Reset config
  if (/reset\s+(?:all\s+)?(?:config|settings|everything|to\s+default)/i.test(lower)) {
    resetAppConfig();
    return { config: {}, response: "✅ All settings reset to defaults." };
  }

  // Show current config
  if (/(?:show|what(?:'s| are| is)|list|current)\s+(?:the\s+)?(?:config|settings|configuration)/i.test(lower)) {
    const c = getAppConfig();
    const response = `## ⚙️ Current Configuration\n\n| Setting | Value |\n|---------|-------|\n| **Greeting** | ${c.greeting} |\n| **Subtitle** | ${c.subtitle} |\n| **Header Title** | ${c.headerTitle} |\n| **Header Subtitle** | ${c.headerSubtitle} |\n| **Quick Buttons** | ${c.quickButtons.join(", ")} |`;
    return { config: {}, response };
  }

  return null;
}
