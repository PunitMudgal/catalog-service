import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export class CloudinaryConfigurationError extends Error {}
export class CloudinaryValidationError extends Error {}

export type UploadedImage = {
  secureUrl: string;
  publicId: string;
};

export async function uploadProductImage(
  file: File,
  tenantId: string,
  productId: string,
): Promise<UploadedImage> {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryConfigurationError(
      "Cloudinary credentials are not configured",
    );
  }
  if (!file.type.startsWith("image/")) {
    throw new CloudinaryValidationError("Only image files are allowed");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new CloudinaryValidationError("Image must be smaller than 5 MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicId = `catalog/products/${tenantId}/${productId}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "",
        public_id: publicId,
        resource_type: "image",
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteCloudinaryImage(publicId: string | null) {
  if (!publicId || !cloudName || !apiKey || !apiSecret) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
