/** Design reminder — Retail Operations Ledger: light operational canvas framed by deep evergreen navigation. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ShopProvider } from "./contexts/ShopContext";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import { AppShell } from "./components/AppShell";
import {
  CashBankPage,
  ExpensesPage,
  OrdersPage,
  POSPage,
  ProductManagerPage,
  PurchasesPage,
  ReportsPage,
  SalesPage,
  SettingsPage,
  StaffPage,
  StockManagerPage,
  WebsiteSetupPage,
} from "./pages/WorkspacePages";
import { ShopsPage } from "./pages/ShopsPage";
import SuperAdminLoginPage from "./pages/SuperAdminLoginPage";

function RoutedWorkspace({ children }: { children: React.ReactNode }) { return <AppShell>{children}</AppShell>; }
function WorkspaceRouter() {
  return <Switch>
    <Route path="/dashboard" component={Home} />
    <Route path="/" component={LandingPage} />
    <Route path="/pos">{() => <RoutedWorkspace><POSPage /></RoutedWorkspace>}</Route>
    <Route path="/products">{() => <RoutedWorkspace><ProductManagerPage /></RoutedWorkspace>}</Route>
    <Route path="/sales">{() => <RoutedWorkspace><SalesPage /></RoutedWorkspace>}</Route>
    <Route path="/purchases">{() => <RoutedWorkspace><PurchasesPage /></RoutedWorkspace>}</Route>
    <Route path="/inventory">{() => <RoutedWorkspace><StockManagerPage /></RoutedWorkspace>}</Route>
    <Route path="/cash-bank">{() => <RoutedWorkspace><CashBankPage /></RoutedWorkspace>}</Route>
    <Route path="/expenses">{() => <RoutedWorkspace><ExpensesPage /></RoutedWorkspace>}</Route>
    <Route path="/team">{() => <RoutedWorkspace><StaffPage /></RoutedWorkspace>}</Route>
    <Route path="/reports">{() => <RoutedWorkspace><ReportsPage /></RoutedWorkspace>}</Route>
    <Route path="/orders">{() => <RoutedWorkspace><OrdersPage /></RoutedWorkspace>}</Route>
    <Route path="/website">{() => <RoutedWorkspace><WebsiteSetupPage /></RoutedWorkspace>}</Route>
    <Route path="/shops">{() => <RoutedWorkspace><ShopsPage /></RoutedWorkspace>}</Route>
    <Route path="/settings">{() => <RoutedWorkspace><SettingsPage /></RoutedWorkspace>}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function Router() {
  return <Switch>
    <Route path="/login" component={LoginPage} />
    <Route path="/admin/login" component={SuperAdminLoginPage} />
    <Route>{() => <ShopProvider><WorkspaceRouter /></ShopProvider>}</Route>
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
