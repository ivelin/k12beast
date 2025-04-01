import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../supabase/serverClient";

export async function POST(req: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Enforce limits on the server side
    const MAX_FILES = 5;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

    // Check the number of files
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `You can only upload a maximum of ${MAX_FILES} images` }, { status: 400 });
    }

    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      return NextResponse.json({ error: `Some files exceed the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit` }, { status: 400 });
    }

    // Upload images to Supabase Storage
    const uploadPromises = files.map(async (file) => {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("problems")
        .upload(fileName, file);

      if (error) {
        throw new Error(`Failed to upload image ${file.name}: ${error.message}`);
      }

      const { data: publicData } = supabase.storage
        .from("problems")
        .getPublicUrl(fileName);

      if (!publicData.publicUrl) {
        throw new Error(`Failed to get public URL for image ${file.name}`);
      }

      return { name: file.name, url: publicData.publicUrl };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    return NextResponse.json({ success: true, files: uploadedFiles }, { status: 200 });
  } catch (err) {
    console.error("Error uploading images:", err.message); // Log only the error message, not the service role key
    return NextResponse.json({ error: err.message || "Failed to upload images" }, { status: 500 });
  }
}