import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { BadRequestError, ForbiddenError, InternalServerError, NotFoundError } from "../../common/errors/AppError.js";
import { deleteDocument, documentUrl, uploadDocument } from "../../lib/cloudinary.js";
import { documentsRepository } from "./documents.repository.js";
import type { CreateDocumentInput, DocumentQuery } from "./documents.validation.js";

type Actor = { userId: string; role: string };
const extensionFor = (fileName: string, mimeType: string) => {
  const extension = extname(fileName).slice(1).toLowerCase();
  if (extension) return extension === "jpeg" ? "jpg" : extension;
  return mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1] ?? "bin";
};
const withUrl = <T extends { storage_key: string; file_name: string; mime_type: string }>(document: T) => ({ ...document, file_url: documentUrl(document.storage_key, extensionFor(document.file_name, document.mime_type)) });
const safeFileName = (name: string) => (name.replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f\u007f]/g, "_").trim() || "document").slice(0, 255);
const hasSignature = (file: Express.Multer.File) => {
  const bytes = file.buffer;
  if (file.mimetype === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (file.mimetype === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
};

export class DocumentsService {
  list(q: DocumentQuery, actor: Actor) { if (actor.role === "member" && (q.owner_type !== "user" || q.owner_id !== actor.userId)) throw new ForbiddenError("Members may only access their own documents"); return documentsRepository.list(q).then((result) => ({ ...result, items: result.items.map(withUrl) })); }
  async get(id: string, actor: Actor) { const d = await documentsRepository.find(id); if (!d) throw new NotFoundError("Document was not found"); if (actor.role === "member" && (d.owner_type !== "user" || d.owner_id !== actor.userId)) throw new ForbiddenError("You may only access your own documents"); return withUrl(d); }
  async create(input: CreateDocumentInput, file: Express.Multer.File, actor: Actor) {
    if (actor.role === "member" && (input.owner_type !== "user" || input.owner_id !== actor.userId)) throw new ForbiddenError("Members may only attach their own documents");
    if (!hasSignature(file)) throw new BadRequestError("The uploaded file content does not match its declared document format");
    if (!(await documentsRepository.ownerExists(input.owner_type, input.owner_id))) throw new BadRequestError("The document owner was not found");
    const fileName = safeFileName(file.originalname);
    const format = extensionFor(fileName, file.mimetype);
    const publicId = randomUUID();
    let uploaded: { public_id: string };
    try { uploaded = await uploadDocument(file.buffer, publicId, file.mimetype, format); } catch (error) { throw new InternalServerError("Failed to upload document"); }
    try { return withUrl(await documentsRepository.create({ ...input, file_name: fileName, storage_key: uploaded.public_id, mime_type: file.mimetype }, actor.userId)); }
    catch (error) { await deleteDocument(uploaded.public_id).catch(() => undefined); throw error; }
  }
  async remove(id: string, actor: Actor) { const d = await this.get(id, actor); if (actor.role === "member" && d.uploaded_by !== actor.userId) throw new ForbiddenError("Only the uploader or finance staff may delete a document"); await deleteDocument(d.storage_key); return documentsRepository.remove(id); }
}
export const documentsService = new DocumentsService();
