# Backend API Endpoint Inventory

Inventory derived from the route modules and mounts in `src/app.ts`. The `/api` routes are the primary API. Auth routes are also mounted under `/auth`; financial routes are also mounted without `/api` for local/mobile compatibility.

## Auth

- `POST /api/auth/register` | public, auth rate-limited | body: register payload
- `POST /api/auth/login` | public, auth rate-limited | body: email, password
- `POST /api/auth/logout` | public/session, auth rate-limited | body: optional csrfToken
- `POST /api/auth/refresh` | refresh-token cookie, auth rate-limited | no body
- `POST /api/auth/change-password` | authenticated; required after founder provisioning | body: currentPassword, newPassword, newPasswordConfirm
- `GET /api/auth/me` | authenticated | no parameters

## Accounts

- `GET /api/chart-of-accounts` | founder/accountant | query: account filters, pagination
- `POST /api/chart-of-accounts` | founder | body: account payload
- `GET /api/chart-of-accounts/:id` | founder/accountant | path: UUID id
- `PUT /api/chart-of-accounts/:id` | founder | path: UUID id, body: account update
- `DELETE /api/chart-of-accounts/:id` | founder | path: UUID id

`/api/accounts` and the non-API `/chart-of-accounts` and `/accounts` mounts expose the same handlers.

## Accounting Periods

- `GET /api/periods` | founder/accountant | query: period filters, pagination
- `GET /api/periods/:id` | founder/accountant | path: UUID id
- `POST /api/periods` | founder | body: period payload
- `POST /api/periods/:id/close` | founder | path: UUID id

## Journal Entries and Lines

- `GET /api/journal-entries` | founder/accountant | query: entry filters, pagination
- `GET /api/journal-entries/:id` | founder/accountant | path: UUID id
- `POST /api/journal-entries` | founder/accountant | body: journal entry payload
- `PATCH /api/journal-entries/:id` | founder/accountant | path: UUID id, body: entry update
- `POST /api/journal-entries/:id/post` | founder/accountant | path: UUID id
- `POST /api/journal-entries/:id/reverse` | founder/accountant | path: UUID id, body: reversal payload
- `POST /api/journal-lines` | founder/accountant | body: journal line payload
- `GET /api/journal-lines/:id` | founder/accountant | path: UUID id
- `PATCH /api/journal-lines/:id` | founder/accountant | path: UUID id, body: line update
- `DELETE /api/journal-lines/:id` | founder/accountant | path: UUID id

## Clients

- `POST /api/clients` | founder/accountant | body: client payload
- `GET /api/clients` | founder/accountant | query: search, filters, pagination
- `GET /api/clients/:id` | founder/accountant | path: UUID id
- `PATCH /api/clients/:id` | founder/accountant | path: UUID id, body: client update
- `DELETE /api/clients/:id` | founder | path: UUID id

`/api/client`, `/clients`, and `/client` expose the same handlers.

## Invoices

- `GET /api/invoices/ar-aging` | founder/accountant
- `GET /api/invoices/overdue` | founder/accountant
- `GET /api/invoices` | founder/accountant | query: invoice filters, pagination
- `POST /api/invoices` | founder/accountant | body: invoice payload
- `GET /api/invoices/:id` | founder/accountant | path: UUID id
- `PATCH /api/invoices/:id` | founder/accountant | path: UUID id, body: invoice update
- `POST /api/invoices/:id/send` | founder/accountant | path: UUID id
- `POST /api/invoices/:id/payments` | founder/accountant | path: UUID id, body: payment payload
- `POST /api/invoices/:id/void` | founder/accountant | path: UUID id

## Vendors

- `GET /api/vendors` | founder/accountant | query: vendor filters, pagination
- `POST /api/vendors` | founder/accountant | body: vendor payload
- `GET /api/vendors/:id` | founder/accountant | path: UUID id
- `PUT /api/vendors/:id` | founder/accountant | path: UUID id, body: vendor update

## Expenses

- `GET /api/expenses` | authenticated | query: expense filters, pagination
- `POST /api/expenses` | authenticated | body: expense payload
- `GET /api/expenses/:id` | authenticated | path: UUID id
- `PUT /api/expenses/:id` | authenticated | path: UUID id, body: expense update
- `POST /api/expenses/:id/approve` | founder/accountant | path: UUID id
- `POST /api/expenses/:id/post` | founder/accountant | path: UUID id

## Payments

- `GET /api/payments` | founder/accountant | query: payment filters, pagination
- `POST /api/payments` | founder/accountant | body: payment payload; optional `Idempotency-Key` header prevents duplicate retries
- `GET /api/payments/:id` | founder/accountant | path: UUID id
- `PUT /api/payments/:id` | founder/accountant | path: UUID id, body: payment update

## Salary Runs and Items

- `GET /api/salary-runs` | founder/accountant | query: salary-run filters, pagination
- `POST /api/salary-runs` | founder/accountant | body: salary-run payload
- `GET /api/salary-runs/:id` | founder/accountant | path: UUID id
- `PUT /api/salary-runs/:id` | founder/accountant | path: UUID id, body: salary-run update
- `PUT /api/salary-runs/:id/approve` | founder/accountant | path: UUID id
- `PUT /api/salary-runs/:id/post` | founder/accountant | path: UUID id
- `PUT /api/salary-runs/:id/pay` | founder/accountant | path: UUID id
- `GET /api/salary-runs/:salaryRunId/items` | founder/accountant | path: UUID salaryRunId
- `POST /api/salary-runs/:salaryRunId/items` | founder/accountant | path: UUID salaryRunId, body: salary item
- `PUT /api/salary-runs/:salaryRunId/items/:itemId` | founder/accountant | path: UUID salaryRunId and itemId, body: item update
- `DELETE /api/salary-runs/:salaryRunId/items/:itemId` | founder/accountant | path: UUID salaryRunId and itemId

## Bank Accounts

- `GET /api/bank-accounts` | authenticated | query: bank-account filters
- `POST /api/bank-accounts` | founder/accountant | body: bank-account payload
- `GET /api/bank-accounts/:id/balance` | authenticated | path: UUID id
- `GET /api/bank-accounts/:id` | authenticated | path: UUID id
- `PUT /api/bank-accounts/:id` | founder | path: UUID id, body: bank-account update
- `DELETE /api/bank-accounts/:id` | founder | path: UUID id

## Tax Rules

- `GET /api/tax-rules` | authenticated | query: tax filters
- `POST /api/tax-rules` | founder/accountant | body: tax-rule payload
- `GET /api/tax-rules/applicable` | authenticated | query: applicable tax parameters
- `GET /api/tax-rules/history/:tax_type` | authenticated | path: tax_type enum
- `GET /api/tax-rules/:id` | authenticated | path: UUID id
- `PUT /api/tax-rules/:id` | founder/accountant | path: UUID id, body: tax-rule update
- `POST /api/tax-rules/:id/verify` | founder/accountant | path: UUID id, body: verification payload
- `DELETE /api/tax-rules/:id` | founder | path: UUID id

## Audit Logs

- `GET /api/audit-log` | authenticated | query: audit filters, pagination
- `GET /api/audit-log/summary` | founder/accountant | query: summary filters
- `GET /api/audit-log/errors` | founder | query: audit filters
- `GET /api/audit-log/export` | founder | query: audit export filters and format
- `GET /api/audit-log/entity/:type/:id` | authenticated | path: entity type and UUID id
- `GET /api/audit-log/user/:userId` | authenticated | path: UUID userId

## Reports

- `GET /api/reports/trial-balance` | founder/accountant | query: date filters
- `GET /api/reports/profit-loss` | founder/accountant | query: date filters
- `GET /api/reports/balance-sheet` | founder/accountant | query: as-of date

## Users

- `GET /api/users` | founder | query: user filters, pagination
- `POST /api/users` | founder | body: user payload
- `POST /api/users/:id/reset-password` | founder | body: password, passwordConfirm; revokes sessions and requires first-login change
- `GET /api/users/:id` | founder | path: UUID id
- `PATCH /api/users/:id` | founder | path: UUID id, body: user update

## Documents

- `GET /api/documents` | authenticated | query: document filters
- `POST /api/documents` | authenticated | body: document payload
- `GET /api/documents/:id` | authenticated | path: UUID id
- `DELETE /api/documents/:id` | authenticated | path: UUID id

## Infrastructure

- `GET /api/health` | public | read-only database health check
- `GET /` | public | service metadata
