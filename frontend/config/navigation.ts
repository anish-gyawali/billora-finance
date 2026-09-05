export const navigationGroups = [
  {
    label: "Workspace",
    items: ["dashboard", "clients", "vendors", "invoices", "expenses", "payments"],
  },
  {
    label: "Finance",
    items: ["accounts", "periods", "journal-entries", "salary-runs", "bank-accounts", "tax-rules", "reports"],
  },
  {
    label: "Administration",
    items: ["documents", "users", "audit-logs"],
  },
] as const;

export type NavigationKey = (typeof navigationGroups)[number]["items"][number];
