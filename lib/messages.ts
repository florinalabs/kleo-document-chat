import { sql } from "@/lib/db";
import type { UIMessage } from "ai";

export async function saveMessage(
  chatId: string,
  message: UIMessage,
  position: number
) {
  const rows = await sql`
    INSERT INTO messages (
      chat_id,
      role,
      parts,
      position
    )
    VALUES (
      ${chatId},
      ${message.role},
      ${JSON.stringify(message.parts)}::jsonb,
      ${position}
    )
    RETURNING id, chat_id, role, parts, position, created_at;
  `;

  return rows[0];
}

export async function saveChatMessages(
  chatId: string,
  messages: UIMessage[]
) {
  for (let position = 0; position < messages.length; position++) {
    const message = messages[position];

    await sql`
      INSERT INTO messages (
        chat_id,
        role,
        parts,
        position
      )
      VALUES (
        ${chatId},
        ${message.role},
        ${JSON.stringify(message.parts)}::jsonb,
        ${position}
      )
      ON CONFLICT (chat_id, position)
      DO UPDATE SET
        role = EXCLUDED.role,
        parts = EXCLUDED.parts;
    `;
  }
}

export async function loadChatMessages(
  chatId: string
): Promise<UIMessage[]> {
  const rows = await sql`
    SELECT
      id,
      role,
      parts
    FROM messages
    WHERE chat_id = ${chatId}
    ORDER BY position ASC;
  `;

  return rows.map((row) => ({
    id: row.id as string,
    role: row.role as UIMessage["role"],
    parts: row.parts as UIMessage["parts"],
  }));
}