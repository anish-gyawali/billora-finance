import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = { eyebrow: string; title: string; description: string; children: ReactNode; footerText: string; footerLink: string; footerHref: string };

export function AuthShell({ eyebrow, title, description, children, footerText, footerLink, footerHref }: AuthShellProps) {
  return <main className="auth-page"><section className="auth-brand-panel"><Link href="/" className="auth-brand" aria-label="Billora Technologies home"><Image src="/logo.png" alt="Billora Technologies" width={52} height={52} priority /><span><strong>Billora</strong><small>Technologies</small></span></Link><div className="auth-brand-copy"><p className="auth-brand-kicker">Finance, with clarity.</p><h2>Make every number<br /><span>move you forward.</span></h2><p>Billora Finance gives ambitious teams a clear, connected view of the money behind their work.</p></div><div className="auth-brand-foot"><span>Web / App / Product</span><span>© 2026 Billora Technologies</span></div></section><section className="auth-form-panel"><div className="auth-form-wrap"><Link href="/" className="auth-mobile-brand"><Image src="/logo.png" alt="Billora Technologies" width={38} height={38} /><span className="font-brand text-xl text-secondary">Billora</span></Link><div className="auth-heading"><p className="section-kicker">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children}<p className="auth-footer-link">{footerText} <Link href={footerHref}>{footerLink}</Link></p></div></section></main>;
}
