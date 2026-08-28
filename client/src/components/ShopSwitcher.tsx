import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ShopSwitcher() {
  const [, navigate] = useLocation();
  const { locations, activeShop, activeShopId, isLoading, setActiveShopId } = useShop();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const activeLocations = locations.filter((location) => location.isActive);

  if (!isLoading && !activeLocations.length) return isAdmin ? <button className="location-picker location-picker--empty" onClick={() => navigate("/shops")}><Building2 /> Add a shop <Plus /></button> : <span className="location-picker location-picker--empty"><Building2 /> No shop assigned</span>;

  return <DropdownMenu><DropdownMenuTrigger asChild><button className="location-picker" aria-label="Switch active shop"><Building2 /> {isLoading ? "Loading shops" : activeShop?.name ?? "Select shop"} <ChevronDown /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shop-switcher-menu">{activeLocations.map((location) => <DropdownMenuItem key={location.id} onSelect={() => setActiveShopId(location.id)} className="shop-switcher-item"><span><b>{location.name}</b><small>{location.code}</small></span>{location.id === activeShopId ? <Check /> : null}</DropdownMenuItem>)}{isAdmin ? <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => navigate("/shops")} className="shop-switcher-manage"><Plus /> Manage shops</DropdownMenuItem></> : null}</DropdownMenuContent></DropdownMenu>;
}
