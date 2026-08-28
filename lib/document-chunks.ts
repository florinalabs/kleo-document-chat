import { sql } from "@/lib/db";

type SaveChunkInput = {
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding: number[];
  pageNumber?: number | null;
  section?: string | null;
};

export async function saveDocumentChunk({
  documentId,
  content,
  chunkIndex,
  embedding,
  pageNumber = null,
  section = null,
}: SaveChunkInput) {
  const vector = `[${embedding.join(",")}]`;

  const rows = await sql`
    INSERT INTO document_chunks (
      document_id,
      content,
      chunk_index,
      page_number,
      section,
      embedding
    )
    VALUES (
      ${documentId},
      ${content},
      ${chunkIndex},
      ${pageNumber},
      ${section},
      ${vector}::vector
    )
    RETURNING
      id,
      document_id,
      content,
      chunk_index,
      page_number,
      section,
      created_at;
  `;

  return rows[0];
}