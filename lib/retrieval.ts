import { sql } from "@/lib/db";
import { embedQuery } from "@/lib/embeddings";

export type RetrievalResult = {
  id: string;
  documentId: string;
  filename: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  section: string | null;
  similarity: number;
};

export async function retrieveRelevantChunks(
  chatId: string,
  query: string,
  limit = 5
): Promise<RetrievalResult[]> {
  // 1. Convert the user's question into an embedding.
  const embedding = await embedQuery(query);

  // 2. Convert number[] into pgvector's text representation.
  const vector = `[${embedding.join(",")}]`;

  // 3. Find the most semantically similar chunks
  //    that belong only to this chat.
  const rows = await sql`
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.chunk_index,
      dc.page_number,
      dc.section,
      d.filename,

      1 - (
        dc.embedding <=> ${vector}::vector
      ) AS similarity

    FROM document_chunks dc

    JOIN documents d
      ON d.id = dc.document_id

    WHERE
      d.chat_id = ${chatId}
      AND dc.embedding IS NOT NULL

    ORDER BY
      dc.embedding <=> ${vector}::vector

    LIMIT ${limit};
  `;

  // 4. Convert database rows into our TypeScript shape.
  return rows.map((row) => ({
    id: row.id as string,

    documentId:
      row.document_id as string,

    filename:
      row.filename as string,

    content:
      row.content as string,

    chunkIndex:
      Number(row.chunk_index),

    pageNumber:
      row.page_number === null
        ? null
        : Number(row.page_number),

    section:
      row.section === null
        ? null
        : String(row.section),

    similarity:
      Number(row.similarity),
  }));
}