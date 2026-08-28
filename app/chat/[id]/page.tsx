import { ChatClient } from "@/components/chat-client";
import { loadChatMessages } from "@/lib/messages";

type ChatPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChatPage({
  params,
}: ChatPageProps) {
  const { id } = await params;

  const messages = await loadChatMessages(id);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <ChatClient
          chatId={id}
          initialMessages={messages}
        />
      </div>
    </main>
  );
}