type Chunk = {
  content: string;
  index: number;
};

export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 150
): Chunk[] {
  const cleanedText = text.trim();

  if (!cleanedText) {
    return [];
  }

  const chunks: Chunk[] = [];

  let start = 0;
  let index = 0;

  while (start < cleanedText.length) {
    const end = Math.min(
      start + chunkSize,
      cleanedText.length
    );

    const content = cleanedText
      .slice(start, end)
      .trim();

    if (content) {
      chunks.push({
        content,
        index,
      });

      index++;
    }

    if (end >= cleanedText.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
}