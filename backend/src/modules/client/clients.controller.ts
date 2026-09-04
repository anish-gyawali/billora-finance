import type { Request, Response, NextFunction } from "express";
import { ClientsService, clientsService } from "./clients.service.js";
import type {
  CreateClientInput,
  UpdateClientInput,
  QueryClientsInput,
} from "./clients.validation.js";
import type { ApiResponse } from "../../common/types/index.js";
import type { Client } from "../../generated/prisma/client.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../common/errors/AppError.js";

export class ClientsController {
  constructor(private readonly service: ClientsService = clientsService) {}

  /**
   * Helper to extract Request ID
   */
  private getRequestId(req: Request): string {
    return (
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown"
    );
  }

  /**
   * POST /api/clients - Create a new client
   */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestId = this.getRequestId(req);
    const startTime = Date.now();

    try {
      const input = req.body as CreateClientInput;
      const client = await this.service.createClient(input, req.user?.userId);

      const response: ApiResponse<Client> = {
        success: true,
        data: client,
        meta: { requestId, durationMs: Date.now() - startTime },
      };

      logger.info(
        { requestId, clientId: client.id },
        "Client created successfully"
      );

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(
          { requestId, errorCode: error.code, message: error.message },
          "Failed to create client"
        );
      } else {
        logger.error({ requestId, err: error }, "Unexpected error creating client");
      }
      next(error);
    }
  };

  /**
   * GET /api/clients - Get all clients with filters & pagination
   */
  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestId = this.getRequestId(req);
    const startTime = Date.now();

    try {
      const query = (req.query as unknown) as QueryClientsInput;
      const result = await this.service.getAllClients(query);

      const response: ApiResponse<Client[]> = {
        success: true,
        data: result.clients,
        meta: {
          requestId,
          durationMs: Date.now() - startTime,
          pagination: result.pagination,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error({ requestId, err: error }, "Error fetching clients");
      next(error);
    }
  };

  /**
   * GET /api/clients/:id - Get client details by ID
   */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestId = this.getRequestId(req);
    const startTime = Date.now();

    try {
      const { id } = req.params as { id: string };
      const client = await this.service.getClientById(id);

      const response: ApiResponse<Client> = {
        success: true,
        data: client,
        meta: { requestId, durationMs: Date.now() - startTime },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(
          { requestId, errorCode: error.code, message: error.message },
          "Failed to fetch client by ID"
        );
      } else {
        logger.error({ requestId, err: error }, "Unexpected error fetching client");
      }
      next(error);
    }
  };

  /**
   * PUT /api/clients/:id - Update client by ID
   */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestId = this.getRequestId(req);
    const startTime = Date.now();

    try {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateClientInput;
      const updatedClient = await this.service.updateClient(id, input, req.user?.userId);

      const response: ApiResponse<Client> = {
        success: true,
        data: updatedClient,
        meta: { requestId, durationMs: Date.now() - startTime },
      };

      logger.info(
        { requestId, clientId: updatedClient.id },
        "Client updated successfully"
      );

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(
          { requestId, errorCode: error.code, message: error.message },
          "Failed to update client"
        );
      } else {
        logger.error({ requestId, err: error }, "Unexpected error updating client");
      }
      next(error);
    }
  };

  /**
   * DELETE /api/clients/:id - Delete client by ID
   */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestId = this.getRequestId(req);
    const startTime = Date.now();

    try {
      const { id } = req.params as { id: string };
      const deletedClient = await this.service.deleteClient(id, req.user?.userId);

      const response: ApiResponse<{ id: string; message: string }> = {
        success: true,
        data: {
          id: deletedClient.id,
          message: "Client deactivated successfully",
        },
        meta: { requestId, durationMs: Date.now() - startTime },
      };

      logger.info({ requestId, clientId: id }, "Client deleted successfully");

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(
          { requestId, errorCode: error.code, message: error.message },
          "Failed to delete client"
        );
      } else {
        logger.error({ requestId, err: error }, "Unexpected error deleting client");
      }
      next(error);
    }
  };
}

export const clientsController = new ClientsController();
