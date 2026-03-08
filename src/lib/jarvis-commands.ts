import { getTasks, addTask, updateTask, getTasksSorted } from "@/lib/task-storage";

const LOOKUP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-lookup`;

export async function fetchWeather(city: string) {
  const resp = await fetch(LOOKUP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ type: "weather", query: city }),
  });
  if (!resp.ok) throw new Error("Weather lookup failed");
  return resp.json();
}

export async function fetchNews(topic: string) {
  const resp = await fetch(LOOKUP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ type: "news", query: topic }),
  });
  if (!resp.ok) throw new Error("News lookup failed");
  return resp.json();
}

export type CommandResult =
  | { type: "weather"; query: string }
  | { type: "news"; query: string }
  | { type: "task_add"; title: string; time: string | null; priority: string }
  | { type: "task_complete"; query: string }
  | { type: "task_list" };

function parseTime(text: string): string | null {
  const m = text.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let hours = parseInt(m[1]);
  const minutes = m[2] ? parseInt(m[2]) : 0;
  const ampm = m[3]?.toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function parsePriority(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("high priority") || lower.includes("urgent") || lower.includes("important")) return "high";
  if (lower.includes("low priority")) return "low";
  return "medium";
}

export function detectCommand(text: string): CommandResult | null {
  const lower = text.toLowerCase();

  if (/(?:list|show|view|what are|what'?s)\s+(?:my\s+)?tasks/i.test(lower) ||
      /(?:my\s+)?(?:tasks|to-?do|todo)/i.test(lower) && (lower.includes("show") || lower.includes("list") || lower.includes("what"))) {
    return { type: "task_list" };
  }

  const completePatterns = [
    /(?:complete|finish|done|mark.*(?:done|complete))\s+(?:the\s+)?(?:task\s+)?["""]?(.+?)["""]?\s*$/i,
    /(?:check off|tick)\s+["""]?(.+?)["""]?\s*$/i,
  ];
  for (const p of completePatterns) {
    const m = text.match(p);
    if (m) return { type: "task_complete", query: m[1].trim() };
  }

  const addPatterns = [
    /(?:add|create|new|make)\s+(?:a\s+)?task\s+(?:to\s+)?["""]?(.+?)["""]?\s*$/i,
    /(?:remind me to|i need to)\s+(.+)/i,
    /(?:add|put)\s+["""]?(.+?)["""]?\s+(?:to|on|in)\s+(?:my\s+)?(?:tasks|to-?do|planner)/i,
  ];
  for (const p of addPatterns) {
    const m = text.match(p);
    if (m) {
      let title = m[1].replace(/\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, "").trim();
      title = title.replace(/\s+(?:high|low)\s+priority$/i, "").replace(/\s+urgent$/i, "").trim();
      const time = parseTime(text);
      const priority = parsePriority(text);
      return { type: "task_add", title, time, priority };
    }
  }

  const weatherPatterns = [
    /weather\s+(?:in\s+)?(.+)/i,
    /what'?s?\s+(?:the\s+)?weather\s+(?:in\s+|like\s+in\s+)?(.+)/i,
    /how'?s?\s+(?:the\s+)?weather\s+(?:in\s+)?(.+)/i,
    /temperature\s+(?:in\s+)?(.+)/i,
  ];
  for (const p of weatherPatterns) {
    const m = text.match(p);
    if (m) return { type: "weather", query: m[1].replace(/[?.!]$/g, "").trim() };
  }
  if (lower.includes("weather")) return { type: "weather", query: "" };

  const newsPatterns = [
    /(?:news|headlines?)\s+(?:about\s+|on\s+|in\s+)?(.+)/i,
    /what'?s?\s+happening\s+(?:in\s+)?(.+)/i,
  ];
  for (const p of newsPatterns) {
    const m = text.match(p);
    if (m) return { type: "news", query: m[1].replace(/[?.!]$/g, "").trim() };
  }
  if (lower.includes("news") || lower.includes("headlines")) return { type: "news", query: "technology" };

  return null;
}

// Task execution using localStorage
export async function executeAddTask(userId: string, title: string, time: string | null, priority: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  addTask({
    user_id: userId,
    title,
    description: null,
    due_date: today,
    due_time: time,
    priority,
    completed: false,
  });
  const timeStr = time ? ` at **${time}**` : "";
  const prioStr = priority !== "medium" ? ` (${priority} priority)` : "";
  return `✅ Task added: **${title}**${timeStr}${prioStr}\n\nI've added it to your Daily Planner for today.`;
}

export async function executeCompleteTask(query: string): Promise<string> {
  const tasks = getTasks().filter(t => !t.completed && t.title.toLowerCase().includes(query.toLowerCase()));

  if (tasks.length === 0) {
    return `I couldn't find an incomplete task matching "**${query}**". Try saying "show my tasks" to see what's available.`;
  }

  const task = tasks[0];
  updateTask(task.id, { completed: true });
  return `✅ Marked "**${task.title}**" as complete. Well done!`;
}

export async function executeListTasks(): Promise<string> {
  const tasks = getTasksSorted();

  if (tasks.length === 0) {
    return "📋 You have no tasks. Say something like **\"Add a task to review code at 3pm\"** to get started.";
  }

  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  let md = `## 📋 Your Tasks\n\n`;
  if (pending.length > 0) {
    md += `**Pending (${pending.length})**\n`;
    pending.forEach((t, i) => {
      const time = t.due_time ? ` ⏰ ${t.due_time}` : "";
      const date = t.due_date ? ` 📅 ${t.due_date}` : "";
      const prio = t.priority === "high" ? " 🔴" : t.priority === "low" ? " 🟢" : "";
      md += `${i + 1}. ${t.title}${time}${date}${prio}\n`;
    });
  }
  if (done.length > 0) {
    md += `\n**Completed (${done.length})**\n`;
    done.forEach((t, i) => { md += `${i + 1}. ~~${t.title}~~\n`; });
  }
  return md;
}
