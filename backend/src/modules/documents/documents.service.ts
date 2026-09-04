import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { ForbiddenError, InternalServerError, NotFoundError } from "../../common/errors/AppError.js";
import { deleteDocument, documentUrl, uploadDocument } from "../../lib/cloudinary.js";
import { documentsRepository } from "./documents.repository.js";
import type { CreateDocumentInput, DocumentQuery } from "./documents.validation.js";

type Actor = { userId: string; role: string };
const withUrl = <T extends { storage_key: string }>(document: T) => ({ ...document, file_url: documentUrl(document.storage_key) });

export class DocumentsService {
  list(q: DocumentQuery, actor: Actor) { if (actor.role === "member" && (q.owner_type !== "user" || q.owner_id !== actor.userId)) throw new ForbiddenError("Members may only access their own documents"); return documentsRepository.list(q).then((result) => ({ ...result, items: result.items.map(withUrl) })); }
  async get(id: string, actor: Actor) { const d = await documentsRepository.find(id); if (!d) throw new NotFoundError("Document was not found"); if (actor.role === "member" && (d.owner_type !== "user" || d.owner_id !== actor.userId)) throw new ForbiddenError("You may only access your own documents"); return withUrl(d); }
  async create(input: CreateDocumentInput, file: Express.Multer.File, actor: Actor) {
    if (actor.role === "member" && (input.owner_type !== "user" || input.owner_id !== actor.userId)) throw new ForbiddenError("Members may only attach their own documents");
    const publicId = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    let uploaded: { public_id: string };
    try { uploaded = await uploadDocument(file.buffer, publicId, file.mimetype); } catch (error) { throw new InternalServerError("Failed to upload document"); }
    try { return withUrl(await documentsRepository.create({ ...input, file_name: file.originalname, storage_key: uploaded.public_id, mime_type: file.mimetype }, actor.userId)); }
    catch (error) { await deleteDocument(uploaded.public_id).catch(() => undefined); throw error; }
  }
  async remove(id: string, actor: Actor) { const d = await this.get(id, actor); if (actor.role === "member" && d.uploaded_by !== actor.userId) throw new ForbiddenError("Only the uploader or finance staff may delete a document"); await deleteDocument(d.storage_key); return documentsRepository.remove(id); }
}
export const documentsService = new DocumentsService();
