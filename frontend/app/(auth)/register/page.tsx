import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return <AuthShell eyebrow="Start building" title="Create your Billora account" description="Bring your team, clients, and financial operations into one clear workspace." footerText="Already have an account?" footerLink="Sign in" footerHref="/login"><RegisterForm /></AuthShell>;
}
