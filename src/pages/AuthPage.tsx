import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (forgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent. Check your inbox.");
        setForgotPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background jarvis-grid-bg px-4">
      <div className="pointer-events-none fixed inset-0 jarvis-scanline z-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 jarvis-border jarvis-glow">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-primary jarvis-glow-text">
            J.A.R.V.I.S.
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
            {forgotPassword ? "Password Recovery" : isLogin ? "Authentication Required" : "New User Registration"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-card/80 backdrop-blur-sm jarvis-border p-6">
          {!isLogin && !forgotPassword && (
            <div className="space-y-2">
              <label className="font-body text-sm text-muted-foreground">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tony Stark"
                  className="w-full rounded-lg bg-input jarvis-border pl-10 pr-4 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="font-body text-sm text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tony@starkindustries.com"
                required
                className="w-full rounded-lg bg-input jarvis-border pl-10 pr-4 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {!forgotPassword && (
            <div className="space-y-2">
              <label className="font-body text-sm text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg bg-input jarvis-border pl-10 pr-10 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-display font-bold text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : forgotPassword
              ? "Send Reset Link"
              : isLogin
              ? "Sign In"
              : "Create Account"}
          </button>

          {!forgotPassword && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) toast.error(error.message || "Google sign-in failed");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary jarvis-border py-2.5 text-sm font-body text-foreground hover:bg-primary/10 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
            </>
          )}

          <div className="flex justify-between text-xs font-body">
            {isLogin && !forgotPassword && (
              <button
                type="button"
                onClick={() => setForgotPassword(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            )}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setForgotPassword(false); }}
              className="text-primary hover:text-primary/80 transition-colors ml-auto"
            >
              {isLogin ? "Create an account" : "Already have an account?"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
