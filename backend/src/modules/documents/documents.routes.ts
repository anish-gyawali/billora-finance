import { Router, type RequestHandler } from "express";
import multer, { MulterError } from "multer";
import { requireAuth } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { BadRequestError } from "../../common/errors/AppError.js";
import { documentsController } from "./documents.controller.js";
import { createDocumentSchema, documentIdSchema, documentQuerySchema } from "./documents.validation.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) callback(null, true);
    else callback(new BadRequestError("Only PDF, JPEG, PNG, and WEBP documents are allowed"));
  },
});

const uploadDocument: RequestHandler = (req, res, next) =>
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof BadRequestError) return next(error);
    if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(new BadRequestError("Document must be 10 MB or smaller"));
    }
    return next(new BadRequestError("Only PDF, JPEG, PNG, and WEBP documents are allowed"));
  });

const router: Router = Router();
router.get("/", requireAuth, validate({ query: documentQuerySchema }), documentsController.list);
router.post("/", requireAuth, uploadDocument, validate(createDocumentSchema), documentsController.create);
router.get("/:id", requireAuth, validate({ params: documentIdSchema }), documentsController.get);
router.delete("/:id", requireAuth, validate({ params: documentIdSchema }), documentsController.remove);
export default router;
export { router as documentsRoutes };
