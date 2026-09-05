import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return <AuthShell eyebrow="Welcome back" title="Sign in to Billora Finance" description="Your team's financial command center is ready when you are." footerText="New to Billora?" footerLink="Create an account" footerHref="/register"><LoginForm /></AuthShell>;
}
