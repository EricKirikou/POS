/**
 * Design reminder — Retail Operations Ledger:
 * Shared command rail and dark global bar create continuity across every POS workspace.
 */
import { type ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileBarChart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/_core/hooks/useAuth";
import { ShopSwitcher } from "@/components/ShopSwitcher";

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: Store },
  { label: "Product Manager", href: "/products", icon: PackageCheck },
  { label: "Sales", href: "/sales", icon: ReceiptText },
  { label: "Purchases", href: "/purchases", icon: ShoppingBag },
  { label: "Stock Manager", href: "/inventory", icon: Boxes },
  { label: "Cash & Bank", href: "/cash-bank", icon: WalletCards },
  { label: "Expenses", href: "/expenses", icon: CircleDollarSign },
  { label: "Staff Members", href: "/team", icon: UsersRound },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Online Orders", href: "/orders", icon: ClipboardList, badge: "3" },
  { label: "Website Setup", href: "/website", icon: Sparkles },
  { label: "Shops & Locations", href: "/shops", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Rail({ onClose }: { onClose?: () => void }) {
  const [location, navigate] = useLocation();
  const { logout, user } = useAuth();
  const visibleNavigation = user?.role === "admin" ? navigation : navigation.filter((item) => item.href !== "/shops");
  const active = visibleNavigation.find((item) => item.href === location)?.label ?? "Dashboard";

  return (
    <div className="sidebar-inner">
      <div className="brand-block">
        <img src="/manus-storage/tradecore-logo-mark_69c7bf77.png" alt="TradeCore" className="brand-mark" />
        <span className="brand-wordmark"><b>Trade</b><em>Core</em></span>
        {onClose ? <button aria-label="Close navigation" className="mobile-close" onClick={onClose}><X /></button> : null}
      </div>
      <div className="workspace-label"><span>WORKSPACE</span><ChevronDown aria-hidden="true" /></div>
      <nav className="side-nav" aria-label="Primary navigation">
        {visibleNavigation.map(({ label, href, icon: Icon, badge }) => (
          <button key={href} onClick={() => { navigate(href); onClose?.(); }} className={active === label ? "nav-item nav-item--active" : "nav-item"}>
            <Icon aria-hidden="true" /><span>{label}</span>{badge ? <i>{badge}</i> : null}
          </button>
        ))}
      </nav>
      <button className="logout-button" onClick={() => void logout()}><LogOut aria-hidden="true" /><span>Logout</span></button>
      <div className="sidebar-footer"><span className="status-dot" /> Live sync is active</div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const current = navigation.find((item) => item.href === location) ?? navigation[0];
  const initials = (user?.name ?? "TradeCore").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="dashboard-shell app-shell">
      <aside className="desktop-sidebar"><Rail /></aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="mobile-sidebar-sheet"><SheetTitle className="sr-only">TradeCore navigation</SheetTitle><Rail onClose={() => setMobileOpen(false)} /></SheetContent>
      </Sheet>
      <main className="dashboard-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu /></button>
            <div className="breadcrumb"><span>Operations</span><ChevronRight aria-hidden="true" /><b>{current.label}</b></div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search workspace" onClick={() => toast("Search", { description: "Use the page-level search to find a product or document." })}><Search /></button>
            <button className="help-link" onClick={() => toast("Help center", { description: "Support resources will open in a new tab." })}><HelpCircle /> Help</button>
            <button className="store-link" onClick={() => toast("Register ready", { description: "Open the POS page to begin a sale." })}><Store /> POS</button>
            <span className="topbar-divider" />
            <ShopSwitcher />
            <button className="user-chip" aria-label="Open account menu"><span>{initials}</span><ChevronDown /></button>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
