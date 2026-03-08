import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { JarvisHeader } from "@/components/JarvisHeader";
import { JarvisOrb } from "@/components/JarvisOrb";
import { ChatMessage } from "@/components/ChatMessage";
import { useVoice, speak } from "@/hooks/use-voice";
import { streamChat, type ChatMessage as ChatMsg } from "@/lib/jarvis-stream";
import { toast } from "sonner";

const Index = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoice();

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // When voice transcript finalizes
  useEffect(() => {
    if (!voice.isListening && voice.transcript) {
      sendMessage(voice.transcript);
    }
  }, [voice.isListening]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;

    const userMsg: ChatMsg = { role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    let assistantText = "";
    const upsert = (chunk: string) => {
      assistantText += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => {
          setIsProcessing(false);
          // Speak a short version of the response
          if (assistantText.length < 500) {
            speak(assistantText.replace(/[#*`_\[\]]/g, ""));
          }
        },
      });
    } catch (e: any) {
      setIsProcessing(false);
      toast.error(e.message || "Failed to get response");
    }
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleVoiceToggle = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background jarvis-grid-bg overflow-hidden relative">
      {/* Scanline effect */}
      <div className="pointer-events-none fixed inset-0 jarvis-scanline z-50" />

      <JarvisHeader />

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col items-center justify-center h-full gap-8 pt-20"
          >
            <JarvisOrb
              isListening={voice.isListening}
              isProcessing={isProcessing}
              onToggle={handleVoiceToggle}
              voiceSupported={voice.isSupported}
            />

            <div className="text-center mt-8 space-y-2">
              <h2 className="font-display text-2xl font-bold text-primary jarvis-glow-text">
                Good day, sir.
              </h2>
              <p className="font-body text-base text-muted-foreground max-w-md">
                I'm at your service. Type a message or tap the microphone to speak.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md w-full mt-4">
              {[
                "What can you do?",
                "Tell me a tech fact",
                "Help me plan my day",
                "Explain quantum computing",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-lg bg-secondary jarvis-border px-4 py-3 text-left text-sm font-body text-secondary-foreground hover:bg-primary/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} index={i} />
        ))}

        {isProcessing && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 jarvis-border">
              <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
            </div>
            <div className="rounded-lg bg-jarvis-surface jarvis-border px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border/50 px-4 py-4 bg-card/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-3xl mx-auto">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                voice.isListening
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
          )}

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={voice.isListening ? voice.transcript : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voice.isListening ? "Listening..." : "Ask Jarvis anything..."}
              disabled={voice.isListening}
              className="w-full rounded-lg bg-input jarvis-border px-4 py-3 pr-12 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing || (!input.trim() && !voice.transcript)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {voice.isListening && voice.transcript && (
          <p className="text-center font-mono text-xs text-muted-foreground mt-2">
            "{voice.transcript}"
          </p>
        )}
      </div>
    </div>
  );
};

export default Index;
