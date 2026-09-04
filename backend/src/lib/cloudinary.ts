import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadDocument = (file: Buffer, publicId: string, mimeType: string) =>
  new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "upload",
        public_id: publicId,
        folder: "billora/documents",
        context: { mime_type: mimeType },
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result);
        else reject(new Error("Cloudinary returned no upload result"));
      }
    );
    stream.end(file);
  });

export const deleteDocument = (publicId: string) =>
  new Promise<void>((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: "raw" }, (error, result) => {
      if (error) return reject(error);
      if (result?.result !== "ok" && result?.result !== "not found") {
        return reject(new Error(`Cloudinary delete failed: ${result?.result ?? "unknown"}`));
      }
      resolve();
    });
  });

export const documentUrl = (publicId: string) =>
  cloudinary.url(publicId, { resource_type: "raw", type: "upload", secure: true });
