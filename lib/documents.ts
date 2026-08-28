import { sql } from "@/lib/db";

type SaveDocumentInput = {
  chatId: string;
  filename: string;
  mimeType: string;
  content: string;
};

export async function saveDocument({
  chatId,
  filename,
  mimeType,
  content,
}: SaveDocumentInput) {
  const rows = await sql`
    INSERT INTO documents (
      chat_id,
      filename,
      mime_type,
      content
    )
    VALUES (
      ${chatId},
      ${filename},
      ${mimeType},
      ${content}
    )
    RETURNING
      id,
      chat_id,
      filename,
      mime_type,
      created_at;
  `;

  return rows[0];
}