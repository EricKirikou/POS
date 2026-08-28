/**
 * Design reminder — Retail Operations Ledger:
 * Dense but calm enterprise POS surfaces, deep evergreen framing, Trade Amber for commercial momentum,
 * and a mobile-first drawer that preserves the desktop dashboard's operational hierarchy.
 */
import { useState, type CSSProperties, type ElementType } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Building2,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ShopSwitcher } from "@/components/ShopSwitcher";
import { useShop } from "@/contexts/ShopContext";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "POS", icon: Store, href: "/pos" },
  { label: "Product Manager", icon: PackageCheck, href: "/products" },
  { label: "Sales", icon: ReceiptText, href: "/sales" },
  { label: "Purchases", icon: ShoppingBag, href: "/purchases" },
  { label: "Stock Manager", icon: Boxes, href: "/inventory" },
  { label: "Cash & Bank", icon: WalletCards, href: "/cash-bank" },
  { label: "Expenses", icon: CircleDollarSign, href: "/expenses" },
  { label: "Staff Members", icon: UsersRound, href: "/team" },
  { label: "Reports", icon: FileBarChart, href: "/reports" },
  { label: "Online Orders", icon: ClipboardList, href: "/orders" },
  { label: "Website Setup", icon: Sparkles, href: "/website" },
  { label: "Shops & Locations", icon: Building2, href: "/shops" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const categoryColors = ["#20bd87", "#4263eb", "#f5b73a", "#f58a3d", "#e56464"];
const formatCurrency = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);
const formatCompactCurrency = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(value);

type MetricCardProps = {
  label: string;
  value: string;
  icon: ElementType;
  accent: "amber" | "emerald" | "blue";
  detail: string;
  trend?: "up" | "down";
};

function MetricCard({ label, value, icon: Icon, accent, detail, trend }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-icon--${accent}`}><Icon aria-hidden="true" /></div>
      <div className="metric-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        <span className={trend === "down" ? "metric-trend metric-trend--down" : "metric-trend"}>
          {trend === "up" ? <ArrowUpRight aria-hidden="true" /> : trend === "down" ? <ArrowDownRight aria-hidden="true" /> : null}
          {detail}
        </span>
      </div>
    </article>
  );
}

function NavContent({ activeNav, setActiveNav, onClose }: { activeNav: string; setActiveNav: (label: string) => void; onClose?: () => void }) {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const chooseNav = (label: string) => {
    setActiveNav(label);
    const route = navItems.find((item) => item.label === label)?.href;
    if (route) navigate(route);
    onClose?.();
  };

  return (
    <div className="sidebar-inner">
      <div className="brand-block">
        <img src="/manus-storage/tradecore-logo-mark_69c7bf77.png" alt="TradeCore" className="brand-mark" />
        <span className="brand-wordmark"><b>Trade</b><em>Core</em></span>
        {onClose ? (
          <button aria-label="Close navigation" className="mobile-close" onClick={onClose}><X /></button>
        ) : null}
      </div>
      <div className="workspace-label"><span>WORKSPACE</span><ChevronDown aria-hidden="true" /></div>
      <nav className="side-nav" aria-label="Primary navigation">
        {navItems.map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => chooseNav(label)} className={activeNav === label ? "nav-item nav-item--active" : "nav-item"}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {label === "Online Orders" ? <i>3</i> : null}
          </button>
        ))}
      </nav>
      <button className="logout-button" onClick={() => void logout()}>
        <LogOut aria-hidden="true" /><span>Logout</span>
      </button>
      <div className="sidebar-footer"><span className="status-dot" /> Live sync is active</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <b>{label}</b>
      {payload.map((item) => <span key={item.name} style={{ color: item.color }}>{item.name}: {formatCurrency(item.value)}</span>)}
    </div>
  );
}

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [range, setRange] = useState("This week");
  const period = range === "Last 30 days" ? "month" : range === "Quarter to date" ? "quarter" : "week";
  const { activeShop } = useShop();
  const dashboardQuery = trpc.dashboard.summary.useQuery({ period, locationId: activeShop?.id });
  const summary = dashboardQuery.data;
  const metrics = summary?.metrics ?? { totalSales: 0, totalExpenses: 0, paymentsSent: 0, paymentsReceived: 0, totalItems: 0, salesCount: 0, stockValue: 0 };
  const salesData = summary?.salesSeries ?? [];
  const paymentData = summary?.paymentSeries ?? [];
  const productMix = (summary?.categoryMix ?? []).map((entry, index) => ({ ...entry, color: categoryColors[index % categoryColors.length] }));
  const lowStock = summary?.lowStock ?? [];
  const topCustomers = summary?.topCustomers ?? [];
  const categoryTotal = productMix.reduce((total, entry) => total + entry.value, 0);
  const hasDashboardActivity = salesData.length > 0 || paymentData.length > 0 || productMix.length > 0 || lowStock.length > 0 || topCustomers.length > 0;
  const refreshDashboard = async () => {
    await dashboardQuery.refetch();
    toast("Dashboard refreshed", { description: "The latest saved POS data is now displayed." });
  };

  return (
    <div className="dashboard-shell">
      <aside className="desktop-sidebar">
        <NavContent activeNav={activeNav} setActiveNav={setActiveNav} />
      </aside>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="mobile-sidebar-sheet">
          <SheetTitle className="sr-only">TradeCore navigation</SheetTitle>
          <NavContent activeNav={activeNav} setActiveNav={setActiveNav} onClose={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu /></button>
            <div className="desktop-collapse"><PanelLeftClose aria-hidden="true" /></div>
            <div className="breadcrumb"><span>Overview</span><ChevronRight aria-hidden="true" /><b>{activeNav}</b></div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search dashboard"><Search /></button>
            <button className="help-link" onClick={() => toast("Help center", { description: "Support resources will open in a new tab." })}>Help</button>
            <button className="store-link" onClick={() => toast("Point of sale", { description: "The POS register is ready for your next transaction." })}><Store /> POS</button>
            <span className="topbar-divider" />
            <ShopSwitcher />
            <button className="user-chip" aria-label="Open account menu"><span>SK</span><ChevronDown /></button>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading panel-reveal">
            <div>
              <p className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
              <h1>Today’s trading, at a glance.</h1>
              <p className="heading-subtitle">Monitor performance, payments, and inventory from one retail command center.</p>
            </div>
            <div className="heading-controls">
              <label className="date-control"><CalendarDays aria-hidden="true" /><span>{range}</span><ChevronDown aria-hidden="true" />
                <select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Select reporting period">
                  <option>This week</option><option>Last 30 days</option><option>Quarter to date</option>
                </select>
              </label>
              <Button className="refresh-button" onClick={refreshDashboard} disabled={dashboardQuery.isFetching}><RefreshCw className={dashboardQuery.isFetching ? "animate-spin" : ""} /> <span>Refresh</span></Button>
            </div>
          </section>

          {dashboardQuery.isLoading ? <section className="dashboard-card panel-reveal" role="status"><div className="card-header"><div><p className="card-kicker">Synchronizing workspace</p><h2>Loading live POS reporting</h2><p>TradeCore is retrieving the latest transactions, inventory signals, and payment activity.</p></div><RefreshCw className="animate-spin" aria-hidden="true" /></div></section> : null}
          {dashboardQuery.isError ? <section className="dashboard-card panel-reveal" role="alert"><div className="card-header"><div><p className="card-kicker">Reporting unavailable</p><h2>Dashboard data could not be loaded</h2><p>{dashboardQuery.error.message}</p></div><Button className="refresh-button" onClick={() => void dashboardQuery.refetch()}><RefreshCw /> Try again</Button></div></section> : null}
          {!dashboardQuery.isLoading && !dashboardQuery.isError && !hasDashboardActivity ? <section className="dashboard-card panel-reveal"><div className="card-header"><div><p className="card-kicker">Ready for activity</p><h2>Your dashboard will populate as you trade</h2><p>Add a catalog item, adjust inventory, or capture a sale to begin seeing operational reporting here.</p></div></div></section> : null}

          <section className="stats-grid panel-reveal" aria-label="Business performance metrics">
            <MetricCard label="Total sales" value={formatCurrency(metrics.totalSales)} icon={BadgeDollarSign} accent="amber" detail="Paid sales in this period" />
            <MetricCard label="Total expenses" value={formatCurrency(metrics.totalExpenses)} icon={BriefcaseBusiness} accent="emerald" detail="Saved operating expenses" />
            <MetricCard label="Payments sent" value={formatCurrency(metrics.paymentsSent)} icon={HandCoins} accent="amber" detail="Purchases and expenses in this period" />
            <MetricCard label="Payments received" value={formatCurrency(metrics.paymentsReceived)} icon={WalletCards} accent="emerald" detail="Captured POS payments" />
            <MetricCard label="Total items" value={String(metrics.totalItems)} icon={PackageCheck} accent="blue" detail="Active catalog records" />
            <MetricCard label="Low-stock items" value={String(lowStock.length)} icon={UsersRound} accent="emerald" detail="At or below reorder level" />
            <MetricCard label="Stock value" value={formatCurrency(metrics.stockValue)} icon={Boxes} accent="amber" detail="Based on retail catalog pricing" />
            <MetricCard label="Sales records" value={String(metrics.salesCount)} icon={CircleDollarSign} accent="emerald" detail="Paid transactions in this period" />
          </section>

          <section className="dashboard-grid dashboard-grid--analytics panel-reveal">
            <article className="dashboard-card sales-card">
              <div className="card-header">
                <div><p className="card-kicker">Trading performance</p><h2>Sales & purchases</h2></div>
                <button className="quiet-action" onClick={() => toast("Sales report", { description: "Detailed report view is coming next." })}>View all <ChevronRight /></button>
              </div>
              <div className="chart-meta"><span><i className="legend-dot legend-dot--green" /> Purchases</span><span><i className="legend-dot legend-dot--amber" /> Sales</span></div>
              <div className="chart-box chart-box--bar">
                {salesData.length ? <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData} barCategoryGap="40%" margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke="#e8ece9" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#7a8780", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#7a8780", fontSize: 10 }} tickFormatter={formatCompactCurrency} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(51, 65, 56, 0.035)" }} />
                    <Bar dataKey="purchases" name="Purchases" fill="#20bd87" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="sales" name="Sales" fill="#f5b73a" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer> : <div className="data-empty"><ReceiptText /><b>No trading activity in this period</b><span>Completed sales and supplier purchases will appear here.</span></div>}
              </div>
            </article>

            <article className="dashboard-card product-card">
              <div className="card-header"><div><p className="card-kicker">Category mix</p><h2>Top-selling products</h2></div><button className="more-button" aria-label="More product options"><MoreHorizontal /></button></div>
              <div className="product-chart-layout">
                <div className="donut-wrap">
                  {productMix.length ? <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={productMix} dataKey="value" nameKey="name" innerRadius="59%" outerRadius="86%" paddingAngle={3} stroke="none">
                        {productMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer> : <div className="data-empty"><PackageCheck /><b>No category sales yet</b><span>Product mix appears after completed POS sales.</span></div>}
                  {productMix.length ? <div className="donut-center"><strong>{metrics.totalItems}</strong><span>items</span></div> : null}
                </div>
                <div className="product-legend">
                  {productMix.slice(0, 4).map((product) => <div key={product.name}><i style={{ backgroundColor: product.color }} /><span>{product.name}</span><b>{categoryTotal ? `${Math.round(product.value / categoryTotal * 100)}%` : "0%"}</b></div>)}
                </div>
              </div>
            </article>
          </section>

          <section className="dashboard-grid dashboard-grid--payments panel-reveal">
            <article className="dashboard-card payments-card">
              <div className="card-header"><div><p className="card-kicker">Cashflow movement</p><h2>Payments</h2></div><button className="quiet-action" onClick={() => toast("Payments report", { description: "Detailed report view is coming next." })}>View all <ChevronRight /></button></div>
              <div className="chart-meta"><span><i className="legend-dot legend-dot--green" /> Payments received</span><span><i className="legend-dot legend-dot--amber" /> Payments sent</span></div>
              <div className="chart-box chart-box--line">
                {paymentData.length ? <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paymentData} margin={{ top: 18, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke="#e8ece9" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#7a8780", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#7a8780", fontSize: 10 }} tickFormatter={formatCompactCurrency} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="received" name="Received" stroke="#20bd87" strokeWidth={2.1} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="paid" name="Sent" stroke="#f5b73a" strokeWidth={2.1} dot={{ r: 2.5, fill: "#f5b73a", strokeWidth: 0 }} activeDot={{ r: 4.5 }} />
                  </LineChart>
                </ResponsiveContainer> : <div className="data-empty"><WalletCards /><b>No payment activity in this period</b><span>Captured and sent payments will appear here.</span></div>}
              </div>
            </article>
          </section>

          <section className="dashboard-grid dashboard-grid--operations panel-reveal">
            <article className="dashboard-card stock-card">
              <div className="card-header"><div><p className="card-kicker">Inventory watch</p><h2>Stock alert</h2></div><button className="quiet-action" onClick={() => toast("Stock alerts", { description: "A filtered stock-alert list is ready to review." })}>View all <ChevronRight /></button></div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>On hand</th><th>Alert level</th><th aria-label="Status" /></tr></thead>
                  <tbody>{lowStock.map((product) => { const critical = product.stock <= Math.max(1, Math.floor(product.reorderLevel / 2)); return <tr key={product.id}><td><span className="product-name">{product.name}</span></td><td>{product.stock} pcs</td><td>{product.reorderLevel} pcs</td><td><span className={critical ? "stock-status stock-status--critical" : "stock-status"}>{critical ? "Reorder" : "Watch"}</span></td></tr>; })}</tbody>
                </table>
              </div>
            </article>
            <article className="dashboard-card customers-card">
              <div className="card-header"><div><p className="card-kicker">Revenue leaders</p><h2>Top customers</h2></div><button className="quiet-action" onClick={() => toast("Customer directory", { description: "Full customer records are available from the Customers module." })}>View all <ChevronRight /></button></div>
              <div className="customer-list">
                  {topCustomers.map((customer, index) => <div className="customer-row" key={customer.name}>
                  <span className="customer-avatar" style={{ "--avatar-index": index } as CSSProperties}>{customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                  <span className="customer-name">{customer.name}<small>{customer.sales} total sales</small></span>
                  <span className="customer-amount">{formatCurrency(customer.amount)}</span>
                </div>)}
              </div>
            </article>
          </section>
        </div>
      </main>
      <button className="floating-action" onClick={() => toast("New sale", { description: "A new POS transaction is ready to begin." })}><Plus /><span>New sale</span></button>
    </div>
  );
}
