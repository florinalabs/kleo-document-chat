CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  chat_id UUID NOT NULL
    REFERENCES chats(id)
    ON DELETE CASCADE,

  role TEXT NOT NULL
    CHECK (role IN ('user', 'assistant')),

  parts JSONB NOT NULL,
  position INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (chat_id, position)
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  chat_id UUID NOT NULL
    REFERENCES chats(id)
    ON DELETE CASCADE,

  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  document_id UUID NOT NULL
    REFERENCES documents(id)
    ON DELETE CASCADE,

  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,

  page_number INTEGER,
  section TEXT,

  embedding VECTOR(768),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_documents_chat_id
  ON documents (chat_id);