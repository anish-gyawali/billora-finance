"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() { const [showPassword, setShowPassword] = useState(false); return <Card className="auth-card"><CardContent className="space-y-5 p-6 sm:p-8"><form className="space-y-5" action="#" method="post"><div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required /></div><div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="#" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link></div><div className="relative"><Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" className="pr-11" required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-secondary">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="remember" className="h-4 w-4 accent-[var(--primary)]" />Remember me on this device</label><Button type="submit" className="h-11 w-full">Sign in <ArrowRight size={16} /></Button></form><div className="auth-divider"><span>Secure access for your team</span></div><p className="text-center text-xs leading-5 text-slate-500">By continuing, you agree to Billora&apos;s terms and acknowledge the privacy policy.</p></CardContent></Card>; }
