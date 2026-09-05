import Link from "next/link";

export default function RegisterPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm"><p className="font-brand text-3xl text-secondary">Billora</p><h1 className="mt-8 text-2xl font-semibold">Start with Billora</h1><p className="mt-2 text-sm text-slate-500">Account registration will be connected to the Billora Finance backend in the authentication phase.</p><Link className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white" href="/">Back to home</Link></div></main>;
}
