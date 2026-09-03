import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import type { JournalLine } from "../../generated/prisma/client.js";
import { journalLineRepository, type IJournalLineRepository, type JournalLineWithContext } from "./journal-line.repository.js";
import type { CreateJournalLineInput, UpdateJournalLineInput } from "./journal-line.validation.js";

export class JournalLineService {
  constructor(private readonly repo: IJournalLineRepository = journalLineRepository) {}

  async get(id: string): Promise<JournalLineWithContext> {
    const line = await this.repo.findById(id);
    if (!line) throw new NotFoundError(`Journal line with ID '${id}' not found`);
    return line;
  }

  async create(input: CreateJournalLineInput, actorId: string): Promise<JournalLineWithContext> {
    return this.repo.create(input, actorId);
  }

  async update(id: string, input: UpdateJournalLineInput, actorId: string): Promise<JournalLineWithContext> {
    return this.repo.update(id, input, actorId);
  }

  async remove(id: string, actorId: string): Promise<JournalLine> {
    return this.repo.remove(id, actorId);
  }
}

export const journalLineService = new JournalLineService();
