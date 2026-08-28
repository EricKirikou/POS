import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export default function SuperAdminLoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const login = trpc.auth.superAdminLogin.useMutation({
    onSuccess: () => navigate("/"),
    onError: (cause) => setError(cause.message === "Invalid email or password." ? "The email or password is incorrect." : cause.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    login.mutate({ email, password });
  };

  return <main className="min-h-screen bg-[#f4f6f3] px-4 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-[2rem] border border-[#dfe7e1] bg-white shadow-[0_24px_70px_rgba(15,50,35,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-[#123d2b] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7bb33] text-[#123d2b]"><ShieldCheck size={22} /></span><span className="text-xl">Trade<span className="text-[#f7bb33]">Core</span></span></div>
        <div><p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#b8d0c2]">Protected workspace</p><h1 className="max-w-md text-4xl font-semibold leading-tight">A controlled entrance for operational leadership.</h1><p className="mt-5 max-w-md text-base leading-7 text-[#c8dbd0]">Use your assigned super-admin credentials to access location-aware trading, inventory, and team controls.</p></div>
        <p className="text-sm text-[#9bbbab]">TradeCore POS · Secure administrator access</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardHeader className="px-0 pt-0"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#e9f5ee] text-[#1a7151]"><LockKeyhole size={22} /></div><CardTitle className="text-3xl text-[#173629]">Super-admin sign in</CardTitle><CardDescription className="pt-2 text-base leading-6">Enter the credentials assigned to your TradeCore administrator account.</CardDescription></CardHeader>
          <CardContent className="px-0 pb-0"><form className="space-y-5" onSubmit={submit} noValidate>
            <div className="space-y-2"><Label htmlFor="super-admin-email">Email address</Label><Input id="super-admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" required disabled={login.isPending} /></div>
            <div className="space-y-2"><Label htmlFor="super-admin-password">Password</Label><div className="relative"><Input id="super-admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-12" required disabled={login.isPending} /><button type="button" className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            {error ? <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={17} /><span>{error}</span></div> : null}
            <Button className="h-11 w-full bg-[#174d36] text-white hover:bg-[#123d2b]" type="submit" disabled={login.isPending || !email || !password}>{login.isPending ? <><Loader2 className="animate-spin" /> Verifying credentials</> : "Sign in securely"}</Button>
          </form></CardContent>
        </Card>
      </section>
    </div>
  </main>;
}
