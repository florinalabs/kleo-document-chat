"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const CreateChatResponseSchema = z.object({
  chat: z.object({
    id: z.string().uuid(),
    created_at: z.string(),
  }),
});

type CreateChatResponse = z.infer<
  typeof CreateChatResponseSchema
>;

export default function Home() {
  const router = useRouter();

  const [isCreating, setIsCreating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function createChat() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/chats",
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to create chat"
        );
      }

      const json: unknown =
        await response.json();

      const result =
        CreateChatResponseSchema.safeParse(
          json
        );

      if (!result.success) {
        console.error(
          result.error
        );

        throw new Error(
          "Invalid response from server"
        );
      }

      const data: CreateChatResponse =
        result.data;

      router.push(
        `/chat/${data.chat.id}`
      );
    } catch (error) {
      console.error(error);

      setError(
        "Unable to create chat. Please try again."
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 text-gray-900">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">

        <h1 className="text-3xl font-bold">
          Document Chat
        </h1>

        <p className="mt-3 text-gray-500">
          Upload a document and ask questions about its contents.
        </p>

        <button
          onClick={createChat}
          disabled={isCreating}
          className="mt-8 w-full rounded-xl bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating
            ? "Creating chat..."
            : "Start New Chat"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}