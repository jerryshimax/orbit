import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 }
    );
  }

  const blob = await put(`chat/${user.handle}/${Date.now()}-${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });

  return Response.json({
    url: blob.url,
    filename: file.name,
    contentType: file.type,
    size: file.size,
  });
}
