const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error?: { code?: string; message?: string; requestId?: string; details?: Array<{ message?: string }> } };
export type SafeUser = { id: string; email: string; name: string; role: "founder" | "accountant" | "member"; must_change_password?: boolean };

export type ProfitLoss = {
  revenue: Array<{ account_id: string; account_code: string; account_name: string; account_type: string; debit: string; credit: string; balance: string }>;
  expenses: Array<{ account_id: string; account_code: string; account_name: string; account_type: string; debit: string; credit: string; balance: string }>;
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
  netLoss: string;
};

export type BalanceSheet = {
  assets: Array<{ account_id: string; account_code: string; account_name: string; account_type: string; debit: string; credit: string; balance: string }>;
  liabilities: Array<{ account_id: string; account_code: string; account_name: string; account_type: string; debit: string; credit: string; balance: string }>;
  equity: Array<{ account_id: string; account_code: string; account_name: string; account_type: string; debit: string; credit: string; balance: string }>;
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  isBalanced: boolean;
  difference: string;
};

export type BankAccount = {
  id: string;
  name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  gl_account_id: string;
  is_active: boolean;
  balance?: { debit: string; credit: string; balance: string };
};

export type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  client: { id: string; name: string };
  invoice_date: string;
  due_date: string;
  currency: string;
  exchange_rate_to_npr: string | null;
  status: string;
  total_amount: string;
  paid_amount: string;
  journal_entry_id: string | null;
};

export type Expense = {
  id: string;
  expense_date: string;
  vendor_id: string | null;
  vendor: { id: string; name: string } | null;
  paid_by_user_id: string | null;
  paid_by_user: { id: string; name: string } | null;
  status: string;
  total_amount: string;
  journal_entry_id: string | null;
};

export type JournalEntry = {
  id: string;
  entry_date: string;
  period_id: string;
  status: string;
  source_type: string;
  source_id: string | null;
  memo: string | null;
  created_by: string;
  total_debit: string;
  total_credit: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "founder" | "accountant" | "member";
  is_active: boolean;
  created_at: string;
  pan_number: string | null;
  monthly_salary: string | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

let csrfToken: string | null = null;

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiFailure | null;
  const error = body?.error;
  const detail = error?.details?.map((item) => item.message).filter(Boolean).join(" ");
  return [error?.message, detail].filter(Boolean).join(" ") || "Something went wrong. Please try again.";
}

export async function initializeCsrf() {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: "include" });
  } catch {
    throw new Error(`Billora API is unavailable at ${API_BASE_URL}. Start the backend and try again.`);
  }
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as ApiSuccess<{ csrfToken: string }>;
  csrfToken = body.data.csrfToken;
  return csrfToken;
}

async function request<T>(path: string, init: RequestInit = {}, hasRetried = false): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!csrfToken) await initializeCsrf();
    headers.set("X-CSRF-Token", csrfToken ?? "");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && !hasRetried && path !== "/api/auth/login") {
    await fetch(`${API_BASE_URL}/api/auth/refresh`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrfToken ?? "" } });
    return request<T>(path, init, true);
  }
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export async function login(email: string, password: string) {
  await initializeCsrf();
  const response = await request<ApiSuccess<{ user: SafeUser }>>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  return response.data.user;
}

export async function getCurrentUser() {
  const response = await request<ApiSuccess<{ user: SafeUser }>>("/api/auth/me");
  return response.data.user;
}

export async function getProfitLoss(from: string, to: string) {
  const response = await request<ApiSuccess<ProfitLoss>>(`/api/reports/profit-loss?from=${from}&to=${to}`);
  return response.data;
}

export async function getBalanceSheet(asOf: string) {
  const response = await request<ApiSuccess<BalanceSheet>>(`/api/reports/balance-sheet?as_of=${asOf}`);
  return response.data;
}

export async function getBankAccounts() {
  const response = await request<ApiSuccess<PaginatedResponse<BankAccount>>>("/api/bank-accounts");
  return response.data;
}

export async function getBankAccountBalance(id: string) {
  const response = await request<ApiSuccess<{ bank_account_id: string; currency: string; debit: string; credit: string; balance: string }>>(`/api/bank-accounts/${id}/balance`);
  return response.data;
}

export async function getInvoices(params?: { status?: string; limit?: number; page?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", params.limit.toString());
  if (params?.page) search.set("page", params.page.toString());
  const response = await request<ApiSuccess<PaginatedResponse<Invoice>>>(`/api/invoices?${search.toString()}`);
  return response.data;
}

export async function getExpenses(params?: { status?: string; limit?: number; page?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", params.limit.toString());
  if (params?.page) search.set("page", params.page.toString());
  const response = await request<ApiSuccess<PaginatedResponse<Expense>>>(`/api/expenses?${search.toString()}`);
  return response.data;
}

export async function getJournalEntries(params?: { status?: string; limit?: number; page?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", params.limit.toString());
  if (params?.page) search.set("page", params.page.toString());
  const response = await request<ApiSuccess<PaginatedResponse<JournalEntry>>>(`/api/journal-entries?${search.toString()}`);
  return response.data;
}

export async function getUsers(params?: { role?: string; is_active?: boolean; limit?: number; page?: number }) {
  const search = new URLSearchParams();
  if (params?.role) search.set("role", params.role);
  if (params?.is_active !== undefined) search.set("is_active", params.is_active.toString());
  if (params?.limit) search.set("limit", params.limit.toString());
  if (params?.page) search.set("page", params.page.toString());
  const response = await request<ApiSuccess<PaginatedResponse<User>>>(`/api/users?${search.toString()}`);
  return response.data;
}

export async function createUser(data: { name: string; email: string; password: string; confirmPassword: string; role: "founder" | "accountant" | "member"; pan_number?: string; monthly_salary?: string }) {
  const response = await request<ApiSuccess<{ user: User }>>("/api/users", { method: "POST", body: JSON.stringify(data) });
  return response.data.user;
}

export async function updateUser(id: string, data: Partial<User>) {
  const response = await request<ApiSuccess<{ user: User }>>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  return response.data.user;
}

export async function resetUserPassword(id: string, newPassword: string, confirmPassword: string) {
  const response = await request<ApiSuccess<{ user: User }>>(`/api/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword, confirmPassword }) });
  return response.data.user;
}

export async function logout() {
  await request<ApiSuccess<{ message: string }>>("/api/auth/logout", { method: "POST" });
  csrfToken = null;
}
