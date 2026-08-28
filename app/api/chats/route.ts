import { sql } from "@/lib/db";

/*
 * GET /api/chats
 *
 * Load all chats together with
 * their uploaded documents.
 */
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        c.id,
        c.created_at,

        COALESCE(
          json_agg(
            json_build_object(
              'id', d.id,
              'filename', d.filename,
              'mime_type', d.mime_type,
              'created_at', d.created_at
            )
            ORDER BY d.created_at ASC
          )
          FILTER (
            WHERE d.id IS NOT NULL
          ),
          '[]'::json
        ) AS documents

      FROM chats c

      LEFT JOIN documents d
        ON d.chat_id = c.id

      GROUP BY
        c.id,
        c.created_at

      ORDER BY
        c.created_at DESC

      LIMIT 50;
    `;

    return Response.json({
      chats: rows,
    });
  } catch (error) {
    console.error(
      "Failed to load chats:",
      error
    );

    return Response.json(
      {
        error: "Unable to load chats",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * POST /api/chats
 *
 * Create a new chat.
 */
export async function POST() {
  try {
    const rows = await sql`
      INSERT INTO chats
      DEFAULT VALUES

      RETURNING
        id,
        created_at;
    `;

    const chat =
      rows[0];

    if (!chat) {
      throw new Error(
        "Chat was not created"
      );
    }

    return Response.json({
      chat: {
        ...chat,
        documents: [],
      },
    });
  } catch (error) {
    console.error(
      "Failed to create chat:",
      error
    );

    return Response.json(
      {
        error: "Unable to create chat",
      },
      {
        status: 500,
      }
    );
  }
}