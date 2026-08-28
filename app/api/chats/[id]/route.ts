import { sql } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * DELETE /api/chats/:id
 */
export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id: chatId } =
      await params;

    if (!chatId) {
      return Response.json(
        {
          error: "Chat ID is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Make sure chat exists.
     */
    const existingChats =
      await sql`
        SELECT id
        FROM chats
        WHERE id = ${chatId}
        LIMIT 1;
      `;

    if (
      existingChats.length === 0
    ) {
      return Response.json(
        {
          error: "Chat not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Delete document chunks.
     * Embeddings are stored here.
     */
    await sql`
      DELETE FROM document_chunks
      WHERE document_id IN (
        SELECT id
        FROM documents
        WHERE chat_id = ${chatId}
      );
    `;

    /*
     * Delete documents.
     */
    await sql`
      DELETE FROM documents
      WHERE chat_id = ${chatId};
    `;

    /*
     * Delete messages.
     */
    await sql`
      DELETE FROM messages
      WHERE chat_id = ${chatId};
    `;

    /*
     * Delete chat.
     */
    await sql`
      DELETE FROM chats
      WHERE id = ${chatId};
    `;

    return Response.json({
      success: true,
      chatId,
    });
  } catch (error) {
    console.error(
      "Failed to delete chat:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete chat",
      },
      {
        status: 500,
      }
    );
  }
}