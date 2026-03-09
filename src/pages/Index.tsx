import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, PanelLeftOpen, PanelLeftClose, CalendarDays, LogOut, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { JarvisHeader } from "@/components/JarvisHeader";
import { JarvisOrb } from "@/components/JarvisOrb";
import { ChatMessage } from "@/components/ChatMessage";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { DailyPlanner } from "@/components/DailyPlanner";
import { useVoice, speak } from "@/hooks/use-voice";
import { useAuth } from "@/hooks/use-auth";
import { streamChat, type ChatMessage as ChatMsg } from "@/lib/jarvis-stream";
import { detectCommand, fetchWeather, fetchNews, executeAddTask, executeCompleteTask, executeListTasks } from "@/lib/jarvis-commands";
import {
  createConversation,
  loadConversations,
  loadMessages,
  saveMessage,
  deleteConversation,
} from "@/lib/chat-persistence";
import { getAppConfig, updateAppConfig, parseAdminCommand } from "@/lib/app-config";
import { toast } from "sonner";

const ADMIN_EMAIL = "arun8894194653@gmail.com";
const ADMIN_PASSCODE = "8894194653";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversations, setConversations] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [adminVerified, setAdminVerified] = useState(false);
  const [awaitingPasscode, setAwaitingPasscode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoice();
  const [appConfig, setAppConfig] = useState(getAppConfig());

  const isAdminUser = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const handler = () => setAppConfig(getAppConfig());
    window.addEventListener("config-updated", handler);
    return () => window.removeEventListener("config-updated", handler);
  }, []);

  useEffect(() => {
    if (user) loadConversations().then(setConversations).catch(console.error);
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!voice.isListening && voice.transcript) {
      sendMessage(voice.transcript);
    }
  }, [voice.isListening]);

  const refreshConversations = async () => {
    const convs = await loadConversations();
    setConversations(convs);
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConvId(id);
    const msgs = await loadMessages(id);
    setMessages(msgs);
  };

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
    await refreshConversations();
  };

  const formatWeatherResponse = (data: any) => {
    const d = data.data;
    return `## 🌤 Weather in ${d.location}${d.country ? `, ${d.country}` : ""}\n\n| Metric | Value |\n|--------|-------|\n| **Temperature** | ${d.temp_c}°C (${d.temp_f}°F) |\n| **Feels Like** | ${d.feels_like_c}°C |\n| **Condition** | ${d.condition} |\n| **Humidity** | ${d.humidity}% |\n| **Wind** | ${d.wind_kmph} km/h |`;
  };

  const formatNewsResponse = (data: any) => {
    const articles = data.data.articles;
    if (!articles.length) return "I couldn't find any recent news on that topic.";
    let md = `## 📰 Top Headlines: ${data.data.topic}\n\n`;
    articles.forEach((a: any, i: number) => { md += `${i + 1}. **${a.title}**\n`; });
    return md;
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;

    let convId = activeConvId;
    if (!convId) {
      convId = await createConversation(trimmed.slice(0, 60));
      setActiveConvId(convId);
    }

    const userMsg: ChatMsg = { role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);
    await saveMessage(convId, "user", trimmed);

    // Admin passcode flow
    if (awaitingPasscode) {
      if (trimmed === ADMIN_PASSCODE) {
        setAdminVerified(true);
        setAwaitingPasscode(false);
        const response = "🔓 Identity confirmed. Welcome back, Mr. Thakur. Admin privileges activated. You may now instruct me to make changes.";
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
        await saveMessage(convId, "assistant", response);
        speak("Identity confirmed. Welcome back, Mr. Thakur.");
      } else {
        setAwaitingPasscode(false);
        const response = "❌ Incorrect passcode. Admin access denied. You may continue using standard features.";
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
        await saveMessage(convId, "assistant", response);
        speak("Incorrect passcode. Access denied.");
      }
      setIsProcessing(false);
      await refreshConversations();
      return;
    }

    // Detect admin activation request
    if (isAdminUser && !adminVerified && /admin|make changes|creator mode|unlock/i.test(trimmed)) {
      setAwaitingPasscode(true);
      const response = "🔐 Admin access requested. Please provide your passcode to verify your identity.";
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      await saveMessage(convId, "assistant", response);
      speak("Please provide your passcode to verify your identity.");
      setIsProcessing(false);
      await refreshConversations();
      return;
    }

    // Admin config commands
    if (adminVerified) {
      const adminResult = parseAdminCommand(trimmed);
      if (adminResult) {
        if (Object.keys(adminResult.config).length > 0) {
          updateAppConfig(adminResult.config);
        }
        setMessages(prev => [...prev, { role: "assistant", content: adminResult.response }]);
        await saveMessage(convId, "assistant", adminResult.response);
        speak("Done, sir. Changes applied.");
        setIsProcessing(false);
        await refreshConversations();
        return;
      }
    }

    const cmd = detectCommand(trimmed);
    if (cmd) {
      try {
        let response: string;
        let voiceMsg: string;
        if (cmd.type === "weather") {
          const data = await fetchWeather(cmd.query || "London");
          response = formatWeatherResponse(data);
          voiceMsg = `Here's the weather for ${cmd.query || "your area"}.`;
        } else if (cmd.type === "news") {
          const data = await fetchNews(cmd.query);
          response = formatNewsResponse(data);
          voiceMsg = "Here are the latest headlines.";
        } else if (cmd.type === "task_add") {
          response = await executeAddTask(user!.id, cmd.title, cmd.time, cmd.priority);
          voiceMsg = `Task added: ${cmd.title}`;
        } else if (cmd.type === "task_complete") {
          response = await executeCompleteTask(cmd.query);
          voiceMsg = "Task marked as complete.";
        } else {
          response = await executeListTasks();
          voiceMsg = "Here are your tasks.";
        }
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
        await saveMessage(convId, "assistant", response);
        speak(voiceMsg);
        setIsProcessing(false);
        await refreshConversations();
        return;
      } catch (e) { console.error("Command failed:", e); }
    }

    let assistantText = "";
    const upsert = (chunk: string) => {
      assistantText += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
        return [...prev, { role: "assistant", content: assistantText }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        isAdmin: adminVerified,
        onDone: async () => {
          setIsProcessing(false);
          await saveMessage(convId!, "assistant", assistantText);
          await refreshConversations();
          if (assistantText.length < 500) speak(assistantText.replace(/[#*`_\[\]|]/g, "").replace(/\n/g, " ").slice(0, 300));
        },
      });
    } catch (e: any) {
      setIsProcessing(false);
      toast.error(e.message || "Failed to get response");
    }
  }, [messages, isProcessing, activeConvId]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleVoiceToggle = () => { voice.isListening ? voice.stopListening() : voice.startListening(); };

  return (
    <div className="flex h-screen bg-background jarvis-grid-bg overflow-hidden relative">
      <div className="pointer-events-none fixed inset-0 jarvis-scanline z-50" />

      <AnimatePresence>
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
          isOpen={sidebarOpen}
        />
      </AnimatePresence>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 text-muted-foreground hover:text-foreground transition-colors">
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
          <div className="flex-1"><JarvisHeader /></div>
          <button onClick={() => setPlannerOpen(!plannerOpen)} className={`p-3 transition-colors ${plannerOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarDays className="h-5 w-5" />
          </button>
          <button onClick={() => navigate("/help")} className="p-3 text-muted-foreground hover:text-foreground transition-colors" title="Help">
            <HelpCircle className="h-5 w-5" />
          </button>
          <button onClick={signOut} className="p-3 text-muted-foreground hover:text-destructive transition-colors" title="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col items-center justify-center h-full gap-8 pt-20">
              <JarvisOrb isListening={voice.isListening} isProcessing={isProcessing} onToggle={handleVoiceToggle} voiceSupported={voice.isSupported} />
              <div className="text-center mt-8 space-y-2">
                <h2 className="font-display text-2xl font-bold text-primary jarvis-glow-text">
                  {appConfig.greeting.replace("{name}", user?.user_metadata?.full_name?.split(" ")[0] || "sir")}
                </h2>
                <p className="font-body text-base text-muted-foreground max-w-md">
                  {appConfig.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-md w-full mt-4">
                {appConfig.quickButtons.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="rounded-lg bg-secondary jarvis-border px-4 py-3 text-left text-sm font-body text-secondary-foreground hover:bg-primary/10 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {messages.map((msg, i) => <ChatMessage key={i} message={msg} index={i} />)}
          {isProcessing && messages[messages.length - 1]?.role !== "assistant" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 jarvis-border">
                <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="rounded-lg bg-jarvis-surface jarvis-border px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} className="h-2 w-2 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-border/50 px-4 py-4 bg-card/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-3xl mx-auto">
            <button type="button" onClick={handleVoiceToggle}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                voice.isListening ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
            <input type="text" value={voice.isListening ? voice.transcript : input} onChange={(e) => setInput(e.target.value)}
              placeholder={voice.isListening ? "Listening..." : "Ask Jarvis anything..."}
              disabled={voice.isListening}
              className="flex-1 rounded-lg bg-input jarvis-border px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60" />
            <button type="submit" disabled={isProcessing || (!input.trim() && !voice.transcript)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="h-4 w-4" />
            </button>
          </form>
          {voice.isListening && voice.transcript && (
            <p className="text-center font-mono text-xs text-muted-foreground mt-2">"{voice.transcript}"</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        <DailyPlanner isOpen={plannerOpen} onClose={() => setPlannerOpen(false)} />
      </AnimatePresence>
    </div>
  );
};

export default Index;
