import type { Client, Prisma } from "../../generated/prisma/client.js";
import type { QueryClientsInput } from "./clients.validation.js";

export interface IClientsRepository {
  create(data: Prisma.ClientCreateInput): Promise<Client>;
  findById(id: string): Promise<Client | null>;
  findByEmail(email: string): Promise<Client | null>;
  findByPanNumber(panNumber: string): Promise<Client | null>;
  findAll(params: QueryClientsInput): Promise<{ clients: Client[]; total: number }>;
  update(id: string, data: Prisma.ClientUpdateInput): Promise<Client>;
  deactivate(id: string): Promise<Client>;
  recordAudit(input: {
    user_id?: string | undefined;
    action: string;
    entity_id: string;
    old_value?: Record<string, unknown>;
    new_value?: Record<string, unknown>;
  }): Promise<void>;
}
