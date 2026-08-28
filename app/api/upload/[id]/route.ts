import {
  extractText,
  getDocumentProxy,
} from "unpdf";

import { saveDocument } from "@/lib/documents";
import { chunkText } from "@/lib/chunk";
import { saveDocumentChunk } from "@/lib/document-chunks";
import { embedDocuments } from "@/lib/embeddings";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PreparedChunk = {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  section: string | null;
};

const MAX_FILE_SIZE =
  4 * 1024 * 1024;

const MAX_PDF_PAGES = 50;

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id: chatId } =
      await params;

    if (!chatId) {
      return Response.json(
        {
          error:
            "Chat ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        {
          error:
            "File is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.size > MAX_FILE_SIZE
    ) {
      return Response.json(
        {
          error:
            "File is too large. Maximum size is 4 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const filename =
      file.name.toLowerCase();

    const isPdf =
      file.type ===
        "application/pdf" ||
      filename.endsWith(
        ".pdf"
      );

    const isText =
      file.type ===
        "text/plain" ||
      filename.endsWith(
        ".txt"
      );

    const isMarkdown =
      file.type ===
        "text/markdown" ||
      filename.endsWith(
        ".md"
      ) ||
      filename.endsWith(
        ".markdown"
      );

    if (
      !isPdf &&
      !isText &&
      !isMarkdown
    ) {
      return Response.json(
        {
          error:
            "Only PDF, TXT and Markdown files are supported",
        },
        {
          status: 400,
        }
      );
    }

    let fullContent = "";

    const preparedChunks:
      PreparedChunk[] = [];

    /*
     * ==========================
     * PDF
     * ==========================
     */
    if (isPdf) {
      const buffer =
        await file.arrayBuffer();

      const pdf =
        await getDocumentProxy(
          new Uint8Array(
            buffer
          )
        );

      if (
        pdf.numPages >
        MAX_PDF_PAGES
      ) {
        return Response.json(
          {
            error: `PDF has too many pages. Maximum is ${MAX_PDF_PAGES} pages.`,
          },
          {
            status: 400,
          }
        );
      }

      const {
        text,
      } = await extractText(
        pdf,
        {
          mergePages: false,
        }
      );

      const pages =
        Array.isArray(text)
          ? text
          : [text];

      let globalChunkIndex =
        0;

      const pageContents:
        string[] = [];

      for (
        let pageIndex = 0;
        pageIndex <
        pages.length;
        pageIndex++
      ) {
        const pageText =
          pages[
            pageIndex
          ]?.trim();

        if (!pageText) {
          continue;
        }

        pageContents.push(
          pageText
        );

        const pageChunks =
          chunkText(
            pageText
          );

        for (
          const chunk of
          pageChunks
        ) {
          preparedChunks.push({
            content:
              chunk.content,

            chunkIndex:
              globalChunkIndex,

            pageNumber:
              pageIndex + 1,

            section:
              null,
          });

          globalChunkIndex++;
        }
      }

      fullContent =
        pageContents.join(
          "\n\n"
        );
    }

    /*
     * ==========================
     * TXT / Markdown
     * ==========================
     */
    if (
      isText ||
      isMarkdown
    ) {
      fullContent =
        await file.text();

      if (
        !fullContent.trim()
      ) {
        return Response.json(
          {
            error:
              "The document is empty",
          },
          {
            status: 400,
          }
        );
      }

      const chunks =
        chunkText(
          fullContent
        );

      for (
        const chunk of
        chunks
      ) {
        preparedChunks.push({
          content:
            chunk.content,

          chunkIndex:
            chunk.index,

          pageNumber:
            null,

          section:
            null,
        });
      }
    }

    if (
      !fullContent.trim()
    ) {
      return Response.json(
        {
          error:
            "No readable text was found in the document",
        },
        {
          status: 400,
        }
      );
    }

    if (
      preparedChunks.length ===
      0
    ) {
      return Response.json(
        {
          error:
            "No document chunks were created",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 1. Save original document
     */
    const document =
      await saveDocument({
        chatId,

        filename:
          file.name,

        mimeType:
          isPdf
            ? "application/pdf"
            : isMarkdown
              ? "text/markdown"
              : "text/plain",

        content:
          fullContent,
      });

    const documentId =
      document.id as string;

    /*
     * 2. Collect chunk text
     */
    const chunkContents =
      preparedChunks.map(
        (chunk) =>
          chunk.content
      );

    /*
     * 3. Generate embeddings
     */
    const embeddings =
      await embedDocuments(
        chunkContents
      );

    if (
      embeddings.length !==
      preparedChunks.length
    ) {
      throw new Error(
        "Embedding count does not match chunk count"
      );
    }

    /*
     * 4. Save chunks + embeddings
     */
    for (
      let index = 0;
      index <
      preparedChunks.length;
      index++
    ) {
      const chunk =
        preparedChunks[
          index
        ];

      const embedding =
        embeddings[index];

      if (
        !chunk ||
        !embedding
      ) {
        throw new Error(
          "Missing chunk or embedding"
        );
      }

      await saveDocumentChunk({
        documentId,

        content:
          chunk.content,

        chunkIndex:
          chunk.chunkIndex,

        embedding,

        pageNumber:
          chunk.pageNumber,

        section:
          chunk.section,
      });
    }

    console.log(
      "Document embedded:",
      documentId,
      "chunks:",
      preparedChunks.length
    );

    return Response.json({
      document,

      chunksCreated:
        preparedChunks.length,
    });
  } catch (error) {
    console.error(
      "Document upload failed:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process document",
      },
      {
        status: 500,
      }
    );
  }
}