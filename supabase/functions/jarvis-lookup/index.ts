import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, query } = await req.json();

    if (type === "weather") {
      // Use wttr.in free API (no key needed)
      const city = query || "London";
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!res.ok) throw new Error("Weather fetch failed");
      const data = await res.json();
      const current = data.current_condition?.[0];
      const area = data.nearest_area?.[0];
      
      const result = {
        location: area?.areaName?.[0]?.value || city,
        country: area?.country?.[0]?.value || "",
        temp_c: current?.temp_C,
        temp_f: current?.temp_F,
        condition: current?.weatherDesc?.[0]?.value,
        humidity: current?.humidity,
        wind_kmph: current?.windspeedKmph,
        feels_like_c: current?.FeelsLikeC,
      };

      return new Response(JSON.stringify({ type: "weather", data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "news") {
      // Use a free RSS-to-JSON approach via Google News RSS
      const topic = query || "technology";
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(rssUrl);
      const xml = await res.text();
      
      // Simple XML parsing for titles and links
      const items: { title: string; link: string; pubDate: string }[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
        const itemXml = match[1];
        const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
        const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
        const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
        items.push({ title, link, pubDate });
      }

      return new Response(JSON.stringify({ type: "news", data: { topic, articles: items } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown type. Use 'weather' or 'news'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
