// src/app/api/upload-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/supabase/serverClient";
import { v4 as uuidv4 } from "uuid";

// Allowed image types for upload
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export async function POST(req: NextRequest) {
  // Authenticate the user
  const token = req.cookies.get("supabase-auth-token")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "You must be logged in to upload images. Please log in and try again." },
      { status: 401 }
    );
  }

  const userResponse = await supabase.auth.getUser(token);
  if (userResponse.error || !userResponse.data.user) {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  // Validate the number of files
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `You can upload a maximum of ${MAX_FILES} images at a time.` },
      { status: 400 }
    );
  }

  // Validate each file
  const uploadResults: { name: string; url: string }[] = [];
  for (const file of files) {
    // Log file details for debugging
    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type for ${file.name}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}.` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Some files exceed the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit.` },
        { status: 400 }
      );
    }

    // Validate file name before sanitization
    if (!file.name || file.name.trim() === "") {
      return NextResponse.json(
        { error: "File name is empty or invalid." },
        { status: 400 }
      );
    }

    // Sanitize file name (replace invalid characters with underscores)
    let sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Ensure the sanitized file name is valid and non-empty
    if (!sanitizedFileName || sanitizedFileName === "." || sanitizedFileName === "..") {
      // Fallback to a generated name if sanitization results in an invalid name
      const extension = file.name.split(".").pop() || file.type.split("/")[1] || "jpg";
      sanitizedFileName = `${uuidv4()}.${extension}`;
      console.log(`Invalid sanitized file name for ${file.name}, using fallback: ${sanitizedFileName}`);
    }

    // Generate a unique file path using UUID to avoid conflicts
    const fileExtension = sanitizedFileName.split(".").pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${userResponse.data.user.id}/${uniqueFileName}`;

    // Upload the file to Supabase storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("problems")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload error for ${sanitizedFileName}:`, uploadError);
      return NextResponse.json({ error: `Failed to upload ${sanitizedFileName}: ${uploadError.message}` }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage.from("problems").getPublicUrl(filePath);
    uploadResults.push({ name: sanitizedFileName, url: urlData.publicUrl });
  }

  return NextResponse.json({ success: true, files: uploadResults }, { status: 200 });
}