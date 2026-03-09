import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, Mic, CalendarDays, Cloud, Zap, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HelpPage() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Chat with J.A.R.V.I.S.",
      items: [
        "Type any question in the input bar and press Enter or click Send.",
        "Jarvis responds with intelligent, context-aware answers using AI.",
        "Conversations are saved locally in your browser and appear in the sidebar.",
        "Click the sidebar icon (top-left) to view, switch between, or delete past conversations.",
      ],
    },
    {
      icon: <Mic className="h-5 w-5" />,
      title: "Voice Input",
      items: [
        "Click the microphone button to speak your message.",
        "Your speech is transcribed in real-time and sent when you stop speaking.",
        "Jarvis also speaks responses aloud for shorter messages.",
        "Voice input requires browser microphone permission.",
      ],
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Built-in Commands",
      items: [
        '"What\'s the weather in London?" — fetches live weather data.',
        '"News about AI" — retrieves top headlines on any topic.',
        '"Add a task to review code at 3pm" — creates a task with time & priority.',
        '"Show my tasks" — lists all your pending and completed tasks.',
        '"Complete review code" — marks a matching task as done.',
      ],
    },
    {
      icon: <CalendarDays className="h-5 w-5" />,
      title: "Daily Planner",
      items: [
        "Click the calendar icon (top-right) to open the Daily Planner panel.",
        "Add tasks with title, description, date, time, and priority level.",
        "Tasks created via chat commands also appear here automatically.",
        "Check off completed tasks or delete them from the planner.",
      ],
    },
    {
      icon: <Cloud className="h-5 w-5" />,
      title: "Data & Storage",
      items: [
        "Conversations and tasks are stored in your browser's local storage.",
        "Data persists across page refreshes but is tied to this browser/device.",
        "Clearing browser data will erase your conversations and tasks.",
        "Authentication is handled via Google Sign-In or email/password.",
      ],
    },
    {
      icon: <HelpCircle className="h-5 w-5" />,
      title: "Tips & Tricks",
      items: [
        "Use the quick-start buttons on the home screen for common actions.",
        "Jarvis maintains the persona of Tony Stark's AI — expect witty responses!",
        "For best results, be specific in your questions and commands.",
        "Sign out via the logout icon in the top-right corner.",
        "Ask 'Who created you?' and Jarvis will tell you about its creator.",
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background jarvis-grid-bg">
      <div className="pointer-events-none fixed inset-0 jarvis-scanline z-50" />

      <header className="flex items-center gap-3 border-b border-border/50 px-4 py-3 bg-card/80 backdrop-blur-sm">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-primary tracking-wider">HELP & INSTRUCTIONS</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-8 max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2 mb-8">
            <h2 className="font-display text-2xl font-bold text-primary jarvis-glow-text">
              Welcome to J.A.R.V.I.S.
            </h2>
            <p className="font-body text-sm text-muted-foreground max-w-lg mx-auto">
              Just A Rather Very Intelligent System — your personal AI assistant. 
              Here's everything you need to know to get started.
            </p>
          </div>

          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl bg-card/80 backdrop-blur-sm jarvis-border p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {section.icon}
                </div>
                <h3 className="font-display text-sm font-bold text-foreground tracking-wide">{section.title}</h3>
              </div>
              <ul className="space-y-2 ml-12">
                {section.items.map((item, j) => (
                  <li key={j} className="text-sm font-body text-muted-foreground leading-relaxed flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
