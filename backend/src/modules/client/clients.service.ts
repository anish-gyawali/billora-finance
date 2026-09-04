import type { Client } from "../../generated/prisma/client.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../common/errors/AppError.js";
import { ClientsRepository, clientsRepository } from "./clients.repository.js";
import type { IClientsRepository } from "./clients.repository.interface.js";
import type {
  CreateClientInput,
  UpdateClientInput,
  QueryClientsInput,
} from "./clients.validation.js";

export interface PaginatedClientsResult {
  clients: Client[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class ClientsService {
  constructor(
    private readonly repository: IClientsRepository = clientsRepository
  ) {}

  /**
   * Create a new client (Nepal or International)
   */
  async createClient(input: CreateClientInput, actorId?: string): Promise<Client> {
    const email = input.billing_email.trim().toLowerCase();

    // 1. Check if email already exists
    const existingByEmail = await this.repository.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictError(`Client with billing email '${email}' already exists`);
    }

    // 2. Check PAN uniqueness if provided
    if (input.pan_number) {
      const existingByPan = await this.repository.findByPanNumber(input.pan_number);
      if (existingByPan) {
        throw new ConflictError(
          `Client with PAN number '${input.pan_number}' already exists`
        );
      }
    }

    // 3. Determine default currency based on country if not explicitly provided
    const isNepal =
      input.country.trim().toLowerCase() === "nepal" ||
      input.country.trim().toLowerCase() === "np";
    const currency = input.currency ?? (isNepal ? "NPR" : "USD");

    // 4. Create client record
    const client = await this.repository.create({
      name: input.name.trim(),
      country: input.country.trim(),
      pan_number: input.pan_number ?? null,
      billing_email: email,
      currency,
    });
    await this.repository.recordAudit({ ...(actorId ? { user_id: actorId } : {}), action: "CLIENT_CREATED", entity_id: client.id, new_value: this.auditValue(client) });
    return client;
  }

  /**
   * Retrieve client details by ID
   */
  async getClientById(id: string): Promise<Client> {
    const client = await this.repository.findById(id);
    if (!client || !client.is_active) {
      throw new NotFoundError(`Client with ID '${id}' not found`);
    }
    return client;
  }

  /**
   * Retrieve list of clients with filtering and pagination
   */
  async getAllClients(params: QueryClientsInput): Promise<PaginatedClientsResult> {
    const { clients, total } = await this.repository.findAll(params);
    const totalPages = Math.ceil(total / params.limit);

    return {
      clients,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages,
        hasNextPage: params.page < totalPages,
        hasPrevPage: params.page > 1 && totalPages > 0,
      },
    };
  }

  /**
   * Update an existing client
   */
  async updateClient(id: string, input: UpdateClientInput, actorId?: string): Promise<Client> {
    // 1. Ensure client exists
    const existing = await this.repository.findById(id);
    if (!existing || !existing.is_active) {
      throw new NotFoundError(`Client with ID '${id}' not found`);
    }

    // 2. Check billing_email uniqueness if changed
    if (
      input.billing_email &&
      input.billing_email.toLowerCase() !== existing.billing_email.toLowerCase()
    ) {
      const emailConflict = await this.repository.findByEmail(input.billing_email);
      if (emailConflict && emailConflict.id !== id) {
        throw new ConflictError(
          `Client with billing email '${input.billing_email}' already exists`
        );
      }
    }

    // 3. Check pan_number uniqueness if changed
    if (input.pan_number && input.pan_number !== existing.pan_number) {
      const panConflict = await this.repository.findByPanNumber(input.pan_number);
      if (panConflict && panConflict.id !== id) {
        throw new ConflictError(
          `Client with PAN number '${input.pan_number}' already exists`
        );
      }
    }

    const finalCountry = input.country?.trim() ?? existing.country;
    const finalPan = input.pan_number !== undefined ? input.pan_number : existing.pan_number;
    const isNepal = ["nepal", "np"].includes(finalCountry.toLowerCase());
    if (isNepal && finalPan && !/^\d{9}$/.test(finalPan)) {
      throw new BadRequestError("Nepal PAN number must be exactly 9 digits");
    }

    // 4. Update fields
    const updated = await this.repository.update(id, {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.country ? { country: input.country.trim() } : {}),
      ...(input.pan_number !== undefined
        ? { pan_number: input.pan_number }
        : {}),
      ...(input.billing_email
        ? { billing_email: input.billing_email.trim().toLowerCase() }
        : {}),
      ...(input.currency ? { currency: input.currency.trim().toUpperCase() } : {}),
    });
    await this.repository.recordAudit({ ...(actorId ? { user_id: actorId } : {}), action: "CLIENT_UPDATED", entity_id: id, old_value: this.auditValue(existing), new_value: this.auditValue(updated) });
    return updated;
  }

  /**
   * Delete a client by ID
   */
  async deleteClient(id: string, actorId?: string): Promise<Client> {
    const existing = await this.repository.findById(id);
    if (!existing || !existing.is_active) {
      throw new NotFoundError(`Client with ID '${id}' not found`);
    }

    const deactivated = await this.repository.deactivate(id);
    await this.repository.recordAudit({ ...(actorId ? { user_id: actorId } : {}), action: "CLIENT_DEACTIVATED", entity_id: id, old_value: this.auditValue(existing), new_value: this.auditValue(deactivated) });
    return deactivated;
  }

  private auditValue(client: Client): Record<string, unknown> {
    return { id: client.id, name: client.name, country: client.country, billing_email: client.billing_email, currency: client.currency, is_active: client.is_active };
  }
}

export const clientsService = new ClientsService();
