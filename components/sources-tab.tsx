"use client";

import {
  useState,
} from "react";

export type SourceDocument = {
  id: string;
  filename: string;
  mime_type: string;
  created_at: string;
};

type SourcesTabProps = {
  documents:
    SourceDocument[];

  isUploading:
    boolean;

  uploadError:
    | string
    | null;

  onUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;

  onDelete: (
    documentId: string
  ) => Promise<void>;
};

function getFileLabel(
  mimeType: string
) {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return "PDF";
  }

  if (
    mimeType ===
    "text/markdown"
  ) {
    return "Markdown";
  }

  return "TXT";
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

export function SourcesTab({
  documents,
  isUploading,
  uploadError,
  onUpload,
  onDelete,
}: SourcesTabProps) {
  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    deleteError,
    setDeleteError,
  ] =
    useState<
      string | null
    >(null);

  async function handleDelete(
    document:
      SourceDocument
  ) {
    const confirmed =
      window.confirm(
        `Delete "${document.filename}"?\n\nThis will remove the source and its embeddings from this chat.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      document.id
    );

    setDeleteError(
      null
    );

    try {
      await onDelete(
        document.id
      );
    } catch (error) {
      console.error(
        error
      );

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete source"
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">

      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Sources
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Documents available to this conversation.
            </p>
          </div>

          {/* Upload */}
          <label
            className={`cursor-pointer rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 ${
              isUploading
                ? "pointer-events-none opacity-50"
                : ""
            }`}
          >
            {isUploading
              ? "Uploading..."
              : "+ Add Source"}

            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              onChange={
                onUpload
              }
              disabled={
                isUploading
              }
              className="hidden"
            />
          </label>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {
              uploadError
            }
          </div>
        )}

        {/* Delete error */}
        {deleteError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {
              deleteError
            }
          </div>
        )}

        {/* Empty state */}
        {documents.length ===
          0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-10 text-center">

            <div className="text-3xl">
              📄
            </div>

            <p className="mt-3 font-medium text-gray-700">
              No sources yet
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Upload a PDF, TXT or Markdown document to start asking grounded questions.
            </p>
          </div>
        )}

        {/* Documents */}
        {documents.length >
          0 && (
          <div className="mt-6 space-y-3">

            {documents.map(
              (
                document
              ) => {
                const isDeleting =
                  deletingId ===
                  document.id;

                return (
                  <div
                    key={
                      document.id
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">

                      <div className="flex min-w-0 items-start gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                          📄
                        </div>

                        <div className="min-w-0">

                          <p
                            className="truncate font-medium text-gray-900"
                            title={
                              document.filename
                            }
                          >
                            {
                              document.filename
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Uploaded{" "}
                            {formatDate(
                              document.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">

                        <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          {getFileLabel(
                            document.mime_type
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              document
                            )
                          }
                          disabled={
                            isDeleting
                          }
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}