import type { Prisma, Client } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../config/logger.js";
import { ConflictError, InternalServerError, NotFoundError } from "../../common/errors/AppError.js";
import type { IClientsRepository } from "./clients.repository.interface.js";
import type { QueryClientsInput } from "./clients.validation.js";

export class ClientsRepository implements IClientsRepository {
  async create(data: Prisma.ClientCreateInput): Promise<Client> {
    try {
      return await prisma.client.create({ data });
    } catch (error) {
      if (this.isPrismaCode(error, "P2002")) {
        throw new ConflictError("A client with the same billing email or PAN already exists");
      }
      logger.error({ err: error }, "DB error creating client");
      throw new InternalServerError("Failed to create client");
    }
  }

  async findById(id: string): Promise<Client | null> {
    try {
      return await prisma.client.findUnique({ where: { id } });
    } catch (error) {
      logger.error({ err: error, id }, "DB error finding client by ID");
      throw new InternalServerError("Failed to fetch client");
    }
  }

  async findByEmail(email: string): Promise<Client | null> {
    try {
      return await prisma.client.findFirst({ where: { billing_email: email.toLowerCase() } });
    } catch (error) {
      logger.error({ err: error, email }, "DB error finding client by email");
      throw new InternalServerError("Failed to query client");
    }
  }

  async findByPanNumber(panNumber: string): Promise<Client | null> {
    try {
      return await prisma.client.findFirst({
        where: { pan_number: panNumber },
      });
    } catch (error) {
      logger.error({ err: error }, "DB error finding client by PAN");
      throw new InternalServerError("Failed to query client");
    }
  }

  async findAll(params: QueryClientsInput): Promise<{ clients: Client[]; total: number }> {
    const { page, limit, search, country, currency, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = { is_active: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { billing_email: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
        { pan_number: { contains: search, mode: "insensitive" } },
      ];
    }

    if (country) {
      where.country = { equals: country, mode: "insensitive" };
    }

    if (currency) {
      where.currency = { equals: currency, mode: "insensitive" };
    }

    try {
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        prisma.client.count({ where }),
      ]);

      return { clients, total };
    } catch (error) {
      logger.error({ err: error, params }, "DB error listing clients");
      throw new InternalServerError("Failed to list clients");
    }
  }

  async update(id: string, data: Prisma.ClientUpdateInput): Promise<Client> {
    try {
      return await prisma.client.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      if (this.isPrismaCode(error, "P2002")) {
        throw new ConflictError("A client with the same billing email or PAN already exists");
      }
      if (this.isPrismaCode(error, "P2025")) {
        throw new NotFoundError(`Client with ID '${id}' not found`);
      }
      logger.error({ err: error, id }, "DB error updating client");
      throw new InternalServerError("Failed to update client");
    }
  }

  async deactivate(id: string): Promise<Client> {
    try {
      return await prisma.client.update({
        where: { id },
        data: { is_active: false, deleted_at: new Date(), updated_at: new Date() },
      });
    } catch (error) {
      if (this.isPrismaCode(error, "P2025")) {
        throw new NotFoundError(`Client with ID '${id}' not found`);
      }
      logger.error({ err: error, id }, "DB error deactivating client");
      throw new InternalServerError("Failed to deactivate client");
    }
  }

  async recordAudit(input: {
    user_id?: string | undefined;
    action: string;
    entity_id: string;
    old_value?: Record<string, unknown>;
    new_value?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const data: Prisma.AuditLogCreateInput = {
        user_id: input.user_id ?? null,
        action: input.action,
        entity_type: "Client",
        entity_id: input.entity_id,
      };
      if (input.old_value !== undefined) data.old_value = input.old_value as Prisma.InputJsonValue;
      if (input.new_value !== undefined) data.new_value = input.new_value as Prisma.InputJsonValue;
      await prisma.auditLog.create({ data });
    } catch (error) {
      logger.error({ err: error, clientId: input.entity_id, action: input.action }, "Failed to write client audit log");
    }
  }

  private isPrismaCode(error: unknown, code: string): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === code;
  }
}

export const clientsRepository = new ClientsRepository();
