import { NextRequest } from "next/server";
import { put, del } from "@vercel/blob";
import { createAttachment, deleteAttachment } from "@/db/queries/recon";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const description = formData.get("description") as string | null;

  if (!file) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_SIZE) return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
  }

  const blob = await put(
    `recon/${projectId}/${Date.now()}-${file.name}`,
    file,
    { access: "public", contentType: file.type }
  );

  let extractedText: string | undefined;
  if (file.type === "text/plain" || file.type === "text/csv") {
    extractedText = await file.text();
  } else if (file.type === "application/pdf") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text;
    } catch {
      // PDF parsing failed — still save the attachment without text
    }
  }

  const attachment = await createAttachment(projectId, {
    filename: file.name,
    blobUrl: blob.url,
    contentType: file.type,
    sizeBytes: file.size,
    description: description ?? undefined,
    extractedText,
  });

  return Response.json(attachment);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const { attachmentId } = await request.json();

  if (!attachmentId) return Response.json({ error: "attachmentId required" }, { status: 400 });

  const deleted = await deleteAttachment(projectId, attachmentId);
  if (deleted?.blobUrl) {
    try {
      await del(deleted.blobUrl);
    } catch {
      // Blob deletion failed — record still removed
    }
  }

  return Response.json({ ok: true });
}
