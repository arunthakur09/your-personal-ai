import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, Calendar, Clock, Flag, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { type Task, getTasksSorted, addTask, updateTask, deleteTaskById } from "@/lib/task-storage";

interface DailyPlannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyPlanner({ isOpen, onClose }: DailyPlannerProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState("medium");

  const loadTasks = useCallback(() => {
    setTasks(getTasksSorted());
  }, []);

  useEffect(() => {
    if (user) loadTasks();
  }, [user, loadTasks]);

  // Listen for storage events from other tabs and task command updates
  useEffect(() => {
    const onStorage = () => loadTasks();
    window.addEventListener("storage", onStorage);
    window.addEventListener("tasks-updated", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tasks-updated", onStorage);
    };
  }, [loadTasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    addTask({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      due_time: dueTime || null,
      priority,
      completed: false,
    });
    setTitle(""); setDescription(""); setDueDate(""); setDueTime(""); setPriority("medium"); setShowForm(false);
    loadTasks();
  };

  const toggleTask = (id: string, completed: boolean) => {
    updateTask(id, { completed: !completed });
    loadTasks();
  };

  const handleDeleteTask = (id: string) => {
    deleteTaskById(id);
    loadTasks();
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "text-destructive";
    if (p === "low") return "text-muted-foreground";
    return "text-accent";
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter(t => t.due_date === todayStr);
  const otherTasks = tasks.filter(t => t.due_date !== todayStr);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      className="w-80 border-l border-border/50 bg-card/50 backdrop-blur-sm flex flex-col h-full shrink-0 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h2 className="font-display text-sm font-bold text-primary tracking-wider">DAILY PLANNER</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {todayTasks.length > 0 && (
          <div>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Today</p>
            {todayTasks.map(task => (
              <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={handleDeleteTask} priorityColor={priorityColor} />
            ))}
          </div>
        )}

        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
            {todayTasks.length > 0 ? "Other Tasks" : "All Tasks"}
          </p>
          {otherTasks.length === 0 && todayTasks.length === 0 && (
            <p className="text-sm text-muted-foreground font-body py-4 text-center">No tasks yet. Add one below.</p>
          )}
          {otherTasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={handleDeleteTask} priorityColor={priorityColor} />
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-border/50">
        <AnimatePresence>
          {showForm ? (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddTask}
              className="space-y-2"
            >
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required
                className="w-full rounded-lg bg-input jarvis-border px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
                className="w-full rounded-lg bg-input jarvis-border px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              <div className="flex gap-2">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 rounded-lg bg-input jarvis-border px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                  className="flex-1 rounded-lg bg-input jarvis-border px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex gap-1">
                {["low", "medium", "high"].map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-body capitalize transition-colors ${
                      priority === p ? "bg-primary/20 jarvis-border text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-display font-bold text-primary-foreground">Add</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg bg-secondary py-1.5 text-xs font-body text-muted-foreground">Cancel</button>
              </div>
            </motion.form>
          ) : (
            <button onClick={() => setShowForm(true)} className="flex w-full items-center gap-2 rounded-lg bg-primary/10 jarvis-border px-3 py-2.5 text-sm font-body text-primary hover:bg-primary/20 transition-colors">
              <Plus className="h-4 w-4" /> Add Task
            </button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TaskItem({ task, onToggle, onDelete, priorityColor }: {
  task: Task; onToggle: (id: string, c: boolean) => void; onDelete: (id: string) => void; priorityColor: (p: string) => string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-start gap-2 rounded-lg bg-jarvis-surface jarvis-border p-3 mb-2 ${task.completed ? "opacity-50" : ""}`}
    >
      <button onClick={() => onToggle(task.id, task.completed)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
          task.completed ? "bg-primary/30 border-primary" : "border-muted-foreground hover:border-primary"
        }`}>
        {task.completed && <Check className="h-3 w-3 text-primary" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-body ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </p>
        {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1">
          {task.due_date && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
              <Calendar className="h-3 w-3" /> {task.due_date}
            </span>
          )}
          {task.due_time && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
              <Clock className="h-3 w-3" /> {task.due_time}
            </span>
          )}
          <Flag className={`h-3 w-3 ${priorityColor(task.priority)}`} />
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
