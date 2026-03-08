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

export function detectCommand(text: string): { type: "weather" | "news"; query: string } | null {
  const lower = text.toLowerCase();

  // Weather detection
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

  // News detection
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
