import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function JarvisHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex items-center justify-between px-6 py-4 border-b border-border/50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 jarvis-border">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold tracking-wider text-primary jarvis-glow-text">
            J.A.R.V.I.S.
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
            Just A Rather Very Intelligent System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="font-mono text-xs text-muted-foreground">ONLINE</span>
      </div>
    </motion.header>
  );
}
