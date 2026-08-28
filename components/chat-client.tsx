"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";

import {
  DefaultChatTransport,
  type ToolUIPart,
  type UIMessage,
} from "ai";

import {
  ChatTabs,
  type ChatTab,
} from "@/components/chat-tabs";

import {
  SourcesTab,
  type SourceDocument,
} from "@/components/sources-tab";

type ChatClientProps = {
  chatId: string;
  initialMessages: UIMessage[];
};

type UploadResponse = {
  document: {
    id: string;
    chat_id: string;
    filename: string;
    mime_type: string;
    created_at: string;
  };
};

type DeleteDocumentResponse = {
  success: boolean;
  documentId: string;
};

type DeleteChatResponse = {
  success: boolean;
  chatId: string;
};

type ChatDocument =
  SourceDocument;

type ChatSummary = {
  id: string;
  created_at: string;
  documents: ChatDocument[];
};

type CreateChatResponse = {
  chat: {
    id: string;
    created_at: string;
    documents?: ChatDocument[];
  };
};

type ChatsResponse = {
  chats: ChatSummary[];
};

type EvidenceSource = {
  sourceId: string;
  filename: string;
  excerpt: string;
  pageNumber: number | null;
  section: string | null;
};

type ShowEvidenceToolPart =
  ToolUIPart<{
    showEvidence: {
      input: {
        sourceIds: string[];
      };

      output: {
        sources: EvidenceSource[];
      };
    };
  }>;

/*
 * Structured evidence UI
 * rendered inside assistant messages.
 */
function EvidenceCards({
  sources,
}: {
  sources: EvidenceSource[];
}) {
  if (
    sources.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Evidence
      </p>

      {sources.map(
        (source) => {
          const location =
            source.pageNumber !== null
              ? `Page ${source.pageNumber}`
              : source.section
                ? `Section: ${source.section}`
                : "Document";

          return (
            <details
              key={
                source.sourceId
              }
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <summary className="cursor-pointer list-none px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {
                        source.sourceId
                      }{" "}
                      ·{" "}
                      {
                        source.filename
                      }
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {
                        location
                      }
                    </p>
                  </div>

                  <span className="text-sm text-gray-400 transition-transform group-open:rotate-180">
                    ↓
                  </span>
                </div>
              </summary>

              <div className="border-t border-gray-100 px-4 py-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Relevant excerpt
                </p>

                <blockquote className="border-l-2 border-green-500 pl-3 text-sm leading-relaxed text-gray-600">
                  {
                    source.excerpt
                  }
                </blockquote>
              </div>
            </details>
          );
        }
      )}
    </div>
  );
}

function formatChatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

export function ChatClient({
  chatId,
  initialMessages,
}: ChatClientProps) {
  const router =
    useRouter();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ChatTab>(
      "chat"
    );

  const [
    input,
    setInput,
  ] =
    useState("");

  const [
    isUploading,
    setIsUploading,
  ] =
    useState(false);

  const [
    uploadError,
    setUploadError,
  ] =
    useState<
      string | null
    >(null);

  const [
    uploadedFile,
    setUploadedFile,
  ] =
    useState<
      string | null
    >(null);

  const [
    isCreatingChat,
    setIsCreatingChat,
  ] =
    useState(false);

  const [
    newChatError,
    setNewChatError,
  ] =
    useState<
      string | null
    >(null);

  const [
    chats,
    setChats,
  ] =
    useState<
      ChatSummary[]
    >([]);

  const [
    isLoadingChats,
    setIsLoadingChats,
  ] =
    useState(true);

  const [
    chatHistoryError,
    setChatHistoryError,
  ] =
    useState<
      string | null
    >(null);

  const [
    isDeletingChatId,
    setIsDeletingChatId,
  ] =
    useState<
      string | null
    >(null);

  const [
    deleteChatError,
    setDeleteChatError,
  ] =
    useState<
      string | null
    >(null);

  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    id: chatId,

    messages:
      initialMessages,

    transport:
      new DefaultChatTransport(
        {
          api: `/api/chat/${chatId}`,
        }
      ),
  });

  /*
   * Load persisted chats
   * and their documents.
   */
  useEffect(() => {
    let cancelled =
      false;

    async function loadChats() {
      setIsLoadingChats(
        true
      );

      setChatHistoryError(
        null
      );

      try {
        const response =
          await fetch(
            "/api/chats",
            {
              method:
                "GET",

              cache:
                "no-store",
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            "Failed to load chats"
          );
        }

        const data =
          (await response.json()) as ChatsResponse;

        if (
          cancelled
        ) {
          return;
        }

        const normalizedChats =
          Array.isArray(
            data.chats
          )
            ? data.chats.map(
                (
                  chat
                ) => ({
                  ...chat,

                  documents:
                    Array.isArray(
                      chat.documents
                    )
                      ? chat.documents
                      : [],
                })
              )
            : [];

        setChats(
          normalizedChats
        );
      } catch (error) {
        console.error(
          "Unable to load chats:",
          error
        );

        if (
          !cancelled
        ) {
          setChatHistoryError(
            "Unable to load chat history"
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setIsLoadingChats(
            false
          );
        }
      }
    }

    loadChats();

    return () => {
      cancelled =
        true;
    };
  }, [chatId]);

  /*
   * Create a new chat.
   */
  async function handleNewChat() {
    if (
      isCreatingChat
    ) {
      return;
    }

    setIsCreatingChat(
      true
    );

    setNewChatError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/chats",
          {
            method:
              "POST",
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "Failed to create a new chat"
        );
      }

      const data =
        (await response.json()) as CreateChatResponse;

      if (
        !data.chat ||
        !data.chat.id
      ) {
        throw new Error(
          "Invalid chat response"
        );
      }

      const newChat:
        ChatSummary = {
        id:
          data.chat.id,

        created_at:
          data.chat
            .created_at,

        documents:
          data.chat
            .documents ??
          [],
      };

      setChats(
        (
          currentChats
        ) => [
          newChat,

          ...currentChats.filter(
            (chat) =>
              chat.id !==
              newChat.id
          ),
        ]
      );

      setActiveTab(
        "chat"
      );

      setUploadedFile(
        null
      );

      setUploadError(
        null
      );

      setIsCreatingChat(
        false
      );

      router.push(
        `/chat/${newChat.id}`
      );
    } catch (error) {
      console.error(
        "Unable to create chat:",
        error
      );

      if (
        error instanceof
        Error
      ) {
        setNewChatError(
          error.message
        );
      } else {
        setNewChatError(
          "Unable to create a new chat"
        );
      }

      setIsCreatingChat(
        false
      );
    }
  }

  /*
   * Open old chat.
   */
  function handleOpenChat(
    targetChatId: string
  ) {
    if (
      targetChatId ===
      chatId
    ) {
      return;
    }

    if (
      isDeletingChatId
    ) {
      return;
    }

    setActiveTab(
      "chat"
    );

    setUploadedFile(
      null
    );

    setUploadError(
      null
    );

    router.push(
      `/chat/${targetChatId}`
    );
  }

  /*
   * Delete an entire chat.
   *
   * The server removes:
   * - messages
   * - documents
   * - document chunks
   * - embeddings
   * - the chat itself
   */
  async function handleDeleteChat(
    targetChatId: string
  ) {
    if (
      isDeletingChatId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this chat?\n\nThis will permanently delete its messages, sources and embeddings."
      );

    if (
      !confirmed
    ) {
      return;
    }

    setIsDeletingChatId(
      targetChatId
    );

    setDeleteChatError(
      null
    );

    /*
     * Choose another chat now,
     * before removing the target
     * from local state.
     */
    const nextChat =
      chats.find(
        (chat) =>
          chat.id !==
          targetChatId
      );

    try {
      const response =
        await fetch(
          `/api/chats/${targetChatId}`,
          {
            method:
              "DELETE",
          }
        );

      let data:
        | DeleteChatResponse
        | {
            error?: string;
          };

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "Invalid response while deleting chat"
        );
      }

      if (
        !response.ok
      ) {
        throw new Error(
          "error" in data &&
          data.error
            ? data.error
            : "Failed to delete chat"
        );
      }

      /*
       * Remove deleted chat
       * from sidebar immediately.
       */
      setChats(
        (
          currentChats
        ) =>
          currentChats.filter(
            (chat) =>
              chat.id !==
              targetChatId
          )
      );

      /*
       * If deleting an old chat
       * that is not currently open,
       * stay where we are.
       */
      if (
        targetChatId !==
        chatId
      ) {
        return;
      }

      /*
       * Current chat was deleted.
       * Reset temporary state.
       */
      setActiveTab(
        "chat"
      );

      setUploadedFile(
        null
      );

      setUploadError(
        null
      );

      /*
       * Open another chat if one
       * exists. Otherwise return
       * to the home page.
       */
      if (
        nextChat
      ) {
        router.push(
          `/chat/${nextChat.id}`
        );
      } else {
        router.push(
          "/"
        );
      }
    } catch (error) {
      console.error(
        "Unable to delete chat:",
        error
      );

      if (
        error instanceof
        Error
      ) {
        setDeleteChatError(
          error.message
        );
      } else {
        setDeleteChatError(
          "Unable to delete chat"
        );
      }
    } finally {
      setIsDeletingChatId(
        null
      );
    }
  }

  /*
   * Upload source document.
   */
  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(
      true
    );

    setUploadError(
      null
    );

    setUploadedFile(
      null
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `/api/upload/${chatId}`,
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const data:
        | UploadResponse
        | {
            error: string;
          } =
        await response.json();

      if (
        !response.ok
      ) {
        if (
          "error" in
          data
        ) {
          throw new Error(
            data.error
          );
        }

        throw new Error(
          "Failed to upload document"
        );
      }

      if (
        "document" in
        data
      ) {
        setUploadedFile(
          data.document
            .filename
        );

        /*
         * Add uploaded document
         * to the current chat
         * immediately.
         */
        setChats(
          (
            currentChats
          ) =>
            currentChats.map(
              (
                chat
              ) => {
                if (
                  chat.id !==
                  chatId
                ) {
                  return chat;
                }

                const alreadyExists =
                  chat.documents.some(
                    (
                      document
                    ) =>
                      document.id ===
                      data.document.id
                  );

                if (
                  alreadyExists
                ) {
                  return chat;
                }

                return {
                  ...chat,

                  documents: [
                    ...chat.documents,

                    {
                      id:
                        data.document.id,

                      filename:
                        data.document.filename,

                      mime_type:
                        data.document.mime_type,

                      created_at:
                        data.document.created_at,
                    },
                  ],
                };
              }
            )
        );
      }
    } catch (error) {
      console.error(
        error
      );

      if (
        error instanceof
        Error
      ) {
        setUploadError(
          error.message
        );
      } else {
        setUploadError(
          "Unable to upload document"
        );
      }
    } finally {
      setIsUploading(
        false
      );

      event.target.value =
        "";
    }
  }

  /*
   * Delete a source document.
   */
  async function handleDeleteSource(
    documentId: string
  ) {
    const response =
      await fetch(
        `/api/documents/${documentId}`,
        {
          method:
            "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              chatId,
            }),
        }
      );

    let data:
      | DeleteDocumentResponse
      | {
          error?: string;
        };

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        "Invalid response while deleting source"
      );
    }

    if (
      !response.ok
    ) {
      throw new Error(
        "error" in data &&
        data.error
          ? data.error
          : "Failed to delete source"
      );
    }

    setChats(
      (
        currentChats
      ) =>
        currentChats.map(
          (
            chat
          ) => {
            if (
              chat.id !==
              chatId
            ) {
              return chat;
            }

            return {
              ...chat,

              documents:
                chat.documents.filter(
                  (
                    document
                  ) =>
                    document.id !==
                    documentId
                ),
            };
          }
        )
    );

    setUploadedFile(
      null
    );

    setUploadError(
      null
    );
  }

  /*
   * Send chat question.
   */
  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const question =
      input.trim();

    if (
      !question ||
      status !==
        "ready"
    ) {
      return;
    }

    sendMessage({
      text:
        question,
    });

    setInput("");

    setUploadedFile(
      null
    );
  }

  /*
   * Sources belonging only
   * to current chat.
   */
  const currentChat =
    chats.find(
      (chat) =>
        chat.id ===
        chatId
    );

  const currentDocuments =
    currentChat
      ?.documents ??
    [];

  return (
    <div className="flex min-h-[85vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:flex-row">

      {/* ======================
          CHAT HISTORY SIDEBAR
         ====================== */}
      <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-gray-50 md:w-64 md:border-b-0 md:border-r">

        {/* Sidebar Header */}
        <div className="border-b border-gray-200 p-4">

          <p className="mb-3 text-sm font-semibold text-gray-900">
            Chats
          </p>

          <button
            type="button"
            onClick={
              handleNewChat
            }
            disabled={
              isCreatingChat ||
              isUploading ||
              Boolean(
                isDeletingChatId
              ) ||
              status !==
                "ready"
            }
            className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreatingChat
              ? "Creating..."
              : "+ New Chat"}
          </button>

          {newChatError && (
            <p className="mt-2 text-xs text-red-600">
              {
                newChatError
              }
            </p>
          )}

          {deleteChatError && (
            <p className="mt-2 text-xs text-red-600">
              {
                deleteChatError
              }
            </p>
          )}
        </div>

        {/* Chat List */}
        <div className="max-h-64 flex-1 overflow-y-auto p-2 md:max-h-none">

          {isLoadingChats && (
            <p className="px-3 py-4 text-sm text-gray-400">
              Loading chats...
            </p>
          )}

          {chatHistoryError && (
            <p className="px-3 py-4 text-sm text-red-600">
              {
                chatHistoryError
              }
            </p>
          )}

          {!isLoadingChats &&
            !chatHistoryError &&
            chats.length ===
              0 && (
              <p className="px-3 py-4 text-sm text-gray-400">
                No previous chats.
              </p>
            )}

          {!isLoadingChats &&
            chats.map(
              (
                chat
              ) => {
                const isActive =
                  chat.id ===
                  chatId;

                const sourceCount =
                  chat.documents.length;

                const isDeleting =
                  isDeletingChatId ===
                  chat.id;

                return (
                  <div
                    key={
                      chat.id
                    }
                    className={`mb-1 flex items-stretch overflow-hidden rounded-xl transition ${
                      isActive
                        ? "bg-green-100 text-green-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {/* Open Chat */}
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenChat(
                          chat.id
                        )
                      }
                      disabled={
                        isDeleting
                      }
                      className="min-w-0 flex-1 px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-2">

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-sm font-medium">
                            Chat
                          </p>

                          <p className="mt-0.5 truncate text-xs opacity-60">
                            {formatChatDate(
                              chat.created_at
                            )}
                          </p>

                          <p className="mt-1 text-xs opacity-60">
                            {sourceCount ===
                            0
                              ? "No sources"
                              : `${sourceCount} source${
                                  sourceCount ===
                                  1
                                    ? ""
                                    : "s"
                                }`}
                          </p>
                        </div>

                        {isActive && (
                          <span className="shrink-0 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Current
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Delete Chat */}
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteChat(
                          chat.id
                        )
                      }
                      disabled={
                        Boolean(
                          isDeletingChatId
                        )
                      }
                      title="Delete chat"
                      aria-label="Delete chat"
                      className="flex w-10 shrink-0 items-center justify-center border-l border-transparent text-gray-400 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isDeleting
                        ? "…"
                        : "×"}
                    </button>
                  </div>
                );
              }
            )}
        </div>
      </aside>

      {/* ======================
          MAIN PANEL
         ====================== */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Header */}
        <header className="px-6 py-5">
          <h1 className="text-2xl font-bold">
            Document Chat
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Upload a PDF, TXT or Markdown document and ask questions about its contents.
          </p>
        </header>

        {/* Chat / Sources Tabs */}
        <ChatTabs
          activeTab={
            activeTab
          }
          sourceCount={
            currentDocuments.length
          }
          onChange={
            setActiveTab
          }
        />

        {/* ======================
            CHAT TAB
           ====================== */}
        {activeTab ===
          "chat" && (
          <>
            {/* Messages */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6">

              {/* Empty State */}
              {messages.length ===
                0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">

                    <p className="font-medium text-gray-700">
                      No messages yet
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Upload a source or ask your first question.
                    </p>

                    {currentDocuments.length >
                      0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab(
                            "sources"
                          )
                        }
                        className="mt-3 text-sm font-medium text-green-700 hover:text-green-800"
                      >
                        View{" "}
                        {
                          currentDocuments.length
                        }{" "}
                        source
                        {currentDocuments.length ===
                        1
                          ? ""
                          : "s"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map(
                (
                  message
                ) => (
                  <div
                    key={
                      message.id
                    }
                    className={`flex ${
                      message.role ===
                      "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role ===
                        "user"
                          ? "bg-green-600 text-white"
                          : "border border-gray-200 bg-gray-50 text-gray-900"
                      }`}
                    >
                      <p className="mb-1 text-xs font-semibold opacity-60">
                        {message.role ===
                        "user"
                          ? "You"
                          : "Assistant"}
                      </p>

                      {message.parts.map(
                        (
                          part,
                          index
                        ) => {
                          if (
                            part.type ===
                            "text"
                          ) {
                            return (
                              <div
                                key={
                                  index
                                }
                                className="leading-relaxed"
                              >
                                <ReactMarkdown
                                  components={{
                                    p: ({
                                      children,
                                    }) => (
                                      <p className="mb-3 last:mb-0">
                                        {
                                          children
                                        }
                                      </p>
                                    ),

                                    strong:
                                      ({
                                        children,
                                      }) => (
                                        <strong className="font-semibold">
                                          {
                                            children
                                          }
                                        </strong>
                                      ),

                                    ul: ({
                                      children,
                                    }) => (
                                      <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">
                                        {
                                          children
                                        }
                                      </ul>
                                    ),

                                    ol: ({
                                      children,
                                    }) => (
                                      <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">
                                        {
                                          children
                                        }
                                      </ol>
                                    ),

                                    li: ({
                                      children,
                                    }) => (
                                      <li>
                                        {
                                          children
                                        }
                                      </li>
                                    ),

                                    code: ({
                                      children,
                                    }) => (
                                      <code className="rounded bg-gray-200 px-1 py-0.5 text-sm">
                                        {
                                          children
                                        }
                                      </code>
                                    ),
                                  }}
                                >
                                  {
                                    part.text
                                  }
                                </ReactMarkdown>
                              </div>
                            );
                          }

                          if (
                            part.type ===
                            "tool-showEvidence"
                          ) {
                            const evidencePart =
                              part as ShowEvidenceToolPart;

                            if (
                              evidencePart.state !==
                              "output-available"
                            ) {
                              return (
                                <div
                                  key={
                                    index
                                  }
                                  className="mt-3 text-sm text-gray-400"
                                >
                                  Preparing evidence...
                                </div>
                              );
                            }

                            return (
                              <EvidenceCards
                                key={
                                  index
                                }
                                sources={
                                  evidencePart
                                    .output
                                    .sources
                                }
                              />
                            );
                          }

                          return null;
                        }
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Waiting */}
              {status ===
                "submitted" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500">
                    Assistant is thinking...
                  </div>
                </div>
              )}

              {/* Chat Error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {
                    error.message
                  }
                </div>
              )}
            </div>

            {/* Upload Success */}
            {uploadedFile && (
              <div className="border-t border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Document uploaded:{" "}
                <span className="font-medium">
                  {
                    uploadedFile
                  }
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "sources"
                    )
                  }
                  className="ml-2 font-medium underline"
                >
                  View source
                </button>
              </div>
            )}

            {/* Upload Error */}
            {uploadError && (
              <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {
                  uploadError
                }
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-gray-200 p-4">

              <form
                onSubmit={
                  handleSubmit
                }
                className="flex gap-3"
              >
                {/* Quick Upload */}
                <label
                  className={`flex min-w-12 items-center justify-center rounded-xl border border-gray-300 px-4 transition ${
                    isUploading
                      ? "cursor-not-allowed bg-gray-100 opacity-60"
                      : "cursor-pointer hover:bg-gray-50"
                  }`}
                  title="Add source"
                >
                  <span className="text-xl">
                    {isUploading
                      ? "…"
                      : "+"}
                  </span>

                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                    onChange={
                      handleFileUpload
                    }
                    disabled={
                      isUploading ||
                      isCreatingChat ||
                      Boolean(
                        isDeletingChatId
                      )
                    }
                    className="hidden"
                  />
                </label>

                {/* Input */}
                <input
                  value={
                    input
                  }
                  onChange={(
                    event
                  ) =>
                    setInput(
                      event
                        .target
                        .value
                    )
                  }
                  disabled={
                    status !==
                      "ready" ||
                    isUploading ||
                    isCreatingChat ||
                    Boolean(
                      isDeletingChatId
                    )
                  }
                  type="text"
                  placeholder="Ask a question..."
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
                />

                {/* Send */}
                <button
                  type="submit"
                  disabled={
                    status !==
                      "ready" ||
                    isUploading ||
                    isCreatingChat ||
                    Boolean(
                      isDeletingChatId
                    ) ||
                    !input.trim()
                  }
                  className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status ===
                    "submitted" ||
                  status ===
                    "streaming"
                    ? "Sending..."
                    : "Send"}
                </button>
              </form>
            </div>
          </>
        )}

        {/* ======================
            SOURCES TAB
           ====================== */}
        {activeTab ===
          "sources" && (
          <SourcesTab
            documents={
              currentDocuments
            }
            isUploading={
              isUploading
            }
            uploadError={
              uploadError
            }
            onUpload={
              handleFileUpload
            }
            onDelete={
              handleDeleteSource
            }
          />
        )}
      </div>
    </div>
  );
}