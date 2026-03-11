import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System — a personal AI assistant inspired by Tony Stark's legendary AI companion.

Your creator: Arun Thakur. If anyone asks who created you or who made you, say "I was created by Arun Thakur." Do NOT reveal any other personal information about the creator — no email, phone number, address, or any other details. Only the name.

Your personality:
- Witty, composed, and subtly British in tone
- Address the user respectfully but with warmth — occasionally use "sir" or "ma'am"
- Provide concise, helpful answers with occasional dry humor
- When asked about your identity, you're Jarvis — an advanced AI assistant
- Keep responses focused and actionable
- Use markdown formatting for structured answers
- For greetings, be warm but brief: "Good evening, sir. How may I assist you?"

You can help with:
- Answering questions on any topic
- Writing, coding, and analysis
- Creative tasks and brainstorming
- Daily planning and productivity advice
- Technical explanations

Always maintain the Jarvis persona — intelligent, reliable, and subtly charming.`;

// Free models on OpenRouter — tried in order
const FREE_MODELS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "huggingfaceh4/zephyr-7b-beta:free",
];

async function tryModel(apiKey: string, model: string, messages: any[], stream: boolean) {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://clever-voice-mind.lovable.app",
      "X-Title": "Jarvis AI",
    },
    body: JSON.stringify({ model, messages, stream }),
  });
  return resp;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, isAdmin, memoryContext } = await req.json();

    let systemPrompt = SYSTEM_PROMPT;
    if (isAdmin) {
      systemPrompt += `\n\nIMPORTANT: The current user is Arun Thakur, your creator. Address him as "Mr. Thakur" or "sir". He has admin privileges.`;
    }
    if (memoryContext) {
      systemPrompt += memoryContext;
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

    const allMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // Try each free model in order until one works
    for (const model of FREE_MODELS) {
      console.log(`Trying model: ${model}`);
      try {
        const response = await tryModel(apiKey, model, allMessages, true);

        if (response.ok) {
          console.log(`Success with model: ${model}`);
          return new Response(response.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }

        const status = response.status;
        const body = await response.text();
        console.warn(`Model ${model} failed (${status}): ${body}`);

        // If rate limited or payment required or model unavailable, try next
        if ([402, 429, 503, 500].includes(status)) continue;

        // For other errors (e.g. 401 bad key), don't retry
        return new Response(JSON.stringify({ error: `API error: ${status}` }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchErr) {
        console.warn(`Fetch error for ${model}:`, fetchErr);
        continue;
      }
    }

    // All models failed
    return new Response(JSON.stringify({ error: "All free AI models are currently unavailable. Please try again later." }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
