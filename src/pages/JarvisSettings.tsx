import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Brain, Zap, Database, GitBranch, Plus, Trash2, Check, X, FlaskConical, ToggleLeft, ToggleRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  loadSkills, createSkill, deleteSkill, updateSkill,
  loadMemories, deleteMemory,
  loadImprovements, sandboxTestImprovement, applyImprovement, rejectImprovement,
  type AISkill, type AIMemory, type AIImprovement,
} from "@/lib/self-improvement";
import { toast } from "sonner";

type Tab = "skills" | "memory" | "improvements";

const statusColors: Record<string, string> = {
  pending: "text-amber-400 bg-amber-400/10",
  tested: "text-emerald-400 bg-emerald-400/10",
  applied: "text-primary bg-primary/10",
  failed: "text-destructive bg-destructive/10",
  rejected: "text-muted-foreground bg-muted",
};

const JarvisSettings = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("skills");
  const [skills, setSkills] = useState<AISkill[]>([]);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [improvements, setImprovements] = useState<AIImprovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", description: "", trigger_pattern: "", action_type: "prompt", action_data: {} as Record<string, any> });

  useEffect(() => { refresh(); }, [tab]);

  const refresh = async () => {
    setLoading(true);
    try {
      if (tab === "skills") setSkills(await loadSkills());
      else if (tab === "memory") setMemories(await loadMemories());
      else setImprovements(await loadImprovements());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAddSkill = async () => {
    if (!newSkill.name || !newSkill.trigger_pattern) {
      toast.error("Name and trigger pattern are required");
      return;
    }
    try {
      await createSkill(newSkill);
      setShowAddSkill(false);
      setNewSkill({ name: "", description: "", trigger_pattern: "", action_type: "prompt", action_data: {} });
      toast.success("Skill added");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleToggleSkill = async (skill: AISkill) => {
    await updateSkill(skill.id, { is_active: !skill.is_active });
    refresh();
  };

  const handleDeleteSkill = async (id: string) => {
    await deleteSkill(id);
    toast.success("Skill removed");
    refresh();
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
    toast.success("Memory cleared");
    refresh();
  };

  const handleTestImprovement = async (id: string) => {
    try {
      const result = await sandboxTestImprovement(id);
      toast[result.success ? "success" : "error"](result.message);
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleApplyImprovement = async (id: string) => {
    try {
      const msg = await applyImprovement(id);
      toast.success(msg);
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRejectImprovement = async (id: string) => {
    await rejectImprovement(id);
    toast.info("Improvement rejected");
    refresh();
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "skills", label: "Skills", icon: <Zap className="h-4 w-4" /> },
    { key: "memory", label: "Memory", icon: <Database className="h-4 w-4" /> },
    { key: "improvements", label: "Improvements", icon: <GitBranch className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background jarvis-grid-bg">
      <div className="pointer-events-none fixed inset-0 jarvis-scanline z-50" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <button onClick={() => navigate("/")} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display text-lg font-bold text-primary jarvis-glow-text">Self-Improvement System</h1>
          <p className="font-body text-xs text-muted-foreground">Manage Jarvis's skills, memory & improvements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-border/30">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm transition-colors ${
              tab === t.key ? "bg-primary/20 text-primary jarvis-border" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </motion.div>
          ) : tab === "skills" ? (
            <motion.div key="skills" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-body text-sm text-muted-foreground">{skills.length} skill{skills.length !== 1 ? "s" : ""} registered</p>
                <button onClick={() => setShowAddSkill(!showAddSkill)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 text-primary text-sm font-body hover:bg-primary/30 transition-colors jarvis-border">
                  <Plus className="h-4 w-4" />Add Skill
                </button>
              </div>

              {showAddSkill && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4 p-4 rounded-lg bg-card jarvis-border space-y-3">
                  <input value={newSkill.name} onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))}
                    placeholder="Skill name (e.g. 'translate')" className="w-full rounded-lg bg-input jarvis-border px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input value={newSkill.description} onChange={e => setNewSkill(p => ({ ...p, description: e.target.value }))}
                    placeholder="Description" className="w-full rounded-lg bg-input jarvis-border px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input value={newSkill.trigger_pattern} onChange={e => setNewSkill(p => ({ ...p, trigger_pattern: e.target.value }))}
                    placeholder="Trigger pattern (regex, e.g. 'translate.*to')" className="w-full rounded-lg bg-input jarvis-border px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <div className="flex gap-2">
                    <button onClick={handleAddSkill} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body hover:bg-primary/80 transition-colors">Save</button>
                    <button onClick={() => setShowAddSkill(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-body hover:bg-secondary/80 transition-colors">Cancel</button>
                  </div>
                </motion.div>
              )}

              {skills.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground font-body">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No custom skills yet.</p>
                  <p className="text-xs mt-1">Add skills manually or say "add skill translate" in chat.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {skills.map(skill => (
                    <div key={skill.id} className="flex items-center gap-3 p-3 rounded-lg bg-card jarvis-border group">
                      <button onClick={() => handleToggleSkill(skill)} className="shrink-0">
                        {skill.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-body text-sm font-semibold ${skill.is_active ? "text-foreground" : "text-muted-foreground"}`}>{skill.name}</p>
                        <p className="font-body text-xs text-muted-foreground truncate">{skill.description}</p>
                        <p className="font-mono text-xs text-primary/60 mt-0.5">/{skill.trigger_pattern}/</p>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{skill.action_type}</span>
                      <button onClick={() => handleDeleteSkill(skill.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : tab === "memory" ? (
            <motion.div key="memory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="font-body text-sm text-muted-foreground mb-4">{memories.length} memor{memories.length !== 1 ? "ies" : "y"} stored</p>
              {memories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground font-body">
                  <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No memories stored yet.</p>
                  <p className="text-xs mt-1">Say "remember that I prefer dark mode" in chat to teach Jarvis.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map(mem => (
                    <div key={mem.id} className="flex items-start gap-3 p-3 rounded-lg bg-card jarvis-border group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{mem.category}</span>
                          <span className="font-body text-sm font-semibold text-foreground">{mem.key}</span>
                        </div>
                        <p className="font-body text-sm text-muted-foreground mt-1">{mem.value}</p>
                        <p className="font-mono text-xs text-muted-foreground/50 mt-1">via {mem.source} • {new Date(mem.updated_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => handleDeleteMemory(mem.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="improvements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="font-body text-sm text-muted-foreground mb-4">{improvements.length} improvement{improvements.length !== 1 ? "s" : ""} proposed</p>
              {improvements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground font-body">
                  <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No improvements proposed yet.</p>
                  <p className="text-xs mt-1">Say "improve yourself" in chat to let Jarvis propose changes.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {improvements.map(imp => (
                    <div key={imp.id} className="p-4 rounded-lg bg-card jarvis-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-mono px-2 py-0.5 rounded ${statusColors[imp.status] || ""}`}>{imp.status}</span>
                            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{imp.type}</span>
                          </div>
                          <p className="font-body text-sm font-semibold text-foreground">{imp.title}</p>
                          <p className="font-body text-xs text-muted-foreground mt-1">{imp.description}</p>
                          {imp.sandbox_result && (
                            <p className={`font-mono text-xs mt-2 ${(imp.sandbox_result as any).success ? "text-emerald-400" : "text-destructive"}`}>
                              Sandbox: {(imp.sandbox_result as any).message}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {imp.status === "pending" && (
                            <button onClick={() => handleTestImprovement(imp.id)} className="p-2 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors" title="Run sandbox test">
                              <FlaskConical className="h-4 w-4" />
                            </button>
                          )}
                          {imp.status === "tested" && (
                            <button onClick={() => handleApplyImprovement(imp.id)} className="p-2 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors" title="Apply">
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {(imp.status === "pending" || imp.status === "tested") && (
                            <button onClick={() => handleRejectImprovement(imp.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Reject">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default JarvisSettings;
