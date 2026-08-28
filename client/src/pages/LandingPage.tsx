import { ArrowRight, Boxes, CheckCircle2, ChevronRight, Globe2, Layers3, LockKeyhole, Menu, PackageCheck, Store, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const capabilities = [
  { icon: Store, label: "Multi-shop operations", detail: "Switch locations without losing the day-to-day context." },
  { icon: Boxes, label: "Inventory in sync", detail: "Keep catalog, stock, and reorder decisions together." },
  { icon: Layers3, label: "One operating layer", detail: "Bring sales, purchasing, expenses, and orders into one workspace." },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const openWorkspace = () => navigate(isAuthenticated ? "/dashboard" : "/login");

  return <main className="landing-page">
    <nav className="landing-nav">
      <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="TradeCore home"><img src="/tradecore-logo.svg" alt="" /><span><b>Trade</b><em>Core</em></span></button>
      <div className="landing-nav-links"><a href="#capabilities">Capabilities</a><a href="#workflow">How it works</a><a href="#access">Access</a></div>
      <div className="landing-nav-actions"><button className="landing-login-link" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}>{isAuthenticated ? "Open workspace" : "Log in"}</button><button className="landing-nav-cta" onClick={openWorkspace}>{isAuthenticated ? "Go to dashboard" : "Enter workspace"}<ArrowRight /></button></div>
      <button className="landing-mobile-menu" aria-label="Open navigation"><Menu /></button>
    </nav>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <p className="landing-eyebrow"><span className="landing-eyebrow-dot" /> RETAIL OPERATIONS, IN SYNC</p>
        <h1>Make every shop feel like <em>one clear business.</em></h1>
        <p className="landing-lede">TradeCore gives modern retail teams one calm command center for the counter, the stockroom, and every location in between.</p>
        <div className="landing-hero-actions"><button className="landing-primary-cta" onClick={openWorkspace}>{loading ? "Checking access…" : isAuthenticated ? "Open your workspace" : "Log in to TradeCore"}<ArrowRight /></button><a className="landing-secondary-cta" href="#capabilities">See what’s inside <ChevronRight /></a></div>
        <div className="landing-trust-line"><LockKeyhole /><span>Secure workspace access</span><i /><Globe2 /><span>Built for multi-shop teams</span></div>
      </div>
      <div className="landing-hero-visual" aria-label="TradeCore retail operations workspace preview">
        <div className="landing-visual-orbit landing-visual-orbit--one" /><div className="landing-visual-orbit landing-visual-orbit--two" />
        <div className="landing-dashboard-card"><div className="landing-dashboard-top"><div className="landing-mini-brand"><img src="/tradecore-logo.svg" alt="" /><b>Trade<em>Core</em></b></div><span>Downtown <ChevronRight /></span></div><div className="landing-dashboard-heading"><div><p>WEDNESDAY, AUGUST 26</p><h2>Today’s trading, at a glance.</h2></div><span className="landing-status"><i /> Live</span></div><div className="landing-preview-grid"><div><span className="preview-card-label">TOTAL SALES</span><strong>Live reporting</strong><small>Paid sales in this period</small></div><div><span className="preview-card-label">INVENTORY</span><strong>Shop-aware</strong><small>Stock signals by location</small></div><div className="landing-preview-chart"><span className="preview-card-label">TRADING PERFORMANCE</span><div className="preview-bars"><i /><i /><i /><i /><i /><i /><i /></div><div className="preview-chart-key"><span><i /> Sales</span><span><i /> Purchases</span></div></div></div><div className="landing-preview-footer"><span><CheckCircle2 /> Counter ready</span><span>Last sync just now</span></div></div>
        <div className="landing-float-card landing-float-card--shop"><span><Store /></span><div><b>5 locations</b><small>One operating view</small></div></div><div className="landing-float-card landing-float-card--stock"><span><PackageCheck /></span><div><b>Inventory aligned</b><small>Stock keeps moving</small></div></div>
      </div>
    </section>

    <section className="landing-capabilities" id="capabilities"><div className="landing-section-intro"><p className="landing-eyebrow">THE OPERATING LAYER</p><h2>Everything your team needs to keep trading.</h2><p>Designed for the moments that matter most: the next sale, the next reorder, and the next location decision.</p></div><div className="landing-capability-grid">{capabilities.map(({ icon: Icon, label, detail }) => <article key={label}><span><Icon /></span><h3>{label}</h3><p>{detail}</p></article>)}</div></section>

    <section className="landing-workflow" id="workflow"><div className="landing-workflow-card"><div><p className="landing-eyebrow">A CLEARER DAY, BY DESIGN</p><h2>From opening the doors to closing the books.</h2><p>Move through the day with fewer handoffs and better signals. TradeCore keeps the front of house and the back office working from the same source of truth.</p></div><div className="landing-workflow-steps"><div><b>01</b><span><strong>Start at the counter</strong><small>Take payments through a responsive register that reflects your shop’s catalog.</small></span></div><div><b>02</b><span><strong>Stay ahead of stock</strong><small>Spot reorder priorities before they become missed sales.</small></span></div><div><b>03</b><span><strong>See the whole operation</strong><small>Use live dashboards, reports, and shop switching to make the next decision.</small></span></div></div></div></section>

    <section className="landing-access" id="access"><div><p className="landing-eyebrow">READY WHEN YOU ARE</p><h2>Bring every shop into focus.</h2><p>Sign in to the workspace and pick up exactly where your retail day needs you.</p></div><button className="landing-primary-cta" onClick={openWorkspace}>{isAuthenticated ? "Open workspace" : "Log in securely"}<ArrowRight /></button></section>
    <footer className="landing-footer"><div className="landing-brand"><img src="/tradecore-logo.svg" alt="" /><span><b>Trade</b><em>Core</em></span></div><span>Retail operations, in balance.</span><span>© 2026 TradeCore Retail Systems</span></footer>
  </main>;
}
