import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export type ShopLocation = { id: number; name: string; code: string; isActive: boolean };

type ShopContextValue = {
  locations: ShopLocation[];
  activeShopId: number | null;
  activeShop: ShopLocation | null;
  isLoading: boolean;
  setActiveShopId: (id: number) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);
const STORAGE_KEY = "tradecore-active-shop";

export function ShopProvider({ children }: { children: ReactNode }) {
  const locationsQuery = trpc.locations.list.useQuery();
  const locations = (locationsQuery.data ?? []) as ShopLocation[];
  const [activeShopId, setStoredActiveShopId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    const available = locations.filter((location) => location.isActive);
    if (!available.length) {
      if (activeShopId !== null) setStoredActiveShopId(null);
      return;
    }
    if (!activeShopId || !available.some((location) => location.id === activeShopId)) setStoredActiveShopId(available[0].id);
  }, [activeShopId, locations]);

  useEffect(() => {
    if (activeShopId === null || typeof window === "undefined") return;
    window.document.cookie = `tradecore_active_location=${activeShopId}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [activeShopId]);

  const setActiveShopId = (id: number) => {
    setStoredActiveShopId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(id));
      window.document.cookie = `tradecore_active_location=${id}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  };

  const value = useMemo(() => ({
    locations,
    activeShopId,
    activeShop: locations.find((location) => location.id === activeShopId) ?? null,
    isLoading: locationsQuery.isLoading,
    setActiveShopId,
  }), [activeShopId, locations, locationsQuery.isLoading]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used within ShopProvider");
  return context;
}
