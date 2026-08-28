import {
  google,
  type GoogleEmbeddingModelOptions,
} from "@ai-sdk/google";

import {
  embed,
  embedMany,
} from "ai";

const embeddingModel = google.embedding(
  "gemini-embedding-2"
);

export async function embedDocuments(
  values: string[]
) {
  const { embeddings } = await embedMany({
    model: embeddingModel,

    values,

    providerOptions: {
      google: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_DOCUMENT",
      } satisfies GoogleEmbeddingModelOptions,
    },
  });

  return embeddings;
}

export async function embedQuery(
  value: string
) {
  const { embedding } = await embed({
    model: embeddingModel,

    value,

    providerOptions: {
      google: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_QUERY",
      } satisfies GoogleEmbeddingModelOptions,
    },
  });

  return embedding;
}