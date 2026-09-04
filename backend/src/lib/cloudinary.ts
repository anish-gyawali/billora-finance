import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadDocument = (file: Buffer, publicId: string, mimeType: string, format: string) =>
  new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "authenticated",
        public_id: publicId,
        folder: "billora/documents",
        format,
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
    cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "authenticated" }, (error, result) => {
      if (error) return reject(error);
      if (result?.result !== "ok" && result?.result !== "not found") {
        return reject(new Error(`Cloudinary delete failed: ${result?.result ?? "unknown"}`));
      }
      resolve();
    });
  });

export const documentUrl = (publicId: string, format: string) =>
  cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: true,
  });
