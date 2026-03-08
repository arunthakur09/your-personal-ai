import { motion } from "framer-motion";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
}

export function ConversationSidebar({ conversations, activeId, onSelect, onNew, onDelete, isOpen }: ConversationSidebarProps) {
  if (!isOpen) return null;

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      exit={{ x: -260 }}
      className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col h-full shrink-0"
    >
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg bg-primary/10 jarvis-border px-3 py-2.5 text-sm font-body text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
              activeId === conv.id
                ? "bg-primary/15 jarvis-border"
                : "hover:bg-secondary"
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm font-body text-foreground">
              {conv.title}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </motion.aside>
  );
}
