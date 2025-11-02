import { NextResponse } from "next/server";
import sharp from "sharp";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const MAX_FILE_SIZE = Number(
  process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE ?? 10 * 1024 * 1024
);

export async function POST(request: Request) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary chưa được cấu hình đầy đủ." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Không tìm thấy file upload" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(new Uint8Array(arrayBuffer)) as Buffer;

    const isImage = file.type.startsWith("image/");
    if (isImage) {
      try {
        buffer = await sharp(buffer)
          .rotate()
          .resize({
            width: 512,
            height: 512,
            fit: "inside",
            withoutEnlargement: true,
          })
          .toFormat("jpeg", { quality: 80 })
          .toBuffer();
      } catch (error) {
        console.warn("Resize avatar failed, fallback to original buffer:", error);
      }
    }

    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File vượt quá dung lượng cho phép.",
          limit: MAX_FILE_SIZE,
        },
        { status: 413 }
      );
    }

    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const options: Record<string, unknown> = {
        resource_type: "auto",
        folder:
          formData.get("folder")?.toString() ??
          process.env.CLOUDINARY_FOLDER ??
          "my_task_manager",
      };

      if (process.env.CLOUDINARY_UPLOAD_PRESET) {
        options.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET;
      }

      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Upload ảnh thất bại"));
          } else {
            resolve(result as { secure_url: string; public_id: string });
          }
        }
      );
      stream.on("error", reject);
      stream.end(buffer);
    });

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    const message =
      (error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : undefined) ?? "Upload ảnh thất bại";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
