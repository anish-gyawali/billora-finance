# Billora Finance — Product Requirements Document (PRD)

**Version:** 1.0.0 (Production Blueprint)  
**Target Organization:** Billora Technologies Pvt. Ltd. (Kathmandu, Nepal)  
**System Classification:** Single-Entity Double-Entry Accounting & Financial Management System  
**Functional Currency:** Nepalese Rupee (NPR)  
**Supported Invoicing Currencies:** NPR, USD  

---

## 1. Executive Summary & Problem Context

Billora Technologies is a 5-person technology outsourcing company serving domestic clients in Nepal (billed in NPR with VAT/PAN) and international clients abroad (billed in USD via international wire/SWIFT).

### 1.1 Core Problems Solved
1. **No Unified Ledger**: Financial operations currently split across ad-hoc spreadsheets.
2. **Tax Compliance Risk**: Manual reconciliation for Nepal Inland Revenue Department (IRD) requirements (13% VAT, TDS on contractor services, rent, and employee salaries).
3. **Multi-Currency Leakage**: Inability to systematically account for realized foreign exchange (FX) gains and losses between invoice issuance and bank settlement.
4. **Lack of Immutability & Auditability**: No tamper-evident history of who created, approved, posted, or modified financial transactions.

### 1.2 System Scope & Philosophy
- **Accounting Invariant Core**: Every financial transaction maps to an immutable, balanced double-entry journal entry ($\sum \text{Debits} = \sum \text{Credits}$).
- **Intentionally Not an ERP**: Avoids premature overhead (no dynamic permission engines, no HR onboarding, no automated bank scrapers, no multi-entity consolidation).
- **Hard-Coded 3-Tier Roles**: Fits a 5-person organization (`founder`, `accountant`, `member`).

---

## 2. User Roles & Permission Matrix

| Module / Action | Founder | Accountant | Member (Developer) |
|---|:---:|:---:|:---:|
| **User & System Administration** | Full CRUD | View Only | None |
| **Chart of Accounts (COA)** | Full CRUD | Full CRUD | None |
| **Open / Close Accounting Periods** | Yes | Yes | None |
| **Manual Journal Entries (Draft & Post)** | Yes | Yes | None |
| **Client Management** | Full CRUD | Full CRUD | None |
| **Invoices (Create, Send, Void)** | Full CRUD | Full CRUD | None |
| **Vendor Management** | Full CRUD | Full CRUD | None |
| **Expenses (Create Draft)** | Yes | Yes | Yes (Self-incurred) |
| **Expenses (Approve & Post to GL)** | Yes | Yes | None |
| **Payments (Record Inbound / Outbound)** | Yes | Yes | None |
| **Salary Runs (Generate, Approve, Post)** | Yes | Yes | None |
| **View Payslips** | All | All | Own Only |
| **Tax Rules (Configure & Verify)** | Yes | Yes | None |
| **Financial Reports (Trial Balance, P&L, BS)**| Yes | Yes | None |
| **Audit Logs** | Full Read | Full Read | None |

---

## 3. Database Schema & Data Models (PostgreSQL + Prisma)

The database consists of 17 relational tables optimized for ACID compliance and transactional consistency.

```
                    ┌─────────────────┐
                    │ AccountingPeriod│
                    └────────┬────────┘
                             │ 1:N
┌─────────────┐     ┌────────┴────────┐     ┌─────────────┐
│    User     │◄────┤  JournalEntry   ├────►│   Account   │
└─────────────┘     └────────┬────────┘     └──────┬──────┘
                             │ 1:N                 │ 1:N
                    ┌────────┴────────┐            │
                    │   JournalLine   ├────────────┘
                    └─────────────────┘
```

### 3.1 Model Catalog

#### `User`
- `id` (UUID, PK)
- `email` (String, Unique)
- `name` (String)
- `password_hash` (String)
- `role` (`UserRole`: `founder`, `accountant`, `member`)
- `bank_account_number` (String)
- `pan_number` (String, Optional)
- `monthly_salary` (Decimal(14,2), Optional)
- `is_active` (Boolean, default: true)
- `mfa_secret` (String, Optional)
- `created_at`, `updated_at` (DateTime)

#### `Account` (Chart of Accounts)
- `id` (UUID, PK)
- `code` (String, Unique) — e.g. "1010", "4010"
- `name` (String)
- `type` (`AccountType`: `asset`, `liability`, `equity`, `revenue`, `expense`)
- `parent_id` (UUID, Optional) — For sub-accounts
- `normal_balance` (`NormalBalance`: `debit`, `credit`)
- `is_active` (Boolean, default: true)

#### `AccountingPeriod`
- `id` (UUID, PK)
- `period_start` (Date)
- `period_end` (Date)
- `status` (`PeriodStatus`: `open`, `closed`)
- Constraint: `UNIQUE(period_start, period_end)`

#### `JournalEntry`
- `id` (UUID, PK)
- `entry_date` (DateTime)
- `period_id` (UUID, FK -> AccountingPeriod)
- `status` (`EntryStatus`: `draft`, `posted`, `reversed`)
- `source_type` (`SourceType`: `invoice`, `expense`, `payment`, `salary_run`, `manual`, `reversal`)
- `source_id` (UUID, Optional)
- `reversed_entry_id` (UUID, Optional) — Self-relation for audit reversals
- `memo` (String, Optional)
- `created_by` (UUID, FK -> User)

#### `JournalLine`
- `id` (UUID, PK)
- `journal_entry_id` (UUID, FK -> JournalEntry, Cascade Delete on Draft)
- `account_id` (UUID, FK -> Account)
- `debit` (Decimal(14,2), default: 0)
- `credit` (Decimal(14,2), default: 0)
- `description` (String, Optional)

#### `Client`
- `id` (UUID, PK)
- `name` (String)
- `country` (String) — "Nepal", "USA", "Australia", etc.
- `pan_number` (String, Optional)
- `billing_email` (String)
- `currency` (String, default: "USD")

#### `Invoice`
- `id` (UUID, PK)
- `client_id` (UUID, FK -> Client)
- `invoice_number` (String, Unique) — Format: `INV-YYYY-XXXX`
- `invoice_date` (DateTime)
- `due_date` (DateTime)
- `currency` (String) — "USD" or "NPR"
- `exchange_rate_to_npr` (Decimal(10,4), Optional) — Rate at invoice date (1.0 for NPR)
- `status` (`InvoiceStatus`: `draft`, `sent`, `partially_paid`, `paid`, `overdue`, `void`)
- `total_amount` (Decimal(14,2)) — In invoice currency
- `paid_amount` (Decimal(14,2), default: 0)
- `journal_entry_id` (UUID, Optional, FK -> JournalEntry)

#### `InvoiceItem`
- `id` (UUID, PK)
- `invoice_id` (UUID, FK -> Invoice)
- `description` (String)
- `quantity` (Int)
- `rate` (Decimal(14,2))
- `amount` (Decimal(14,2))
- `vat_amount` (Decimal(14,2), Optional) — 13% for VAT-applicable domestic invoices

#### `Vendor`
- `id` (UUID, PK)
- `name` (String)
- `pan_number` (String, Optional)
- `vat_number` (String, Optional)
- `contact_info` (String, Optional)

#### `Expense`
- `id` (UUID, PK)
- `expense_date` (DateTime)
- `vendor_id` (UUID, Optional, FK -> Vendor)
- `paid_by_user_id` (UUID, Optional, FK -> User) — If member paid out of pocket
- `payment_account_id` (UUID, Optional, FK -> Account) — GL account of Bank/Cash used
- `status` (`ExpenseStatus`: `draft`, `approved`, `posted`, `reversed`)
- `approved_by` (UUID, Optional, FK -> User)
- `total_amount` (Decimal(14,2)) — In NPR
- `journal_entry_id` (UUID, Optional, FK -> JournalEntry)

#### `ExpenseItem`
- `id` (UUID, PK)
- `expense_id` (UUID, FK -> Expense)
- `account_id` (UUID, FK -> Account) — Expense GL Account (e.g., 5010 Software)
- `description` (String)
- `amount` (Decimal(14,2))
- `vat_amount` (Decimal(14,2), Optional)
- `tds_amount` (Decimal(14,2), Optional)

#### `Payment`
- `id` (UUID, PK)
- `direction` (`PaymentDirection`: `in`, `out`)
- `amount` (Decimal(14,2)) — Original transaction amount
- `currency` (String)
- `payment_date` (DateTime)
- `account_id` (UUID, FK -> Account) — Bank / Cash GL account
- `method` (`PaymentMethod`: `bank_transfer`, `cash`, `international_wire`, `other`)
- `allocated_to_type` (String) — "invoice", "expense", "salary_run", "direct"
- `allocated_to_id` (UUID, Optional)
- `journal_entry_id` (UUID, Optional, FK -> JournalEntry)

#### `SalaryRun`
- `id` (UUID, PK)
- `period_start` (DateTime)
- `period_end` (DateTime)
- `status` (`SalaryStatus`: `draft`, `approved`, `posted`, `paid`)
- `journal_entry_id` (UUID, Optional, FK -> JournalEntry)
- `approved_by` (UUID, Optional, FK -> User)

#### `SalaryItem`
- `id` (UUID, PK)
- `salary_run_id` (UUID, FK -> SalaryRun)
- `user_id` (UUID, FK -> User)
- `gross_amount` (Decimal(14,2))
- `tds_amount` (Decimal(14,2))
- `net_amount` (Decimal(14,2)) — Formula: `gross_amount - tds_amount`
- `paid` (Boolean, default: false)

#### `TaxRule`
- `id` (UUID, PK)
- `tax_type` (`TaxType`: `vat`, `tds_service`, `tds_salary`, `tds_rent`)
- `rate` (Decimal(5,2)) — e.g., 13.00, 1.50, 10.00, 15.00
- `effective_from` (DateTime)
- `effective_to` (DateTime, Optional)
- `notes` (String, Optional)
- `verified_by_accountant` (Boolean, default: false)

#### `Document`
- `id` (UUID, PK)
- `owner_type` (String) — "invoice", "expense", "payment", "salary_run"
- `owner_id` (UUID)
- `file_name` (String)
- `storage_key` (String)
- `mime_type` (String)
- `uploaded_by` (UUID, FK -> User)

#### `AuditLog`
- `id` (UUID, PK)
- `user_id` (UUID, Optional)
- `action` (String) — "CREATE", "UPDATE", "APPROVE", "POST", "REVERSE", "LOCK_PERIOD"
- `entity_type` (String) — "Invoice", "Expense", "JournalEntry", etc.
- `entity_id` (UUID)
- `old_value` (JSONB, Optional)
- `new_value` (JSONB, Optional)
- `created_at` (DateTime, default: now)

#### `BankAccount`
- `id` (UUID, PK)
- `name` (String) — e.g., "Nabil Bank NPR Corporate"
- `bank_name` (String)
- `account_number` (String)
- `currency` (String) — "NPR", "USD"
- `gl_account_id` (UUID, Unique, FK -> Account)

---

## 4. Standard Seed Chart of Accounts (COA)

| Code | Account Name | Type | Normal Balance | Description |
|---|---|---|:---:|---|
| **1010** | Cash on Hand | Asset | Debit | Petty cash for office operations |
| **1020** | Nabil Bank (NPR Operating) | Asset | Debit | Primary domestic transaction account |
| **1030** | Nabil Bank (USD FCY Account) | Asset | Debit | Foreign currency holding account |
| **1200** | Accounts Receivable (Domestic) | Asset | Debit | Unpaid invoices from Nepal clients |
| **1210** | Accounts Receivable (International)| Asset | Debit | Unpaid invoices from foreign clients |
| **1300** | Advances to Staff | Asset | Debit | Temporary advances or reimbursable funds |
| **1400** | Prepaid Expenses | Asset | Debit | Subscriptions or insurance paid ahead |
| **2010** | Accounts Payable (Vendors) | Liability | Credit | Unpaid vendor purchases/bills |
| **2020** | Reimbursable Payable (Employees) | Liability | Credit | Money owed to staff for out-of-pocket expenses |
| **2110** | VAT Payable | Liability | Credit | 13% Output VAT collected on Nepal sales |
| **2120** | TDS Payable — Contractor (1.5%/15%)| Liability | Credit | Withholding tax payable to IRD |
| **2130** | TDS Payable — Salary | Liability | Credit | Employee payroll tax payable to IRD |
| **2140** | TDS Payable — Rent (10%) | Liability | Credit | Rent withholding tax payable to IRD |
| **2200** | Salaries & Wages Payable | Liability | Credit | Net accrued salaries awaiting bank transfer |
| **3010** | Owner's Capital | Equity | Credit | Initial founder capital contribution |
| **3020** | Retained Earnings | Equity | Credit | Cumulative net profit/loss |
| **4010** | Domestic Software Consulting (NPR) | Revenue | Credit | Revenue from Nepal clients |
| **4020** | International Software Outsourcing (USD)| Revenue | Credit | Export revenue from foreign clients |
| **4090** | Realized Foreign Exchange (FX) Gain| Revenue | Credit | Favorable currency conversion difference |
| **5010** | Software & Cloud Infrastructure | Expense | Debit | AWS, Supabase, GitHub, Vercel, Figma |
| **5020** | Staff Salaries & Compensation | Expense | Debit | Gross monthly employee remuneration |
| **5030** | Contractor & Subcontractor Fees | Expense | Debit | External developer or freelance costs |
| **5040** | Office Rent | Expense | Debit | Physical office premises rental |
| **5050** | Utilities & Internet | Expense | Debit | ISP, electricity, drinking water |
| **5060** | Bank Fees & SWIFT Wire Charges | Expense | Debit | Bank handling charges and wire fees |
| **5090** | Realized Foreign Exchange (FX) Loss| Expense | Debit | Unfavorable currency conversion difference |
| **5990** | Miscellaneous Office Expenses | Expense | Debit | Tea, coffee, cleaning, stationery |

---

## 5. Core Accounting Invariants & Business Logic

### Invariant 1: Double-Entry Balance
For any posted journal entry:
$$\sum \text{Debit Amounts} = \sum \text{Credit Amounts}$$
An entry cannot transition to `posted` if $\sum \text{Debit} \ne \sum \text{Credit}$ or if total is 0.

### Invariant 2: Open Period Guard
Transactions can only be posted to a journal if the target date falls within an `AccountingPeriod` where `status === 'open'`. Once an `AccountingPeriod` is `closed`, all write operations affecting that date range are rejected.

### Invariant 3: Immutability & Audit Trail
Once a `JournalEntry` is `posted`:
- It cannot be updated or deleted.
- If an error occurred, an accountant must issue a **Reversal Entry** (`status = 'reversed'`, `source_type = 'reversal'`, `reversed_entry_id = originalEntry.id`), creating an exact offsetting mirror entry.

### Invariant 4: Foreign Exchange (FX) Realization Logic
All general ledger balances are strictly in **NPR**.

1. **Invoice Issuance (USD)**:
   - International client invoiced $\$10,000$ USD when exchange rate is $1 \text{ USD} = 133.50 \text{ NPR}$.
   - Ledger records:
     - **DR** `1210 AR International`: $1,335,000.00 \text{ NPR}$
     - **CR** `4020 Export Revenue`: $1,335,000.00 \text{ NPR}$

2. **Payment Receipt (USD Settled to NPR Bank)**:
   - $\$10,000$ arrives in Nabil Bank when actual bank conversion rate is $1 \text{ USD} = 134.20 \text{ NPR}$ ($1,342,000.00 \text{ NPR}$ deposited).
   - $\text{FX Difference} = 1,342,000 - 1,335,000 = +7,000.00 \text{ NPR}$ (Gain).
   - Ledger records:
     - **DR** `1020 Bank`: $1,342,000.00 \text{ NPR}$
     - **CR** `1210 AR International`: $1,335,000.00 \text{ NPR}$
     - **CR** `4090 Realized FX Gain`: $7,000.00 \text{ NPR}$

If settled at $132.80 \text{ NPR}$ ($1,328,000.00 \text{ NPR}$ deposited):
- $\text{FX Difference} = 1,328,000 - 1,335,000 = -7,000.00 \text{ NPR}$ (Loss).
- Ledger records:
  - **DR** `1020 Bank`: $1,328,000.00 \text{ NPR}$
  - **DR** `5090 Realized FX Loss`: $7,000.00 \text{ NPR}$
  - **CR** `1210 AR International`: $1,335,000.00 \text{ NPR}$

### Invariant 5: Nepal Tax Math (VAT & TDS)

#### 1. Domestic Invoices with VAT:
- Subtotal: $\text{Amount}$
- Output VAT (13%): $\text{VAT} = \text{Subtotal} \times 0.13$
- Total Billed: $\text{Subtotal} + \text{VAT}$
- Ledger Posting on Sent:
  - **DR** `1200 AR Domestic` (Total)
  - **CR** `4010 Domestic Revenue` (Subtotal)
  - **CR** `2110 VAT Payable` (VAT Amount)

#### 2. Vendor Expenses with TDS:
- Bill from Consultant: $100,000.00 \text{ NPR}$ (15% TDS applicable).
- TDS Withheld: $15,000.00 \text{ NPR}$.
- Net Paid to Consultant: $85,000.00 \text{ NPR}$.
- Ledger Posting on Approved Expense:
  - **DR** `5030 Contractor Fees`: $100,000.00 \text{ NPR}$
  - **CR** `2120 TDS Payable Contractor`: $15,000.00 \text{ NPR}$
  - **CR** `1020 Bank` (or `2010 AP`): $85,000.00 \text{ NPR}$

#### 3. Monthly Salary Run:
- Total Gross Salaries: $300,000.00 \text{ NPR}$
- Calculated Total Salary TDS: $25,000.00 \text{ NPR}$
- Net Salaries Disbursed: $275,000.00 \text{ NPR}$
- Ledger Posting on Post Salary Run:
  - **DR** `5020 Staff Salaries Expense`: $300,000.00 \text{ NPR}$
  - **CR** `2130 TDS Payable Salary`: $25,000.00 \text{ NPR}$
  - **CR** `2200 Salaries Payable`: $275,000.00 \text{ NPR}$
- Ledger Posting on Payment Disbursement:
  - **DR** `2200 Salaries Payable`: $275,000.00 \text{ NPR}$
  - **CR** `1020 Bank`: $275,000.00 \text{ NPR}$

---

## 6. Central Posting Engine Specification (`postJournalEntry`)

All financial posting operations must pass through a single, atomic Prisma transaction utility located at:
`backend/src/lib/accounting/postJournalEntry.ts`.

### Interface Signature
```typescript
export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface PostJournalParams {
  entryDate: Date;
  sourceType: "invoice" | "expense" | "payment" | "salary_run" | "manual" | "reversal";
  sourceId?: string;
  memo?: string;
  createdBy: string;
  lines: JournalLineInput[];
}
```

### Execution Steps
1. **Period Check**:
   Find `AccountingPeriod` covering `entryDate`. If not found or `status !== 'open'`, throw `AppError("Accounting period is closed or undefined for this date", 400, "PERIOD_CLOSED")`.
2. **Balance Check**:
   Compute `totalDebit = sum(line.debit)` and `totalCredit = sum(line.credit)`.
   If `Math.abs(totalDebit - totalCredit) > 0.001`, throw `AppError("Journal entry is unbalanced: DR !== CR", 422, "UNBALANCED_JOURNAL")`.
   If `totalDebit <= 0`, throw `AppError("Journal entry cannot have zero value", 422, "ZERO_VALUE_JOURNAL")`.
3. **Database Write (Atomic Transaction)**:
   - Create `JournalEntry` with `status: 'posted'`.
   - Batch insert `JournalLine` items.
   - Return `{ journalEntryId, totalAmount }`.

---

## 7. RESTful API Endpoints Specification

All endpoints are prefixed with `/api/v1`.

### 7.1 Authentication (`/auth`)
- `POST /auth/register` (Founder only, or initial bootstrap)
- `POST /auth/login` (Returns HTTP-only cookie + CSRF / JWT token)
- `POST /auth/logout` (Clears cookies)
- `GET /auth/me` (Returns current user profile & role)
- `POST /auth/mfa/setup` (Generates TOTP secret & QR)
- `POST /auth/mfa/verify` (Verifies TOTP and enables MFA)

### 7.2 Users (`/users`)
- `GET /users` (Founder, Accountant: lists all users)
- `POST /users` (Founder only: creates new employee/accountant)
- `PATCH /users/:id` (Founder only: update role, salary, active status)
- `GET /users/:id/payslips` (Member views own payslips; Accountant/Founder views any)

### 7.3 Chart of Accounts (`/accounts`)
- `GET /accounts` (List all GL accounts with hierarchy and balances)
- `POST /accounts` (Create new GL sub-account)
- `PATCH /accounts/:id` (Update account name/status, cannot alter code/type if transactions exist)

### 7.4 Accounting Periods (`/periods`)
- `GET /periods` (List periods with open/closed status)
- `POST /periods/generate-year` (Generate 12 monthly periods for given Gregorian/Bikram Sambat year)
- `POST /periods/:id/close` (Lock period; requires founder/accountant approval)

### 7.5 Journals (`/journals`)
- `GET /journals` (Paginated list of journal entries, filter by period, source, date)
- `GET /journals/:id` (Full entry detail with lines)
- `POST /journals/manual` (Post manual adjusting journal entry)
- `POST /journals/:id/reverse` (Issue reversal entry for posted journal)

### 7.6 Invoices (`/invoices`)
- `GET /invoices` (Filter by status, client, date range)
- `POST /invoices` (Draft new invoice with line items)
- `PATCH /invoices/:id` (Update draft invoice)
- `POST /invoices/:id/send` (Mark sent, capture exchange rate, post AR to GL)
- `POST /invoices/:id/void` (Void invoice; if posted, reverses GL entry)

### 7.7 Clients (`/clients`)
- `GET /clients` (List clients)
- `POST /clients` (Create client with currency, PAN, billing email)
- `PATCH /clients/:id` (Update client)

### 7.8 Expenses (`/expenses`)
- `GET /expenses` (List expenses; Members only see their submitted expenses)
- `POST /expenses` (Draft expense with items, categories, receipts)
- `POST /expenses/:id/approve` (Founder/Accountant approve & post to GL)
- `DELETE /expenses/:id` (Delete draft expense)

### 7.9 Vendors (`/vendors`)
- `GET /vendors` (List vendors)
- `POST /vendors` (Register vendor with PAN/VAT info)

### 7.10 Payments (`/payments`)
- `GET /payments` (Filter by direction, account, date)
- `POST /payments` (Record inbound client settlement or outbound vendor/salary payment; handles FX calculations and posts to GL)

### 7.11 Salary Management (`/salaries`)
- `GET /salaries` (List monthly salary runs)
- `POST /salaries/generate` (Generate draft salary items for all active employees from `monthly_salary` and tax rules)
- `POST /salaries/:id/approve` (Approve salary run and post liability to GL)
- `POST /salaries/:id/disburse` (Record bank payout and post to GL)

### 7.12 Taxes (`/taxes`)
- `GET /taxes/rules` (Active tax rates: VAT 13%, TDS rates)
- `POST /taxes/rules` (Add or adjust tax rule with effective dates)
- `GET /taxes/summary` (Calculate VAT payable/receivable and TDS withholding liability for a date range)

### 7.13 Reports (`/reports`)
- `GET /reports/trial-balance?asOfDate=YYYY-MM-DD` (Returns all GL accounts with debit/credit totals; must net to 0)
- `GET /reports/profit-and-loss?from=YYYY-MM-DD&to=YYYY-MM-DD` (Income Statement: Revenues - Expenses = Net Income)
- `GET /reports/balance-sheet?asOfDate=YYYY-MM-DD` (Assets = Liabilities + Equity)

### 7.14 Documents (`/documents`)
- `POST /documents/upload` (Upload receipt/invoice PDF, returns storage key)
- `GET /documents/:id` (Get signed download URL)

### 7.15 Audit Logs (`/audit`)
- `GET /audit` (Founder/Accountant view immutable audit history with filters)

---

## 8. Frontend Information Architecture

The frontend is a Next.js (App Router) responsive web application.

```text
/ (redirects to /dashboard or /login)
├── /login
├── /dashboard                  (High-level metrics: Monthly revenue, expenses, net profit, cash balance)
├── /invoices                   (AR overview, create invoice, send invoice, mark paid)
│   ├── /new
│   └── /[id]
├── /expenses                   (AP overview, submit expense, approve queue)
│   ├── /new
│   └── /[id]
├── /payments                   (Money In / Money Out log, record transaction)
├── /salaries                   (Monthly salary runs, employee payslips)
├── /ledger                     (Accountant zone: General Ledger, Chart of Accounts, Journal Entries)
│   ├── /accounts
│   ├── /journals
│   └── /periods
├── /reports                    (Trial Balance, P&L, Balance Sheet, Tax Summary)
├── /settings                   (Company profile, Tax rules, Bank accounts, Users)
└── /my-payslips                (Member view of own salary statements)
```

---

## 9. Security & Production Standards

1. **Structured Logging**: All logs use **Pino** (JSON format in production) with automatic PII redaction (PAN, bank accounts, passwords, tokens) and correlation IDs (`X-Request-Id`).
2. **Strict Environment Validation**: Application fails fast on boot if any required environment variable is missing (via **Zod** in `src/config/env.ts`).
3. **Database Safeguards**:
   - Connection pool managed via `@prisma/adapter-pg` with connection timeouts and health telemetry (`/api/health`).
   - CLI migrations use `DIRECT_URL` (port 5432) to prevent pgbouncer advisory lock failures.
4. **Security Headers & Protection**:
   - **Helmet** for HTTP security headers.
   - **CORS** locked to authorized frontend domains with credentials enabled.
   - **Rate Limiting**: `apiLimiter` (300 req / 15m) and `authLimiter` (20 req / 15m).
5. **No Emojis in Server Logs**: Output uses standard logging terminology (`INFO`, `WARN`, `ERROR`, `FATAL`) for automated log aggregation compliance.

---

## 10. Implementation Sequence (Roadmap)

- [x] **Milestone 0: Database & Server Foundation**
  - Supabase PostgreSQL connection configured with pooler (`DATABASE_URL`) and direct connection (`DIRECT_URL`).
  - Production Express server, Pino logger, Zod env validation, error middleware, and health check.
- [ ] **Milestone 1: Database Seed & Posting Engine**
  - Seed database with standard 30-account Chart of Accounts and default Nepal tax rules.
  - Implement and unit test `postJournalEntry.ts` transactional core.
- [ ] **Milestone 2: Authentication & User Management**
  - Implement JWT authentication, cookie handling, role authorization middleware (`requireRole`).
- [ ] **Milestone 3: Accounting Core (Periods, Accounts, Journals)**
  - Implement endpoints for Period locking, COA hierarchy, manual journals, and real-time Trial Balance.
- [ ] **Milestone 4: Invoicing & Accounts Receivable (AR)**
  - Implement invoice builder, VAT calculation, USD-to-NPR exchange rate capture, payment settlement, and FX gain/loss realization.
- [ ] **Milestone 5: Expenses & Accounts Payable (AP)**
  - Implement member expense submission, receipt upload, founder approval queue, TDS withholding, and GL posting.
- [ ] **Milestone 6: Salary Management & Nepal Tax Compliance**
  - Implement monthly salary runs, TDS deductions, payslip generation, and tax report summaries (VAT/TDS).
- [ ] **Milestone 7: Financial Reporting & Frontend Integration**
  - Implement P&L statement and Balance Sheet queries.
  - Connect Next.js frontend pages to the API.
