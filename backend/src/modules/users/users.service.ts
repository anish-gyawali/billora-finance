import { ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { passwordService } from "../auth/password/password.service.js";
import type { ResetPasswordInput } from "../auth/password/password.validation.js";
import { usersRepository } from "./users.repository.js";
import type { CreateUserInput, UpdateUserInput, UsersQuery } from "./users.validation.js";
export class UsersService {
  list(q: UsersQuery) { return usersRepository.list(q); }
  async get(id: string) { const u = await usersRepository.find(id); if (!u) throw new NotFoundError("User was not found"); return u; }
  async create(input: CreateUserInput, actorId: string) { const u = await usersRepository.create(input); await usersRepository.audit(actorId, "USER_CREATED", u.id, undefined, { email: u.email, role: u.role }); return u; }
  async update(id: string, input: UpdateUserInput, actorId: string) { const current = await this.get(id); if (current.role === "founder" && input.is_active === false && await usersRepository.countFounders() <= 1) throw new ConflictError("The last active founder cannot be deactivated"); if (current.role === "founder" && input.role && input.role !== "founder" && await usersRepository.countFounders() <= 1) throw new ConflictError("The last founder cannot be demoted"); const u = await usersRepository.update(id, input); await usersRepository.audit(actorId, "USER_UPDATED", id, { role: current.role, is_active: current.is_active }, { role: u.role, is_active: u.is_active }); return u; }
  async resetPassword(id: string, input: ResetPasswordInput, actorId: string): Promise<void> { await this.get(id); await passwordService.resetForUser(id, input, actorId); }
}
export const usersService = new UsersService();
