import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Store, UsersRound } from "lucide-react";
import { COOKIE_NAME } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const login = trpc.auth.superAdminLogin.useMutation({
    onSuccess: (result) => {
      if (result.sessionToken) {
        try {
          sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${result.sessionToken}`);
        } catch {
          // sessionStorage may be unavailable in restricted browser contexts.
        }
      }
      navigate("/dashboard", { replace: true });
    },
    onError: (cause) => setError(cause.message === "Invalid email or password." ? "The email or password is incorrect." : cause.message),
  });

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    login.mutate({ email, password });
  };

  return <main className="login-page">
    <section className="login-brand-panel">
      <div className="login-brand-inner">
        <div className="login-wordmark"><img src="/tradecore-logo.svg" alt="" /><span><b>Trade</b><em>Core</em></span></div>
        <div className="login-copy"><p className="eyebrow">RETAIL OPERATIONS, IN SYNC</p><h1>One clear view<br />of every trade day.</h1><p>Bring shops, inventory, payments, and team activity into one controlled retail workspace.</p></div>
        <div className="login-assurance"><div><CheckCircle2 /><span><b>Location-aware controls</b><small>Keep each shop’s activity in context.</small></span></div><div><ShieldCheck /><span><b>Secure workspace access</b><small>Protected authentication for every session.</small></span></div></div>
      </div>
      <div className="login-panel-glow login-panel-glow--one" /><div className="login-panel-glow login-panel-glow--two" />
      <div className="login-network-mark"><span><Store /></span><i /><span><UsersRound /></span></div>
    </section>
    <section className="login-form-panel">
      <div className="login-form-card">
        <div className="login-mobile-mark"><img src="/tradecore-logo.svg" alt="TradeCore" /><span><b>Trade</b><em>Core</em></span></div>
        <div className="login-heading"><p className="eyebrow">WORKSPACE ACCESS</p><h2>Welcome to TradeCore</h2><p>Sign in to continue to your retail operations workspace.</p></div>

        {loading ? <div className="login-loading"><Loader2 className="animate-spin" /> Checking your session…</div> : isAuthenticated ? <div className="login-signed-in"><CheckCircle2 /><div><b>Welcome back{user?.name ? `, ${user.name}` : ""}.</b><span>Opening your workspace now.</span></div></div> : <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="px-0 pt-0">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#e9f5ee] text-[#1a7151]"><LockKeyhole size={22} /></div>
            <CardTitle className="text-3xl text-[#173629]">Admin sign in</CardTitle>
            <CardDescription className="pt-2 text-base leading-6">Use the default admin account or your assigned TradeCore credentials.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <form className="space-y-5" onSubmit={submit} noValidate>
              <div className="space-y-2"><Label htmlFor="login-email">Email address</Label><Input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="superadmin@knust.edu.gh" required disabled={login.isPending} /></div>
              <div className="space-y-2"><Label htmlFor="login-password">Password</Label><div className="relative"><Input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-12" required disabled={login.isPending} /><button type="button" className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
              {error ? <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={17} /><span>{error}</span></div> : null}
              <Button className="h-11 w-full bg-[#174d36] text-white hover:bg-[#123d2b]" type="submit" disabled={login.isPending || !email || !password}>{login.isPending ? <><Loader2 className="animate-spin" /> Signing in</> : <><ArrowRight size={16} /> Sign in</>}</Button>
              <Button type="button" variant="outline" className="h-11 w-full border-[#dfe7e1] bg-white text-[#173629] hover:bg-[#f5f7f5]" onClick={() => navigate("/", { replace: true })}>Back to landing page</Button>
            </form>
          </CardContent>
        </Card>}

        <div className="login-divider"><span /> <small>BUILT FOR CONNECTED RETAIL TEAMS</small> <span /></div>
        <div className="login-feature-row"><div><Store /><span><b>Multi-shop aware</b><small>Switch operational context without losing control.</small></span></div><div><ShieldCheck /><span><b>Protected by design</b><small>Session-based access for the work that matters.</small></span></div></div>
      </div>
      <p className="login-footer">© 2026 TradeCore Retail Systems · Operations, in balance.</p>
    </section>
  </main>;
}
