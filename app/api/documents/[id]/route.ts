import { sql } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id: documentId } =
      await params;

    const body =
      await request.json();

    const chatId =
      body?.chatId;

    if (
      !documentId ||
      !chatId
    ) {
      return Response.json(
        {
          error:
            "Document ID and Chat ID are required",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Delete chunks + document
     * in one PostgreSQL statement.
     *
     * We also verify the document
     * belongs to this chat.
     */
    const rows = await sql`
      WITH target_document AS (
        SELECT id
        FROM documents
        WHERE
          id = ${documentId}
          AND chat_id = ${chatId}
      ),

      deleted_chunks AS (
        DELETE FROM document_chunks
        WHERE document_id IN (
          SELECT id
          FROM target_document
        )
      )

      DELETE FROM documents
      WHERE id IN (
        SELECT id
        FROM target_document
      )

      RETURNING id;
    `;

    if (
      rows.length === 0
    ) {
      return Response.json(
        {
          error:
            "Document not found",
        },
        {
          status: 404,
        }
      );
    }

    return Response.json({
      success: true,
      documentId,
    });
  } catch (error) {
    console.error(
      "Failed to delete document:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to delete document",
      },
      {
        status: 500,
      }
    );
  }
}