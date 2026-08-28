import { useState } from "react";
import { Archive, Building2, Check, Loader2, MapPin, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShop, type ShopLocation } from "@/contexts/ShopContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type FormState = { name: string; code: string; isActive: boolean };
const blank: FormState = { name: "", code: "", isActive: true };

function ShopDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (open: boolean) => void; editing: ShopLocation | null }) {
  const [values, setValues] = useState<FormState>(() => editing ? { name: editing.name, code: editing.code, isActive: editing.isActive } : blank);
  const { setActiveShopId } = useShop();
  const utils = trpc.useUtils();
  const create = trpc.locations.create.useMutation({ onSuccess: () => { void utils.locations.list.invalidate(); onOpenChange(false); toast("Shop created", { description: "The location is ready for stock and transactions." }); } });
  const update = trpc.locations.update.useMutation({ onSuccess: () => { void utils.locations.list.invalidate(); if (editing) setActiveShopId(editing.id); onOpenChange(false); toast("Shop updated", { description: "The location settings have been saved." }); } });
  const submit = (event: React.FormEvent) => { event.preventDefault(); editing ? update.mutate({ id: editing.id, ...values }) : create.mutate(values); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="crud-dialog"><DialogHeader><DialogTitle>{editing ? "Edit shop" : "Add a shop"}</DialogTitle><p>Each shop keeps independent on-hand inventory and operational records.</p></DialogHeader><form className="crud-form" onSubmit={submit}><Label>Shop name<Input value={values.name} placeholder="e.g. West End" onChange={(event) => setValues({ ...values, name: event.target.value })} required /></Label><Label>Shop code<Input value={values.code} placeholder="e.g. WEST" onChange={(event) => setValues({ ...values, code: event.target.value.toUpperCase() })} required /></Label><div className="crud-dialog-actions"><button className="soft-button" type="button" onClick={() => onOpenChange(false)}>Cancel</button><Button className="dark-action" type="submit" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? <Loader2 className="animate-spin" /> : <Check />}{editing ? "Save changes" : "Create shop"}</Button></div></form></DialogContent></Dialog>;
}

export function ShopsPage() {
  const { locations, activeShopId, setActiveShopId, isLoading } = useShop();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<ShopLocation | null>(null);
  const utils = trpc.useUtils();
  const update = trpc.locations.update.useMutation({ onSuccess: () => { void utils.locations.list.invalidate(); toast("Shop status updated", { description: "The location availability has changed." }); } });
  const openCreate = () => { setEditing(null); setOpen(true); };
  return <div className="workspace-page"><section className="workspace-header panel-reveal"><div><p className="eyebrow">Multi-shop operations</p><h1>Shops & locations</h1><p>{isAdmin ? "Create locations, designate the active shop, and manage operational availability." : "Switch between the operational locations available to your account."}</p></div>{isAdmin ? <div className="page-actions"><Button className="dark-action" onClick={openCreate}><Plus /> Add shop</Button></div> : null}</section><div className="metric-strip panel-reveal"><div className="mini-metric"><p>Active shops</p><strong>{locations.filter((location) => location.isActive).length}</strong><span className="mini-trend"><Building2 /> Ready to trade</span></div><div className="mini-metric"><p>Archived shops</p><strong>{locations.filter((location) => !location.isActive).length}</strong><span className="mini-trend mini-trend--amber"><Archive /> Kept for history</span></div><div className="mini-metric"><p>Current shop</p><strong>{locations.find((location) => location.id === activeShopId)?.code ?? "—"}</strong><span className="mini-trend mini-trend--blue"><MapPin /> Active workspace</span></div></div><section className="workspace-surface"><div className="surface-heading"><div><p className="card-kicker">Your retail network</p><h2>Shop directory</h2></div></div>{isLoading ? <div className="data-empty"><Loader2 className="animate-spin" /><b>Loading shops</b></div> : locations.length ? <div className="shop-directory">{locations.map((shop) => <article className={shop.id === activeShopId ? "shop-directory-card shop-directory-card--active" : "shop-directory-card"} key={shop.id}><span className="shop-directory-icon"><Building2 /></span><div><b>{shop.name}</b><span>{shop.code} · {shop.isActive ? "Active" : "Archived"}</span></div>{shop.id === activeShopId ? <span className="shop-active-chip"><Check /> Current</span> : shop.isActive ? <button className="soft-button" onClick={() => { setActiveShopId(shop.id); toast("Shop switched", { description: `${shop.name} is now the active workspace.` }); }}>Switch</button> : null}{isAdmin ? <><button className="row-action" aria-label={`Edit ${shop.name}`} onClick={() => { setEditing(shop); setOpen(true); }}><Pencil /></button><button className="row-action" aria-label={shop.isActive ? `Archive ${shop.name}` : `Restore ${shop.name}`} onClick={() => update.mutate({ id: shop.id, isActive: !shop.isActive })}>{shop.isActive ? <Archive /> : <RotateCcw />}</button></> : null}</article>)}</div> : <div className="data-empty"><Building2 /><b>No shops yet</b><span>{isAdmin ? "Add your first shop to begin tracking inventory and trading by location." : "Ask a super-admin to add the first shop."}</span></div>}</section>{isAdmin && open ? <ShopDialog key={editing?.id ?? "new-shop"} open={open} onOpenChange={setOpen} editing={editing} /> : null}</div>;
}
