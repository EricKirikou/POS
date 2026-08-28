/**
 * Design reminder — TradeCore access portal:
 * An assured operational welcome screen using evergreen depth, paper-white cards, and amber only to guide the sign-in action.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, ShieldCheck, Store, UsersRound } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading, user } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const previewMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

  useEffect(() => {
    if (isAuthenticated && !previewMode) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate, previewMode]);

  const continueToWorkspace = () => {
    setSigningIn(true);
    startLogin();
  };

  return <main className="login-page">
    <section className="login-brand-panel">
      <div className="login-brand-inner">
        <div className="login-wordmark"><img src="/manus-storage/tradecore-logo-mark_69c7bf77.png" alt="" /><span><b>Trade</b><em>Core</em></span></div>
        <div className="login-copy"><p className="eyebrow">RETAIL OPERATIONS, IN SYNC</p><h1>One clear view<br />of every trade day.</h1><p>Bring shops, inventory, payments, and team activity into one controlled retail workspace.</p></div>
        <div className="login-assurance"><div><CheckCircle2 /><span><b>Location-aware controls</b><small>Keep each shop’s activity in context.</small></span></div><div><ShieldCheck /><span><b>Secure workspace access</b><small>Protected authentication for every session.</small></span></div></div>
      </div>
      <div className="login-panel-glow login-panel-glow--one" /><div className="login-panel-glow login-panel-glow--two" />
      <div className="login-network-mark"><span><Store /></span><i /><span><UsersRound /></span></div>
    </section>
    <section className="login-form-panel">
      <div className="login-form-card">
        <div className="login-mobile-mark"><img src="/manus-storage/tradecore-logo-mark_69c7bf77.png" alt="TradeCore" /><span><b>Trade</b><em>Core</em></span></div>
        <div className="login-heading"><p className="eyebrow">WORKSPACE ACCESS</p><h2>Welcome to TradeCore</h2><p>Sign in to continue to your retail operations workspace.</p></div>
        {loading && !previewMode ? <div className="login-loading"><Loader2 className="animate-spin" /> Checking your secure session…</div> : isAuthenticated && !previewMode ? <div className="login-signed-in"><CheckCircle2 /><div><b>Welcome back{user?.name ? `, ${user.name}` : ""}.</b><span>Opening your workspace now.</span></div></div> : <><button className="login-primary-action" type="button" onClick={continueToWorkspace} disabled={signingIn}>{signingIn ? <Loader2 className="animate-spin" /> : <LockKeyhole />}<span>{signingIn ? "Redirecting securely…" : "Continue securely"}</span><ArrowRight /></button><p className="login-helper">You’ll sign in through the secure TradeCore account portal. No password is stored in this application.</p></>}
        <div className="login-divider"><span /> <small>BUILT FOR CONNECTED RETAIL TEAMS</small> <span /></div>
        <div className="login-feature-row"><div><Store /><span><b>Multi-shop aware</b><small>Switch operational context without losing control.</small></span></div><div><ShieldCheck /><span><b>Protected by design</b><small>Session-based access for the work that matters.</small></span></div></div>
      </div>
      <p className="login-footer">© 2026 TradeCore Retail Systems · Operations, in balance.</p>
    </section>
  </main>;
}
