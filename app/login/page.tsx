"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { saveAuth, roleRedirect } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      const { data } = await api.post("/auth/token", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      saveAuth({ email, role: data.role, importer_account: data.importer_account, access_token: data.access_token, permissions: data.permissions ?? [] });
      router.push(roleRedirect(data.role));
    } catch (err: unknown) {
      const status = err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
      setError(status === 401 || status === 400 ? "The email or password is incorrect." : "We could not connect to the CRM. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#F3F7F8] lg:grid-cols-[minmax(360px,0.8fr)_minmax(520px,1.2fr)]">
      <section className="hidden bg-[#0A2330] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/12">
            <Image src="/brand/surfgistics-mark.png" alt="" width={42} height={42} priority className="h-[42px] w-[42px] object-contain" />
          </div>
          <div>
            <p className="text-lg font-bold">Surfgistics</p>
            <p className="text-xs font-semibold uppercase text-cyan-200/60">Trade operations</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="text-[11px] font-bold uppercase text-cyan-300/70">Connected operations</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">Every shipment, document, and filing in one place.</h1>
          <p className="mt-4 text-sm leading-6 text-white/55">Keep imports moving with a clear view from ISF intake through Acelynk processing.</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-white/45">
          <ShieldCheck className="h-4 w-4 text-emerald-300" /> Secure customs operations workspace
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0A2330]">
              <Image src="/brand/surfgistics-mark.png" alt="" width={38} height={38} priority className="h-[38px] w-[38px] object-contain" />
            </div>
            <div><p className="font-bold text-[#142B35]">Surfgistics</p><p className="text-[10px] font-bold uppercase text-[#70858D]">Trade operations</p></div>
          </div>

          <div className="mb-7">
            <p className="text-[11px] font-bold uppercase text-[#0C91B6]">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold text-[#142B35]">Sign in to your workspace</h2>
            <p className="mt-2 text-sm text-[#607780]">Use your Surfgistics account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#3F5963]">Email address</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8DA1A8]" />
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@company.com" className="h-11 w-full rounded-md border border-[#CFDDE1] bg-white pl-10 pr-3 text-sm text-[#142B35] outline-none placeholder:text-[#9AACB2] focus:border-[#0C91B6] focus:ring-2 focus:ring-[#0C91B6]/15" />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#3F5963]">Password</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8DA1A8]" />
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" className="h-11 w-full rounded-md border border-[#CFDDE1] bg-white pl-10 pr-11 text-sm text-[#142B35] outline-none placeholder:text-[#9AACB2] focus:border-[#0C91B6] focus:ring-2 focus:ring-[#0C91B6]/15" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-[#71858D] hover:bg-[#EDF3F4]" title={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}

            <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center rounded-md bg-[#087FA3] text-sm font-bold text-white transition-colors hover:bg-[#076C8B] disabled:cursor-wait disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#8A9DA4]">Need access? Contact your Surfgistics administrator.</p>
        </div>
      </section>
    </main>
  );
}
