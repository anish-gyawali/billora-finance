import type { AccountType } from "../../generated/prisma/enums.js";

export type Money = string;
export interface ReportAccount { account_id: string; account_code: string; account_name: string; account_type: AccountType; debit: Money; credit: Money; balance: Money; }
export interface TrialBalance { accounts: ReportAccount[]; total_debit: Money; total_credit: Money; }
