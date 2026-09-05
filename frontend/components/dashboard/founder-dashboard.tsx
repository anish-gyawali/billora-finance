"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Bell, ChevronDown, CircleDollarSign, FileText, LogOut, Menu, Plus, Settings, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, type SafeUser } from "@/lib/api-client";

const cashFlow = [{ month: "Jan", income: 38, expenses: 21 }, { month: "Feb", income: 44, expenses: 24 }, { month: "Mar", income: 41, expenses: 19 }, { month: "Apr", income: 52, expenses: 28 }, { month: "May", income: 48, expenses: 25 }, { month: "Jun", income: 63, expenses: 31 }];
const revenue = [{ month: "Jan", value: 34 }, { month: "Feb", value: 42 }, { month: "Mar", value: 38 }, { month: "Apr", value: 51 }, { month: "May", value: 48 }, { month: "Jun", value: 62 }];

const activities = [{ title: "Invoice INV-1048 paid", detail: "Acme Labs · 2 hours ago", amount: "+$12,480", positive: true }, { title: "Cloud infrastructure expense", detail: "AWS · Yesterday", amount: "-$1,240", positive: false }, { title: "Invoice INV-1047 sent", detail: "Northstar Studio · Yesterday", amount: "$8,900", positive: true }];

function formatName(user: SafeUser) { return user.name?.split(" ")[0] || "Founder"; }

export function FounderDashboard() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => { getCurrentUser().then((currentUser) => { if (currentUser.role !== "founder") { window.location.assign(`/${currentUser.role}`); return; } setUser(currentUser); }).catch(() => setSessionError("Your session could not be verified. Please sign in again.")).finally(() => setIsLoading(false)); }, []);

  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>(".dashboard-sidebar");
    if (!sidebar || sidebar.querySelector(".dashboard-sidebar-toggle")) return;
    const toggle = document.createElement("button");
    toggle.className = "dashboard-sidebar-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Collapse sidebar");
    toggle.setAttribute("title", "Collapse sidebar");
    toggle.textContent = "<";
    toggle.addEventListener("click", () => {
      const isCollapsed = sidebar.classList.toggle("is-collapsed");
      toggle.textContent = isCollapsed ? ">" : "<";
      toggle.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
      toggle.setAttribute("title", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
    });
    sidebar.append(toggle);
    return () => toggle.remove();
  }, [isLoading]);

  if (isLoading) return <main className="dashboard-loading"><Skeleton className="h-8 w-56" /><Skeleton className="mt-3 h-4 w-72" /><div className="mt-10 grid gap-5 md:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></main>;
  if (sessionError) return <main className="dashboard-loading"><Card className="max-w-md"><CardContent className="p-8"><p className="text-sm text-red-700">{sessionError}</p><Link href="/login" className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">Return to login</Link></CardContent></Card></main>;

  return <main className="dashboard-page"><aside className="dashboard-sidebar"><Link href="/" className="dashboard-logo"><Image src="/logo.png" alt="Billora Technologies" width={40} height={40} style={{ height: "auto" }} /><span><strong>Billora</strong><small>Finance</small></span></Link><nav className="dashboard-nav" aria-label="Finance navigation"><p>Overview</p><Link className="active" href="/founder"><CircleDollarSign size={17} /> Dashboard</Link><p>Workspace</p><Link href="#"><FileText size={17} /> Invoices <span>12</span></Link><Link href="#"><Wallet size={17} /> Expenses</Link><Link href="#"><TrendingUp size={17} /> Reports</Link><p>Manage</p><Link href="#"><Settings size={17} /> Settings</Link></nav><Link href="/logout" className="dashboard-logout"><LogOut size={17} /> Log out</Link></aside><section className="dashboard-content"><header className="dashboard-header"><button className="dashboard-mobile-menu" type="button" aria-label="Open navigation"><Menu size={22} /></button><div><p className="dashboard-overline">Friday, September 5, 2026</p><h1>Good morning, {formatName(user as SafeUser)}.</h1></div><div className="dashboard-header-actions"><button className="dashboard-icon-button" type="button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="dashboard-user"><span>{user?.name?.slice(0, 2).toUpperCase() ?? "FO"}</span><div><strong>{user?.name ?? "Founder"}</strong><small>Founder</small></div><ChevronDown size={15} /></div></div></header><div className="dashboard-main"><div className="dashboard-title-row"><div><p className="section-kicker">Business overview</p><h2>See the bigger picture.</h2></div><Button><Plus size={16} /> New transaction</Button></div><div className="dashboard-stat-grid"><StatCard label="Total revenue" value="$284,920" trend="+18.4%" positive icon={<TrendingUp size={18} />} /><StatCard label="Outstanding invoices" value="$48,260" trend="8 invoices" icon={<FileText size={18} />} /><StatCard label="Total expenses" value="$96,440" trend="-6.2%" positive icon={<TrendingDown size={18} />} /><StatCard label="Cash on hand" value="$612,840" trend="Healthy" positive icon={<Wallet size={18} />} /></div><div className="dashboard-chart-grid"><Card><CardHeader className="dashboard-card-header"><div><CardTitle>Cash flow</CardTitle><p>Income vs. expenses · Last 6 months</p></div><Badge variant="outline">2026 <ChevronDown size={13} /></Badge></CardHeader><CardContent className="h-72 pl-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cashFlow} margin={{ top: 12, right: 18, left: -14, bottom: 0 }}><defs><linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF4136" stopOpacity={.22} /><stop offset="100%" stopColor="#FF4136" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#D9E1E8" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} tickFormatter={(value) => `$${value}k`} /><Tooltip contentStyle={{ border: "1px solid #D9E1E8", borderRadius: 10, fontSize: 12 }} /><Area type="monotone" dataKey="income" stroke="#FF4136" fill="url(#income-fill)" strokeWidth={3} /><Area type="monotone" dataKey="expenses" stroke="#001F3F" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></CardContent></Card><Card><CardHeader className="dashboard-card-header"><div><CardTitle>Revenue growth</CardTitle><p>Monthly revenue performance</p></div><ArrowUpRight className="text-success" size={18} /></CardHeader><CardContent className="h-72 pl-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={revenue} margin={{ top: 12, right: 18, left: -14, bottom: 0 }}><CartesianGrid stroke="#D9E1E8" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} tickFormatter={(value) => `$${value}k`} /><Tooltip cursor={{ fill: "#F7F9FC" }} contentStyle={{ border: "1px solid #D9E1E8", borderRadius: 10, fontSize: 12 }} /><Bar dataKey="value" fill="#001F3F" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card></div><div className="dashboard-bottom-grid"><Card><CardHeader className="dashboard-card-header"><div><CardTitle>Recent activity</CardTitle><p>Your latest financial events</p></div><Link href="#" className="dashboard-view-link">View all</Link></CardHeader><CardContent className="p-0">{activities.map((activity) => <div className="activity-row" key={activity.title}><span className={`activity-icon ${activity.positive ? "positive" : "negative"}`}>{activity.positive ? <ArrowUpRight size={16} /> : <TrendingDown size={16} />}</span><div><strong>{activity.title}</strong><small>{activity.detail}</small></div><b className={activity.positive ? "positive-text" : "negative-text"}>{activity.amount}</b></div>)}</CardContent></Card><Card><CardHeader className="dashboard-card-header"><div><CardTitle>Quick actions</CardTitle><p>Keep your books moving</p></div></CardHeader><CardContent className="quick-actions"><Link href="#"><span className="quick-icon coral"><FileText size={18} /></span><span><strong>Create invoice</strong><small>Bill a client for your work</small></span><ArrowUpRight size={16} /></Link><Link href="#"><span className="quick-icon navy"><Wallet size={18} /></span><span><strong>Record expense</strong><small>Keep spending up to date</small></span><ArrowUpRight size={16} /></Link><Link href="#"><span className="quick-icon blue"><CircleDollarSign size={18} /></span><span><strong>View reports</strong><small>Understand your performance</small></span><ArrowUpRight size={16} /></Link></CardContent></Card></div></div></section></main>;
}

function StatCard({ label, value, trend, positive, icon }: { label: string; value: string; trend: string; positive?: boolean; icon: ReactNode }) { return <Card className="dashboard-stat-card"><CardContent className="p-5"><div className="stat-card-top"><span>{icon}</span><small>{label}</small></div><strong>{value}</strong><p className={positive ? "positive-text" : "stat-neutral"}>{positive && <ArrowUpRight size={13} />}{trend}</p></CardContent></Card>; }
