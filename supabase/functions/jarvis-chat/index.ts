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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, isAdmin, memoryContext } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    let systemPrompt = SYSTEM_PROMPT;
    if (isAdmin) {
      systemPrompt += `\n\nIMPORTANT: The current user is Arun Thakur, your creator. Address him as "Mr. Thakur" or "sir". He has admin privileges. He can instruct you to make changes to the app configuration. When he asks to change settings, guide him with commands like:
- "change greeting to ..."
- "change subtitle to ..."
- "change title to ..."
- "change header subtitle to ..."
- "add button ..."
- "remove button ..."
- "set buttons to ..., ..., ..."
- "show settings"
- "reset to default"
Be helpful and proactive about suggesting what he can customize.`;
    }

    // Using free models on OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://clever-voice-mind.lovable.app",
        "X-Title": "Jarvis AI Assistant",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3-8b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenRouter error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
