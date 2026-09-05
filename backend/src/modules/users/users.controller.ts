import type { NextFunction, Request, Response } from "express";
import { usersService } from "./users.service.js";
import type { CreateUserInput, UpdateUserInput, UsersQuery } from "./users.validation.js";
import type { ResetPasswordInput } from "../auth/password/password.validation.js";

export class UsersController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = req.query as unknown as UsersQuery;
      const result = await usersService.list(q);
      res.json({
        success: true,
        data: result.items,
        meta: { pagination: { page: q.page, limit: q.limit, total: result.total, pages: Math.ceil(result.total / q.limit) } },
      });
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await usersService.get(req.params.id as string) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ success: true, data: await usersService.create(req.body as CreateUserInput, req.user!.userId) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await usersService.update(req.params.id as string, req.body as UpdateUserInput, req.user!.userId) });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await usersService.resetPassword(req.params.id as string, req.body as ResetPasswordInput, req.user!.userId);
      res.status(200).json({ success: true, data: { message: "Temporary password set successfully" } });
    } catch (error) {
      next(error);
    }
  };
}

export const usersController = new UsersController();
