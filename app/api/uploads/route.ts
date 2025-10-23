import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Không tìm thấy file upload" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          ...(process.env.CLOUDINARY_UPLOAD_PRESET
            ? { upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET }
            : {}),
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Upload ảnh thất bại"));
          } else {
            resolve(result as { secure_url: string; public_id: string });
          }
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    const message = error instanceof Error ? error.message : "Upload ảnh thất bại";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
