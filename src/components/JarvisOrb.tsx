import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

interface JarvisOrbProps {
  isListening: boolean;
  isProcessing: boolean;
  onToggle: () => void;
  voiceSupported: boolean;
}

export function JarvisOrb({ isListening, isProcessing, onToggle, voiceSupported }: JarvisOrbProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings */}
      {(isListening || isProcessing) && (
        <>
          <motion.div
            className="absolute rounded-full border border-primary/40"
            style={{ width: 120, height: 120 }}
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute rounded-full border border-primary/30"
            style={{ width: 120, height: 120 }}
            animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
          />
        </>
      )}

      {/* Main orb */}
      <motion.button
        onClick={onToggle}
        disabled={!voiceSupported}
        className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full jarvis-glow jarvis-border bg-secondary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        animate={isListening ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={isListening ? { duration: 2, repeat: Infinity } : {}}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Inner glow */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-transparent" />
        
        {isListening ? (
          <Mic className="h-8 w-8 text-primary relative z-10" />
        ) : (
          <MicOff className="h-8 w-8 text-muted-foreground relative z-10" />
        )}
      </motion.button>

      {/* Status label */}
      <motion.p
        className="absolute -bottom-8 font-mono text-xs text-muted-foreground whitespace-nowrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {!voiceSupported
          ? "Voice not supported"
          : isListening
          ? "Listening..."
          : isProcessing
          ? "Processing..."
          : "Tap to speak"}
      </motion.p>
    </div>
  );
}
