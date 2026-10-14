-- Document store backing src/lib/supabaseDb.ts (replaces Firestore).
CREATE TABLE IF NOT EXISTS public.app_documents (
  collection_path text NOT NULL,
  collection_name text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_path, id)
);

CREATE INDEX IF NOT EXISTS idx_app_documents_collection_name ON public.app_documents (collection_name);
CREATE INDEX IF NOT EXISTS idx_app_documents_data ON public.app_documents USING gin (data jsonb_path_ops);

ALTER TABLE public.app_documents REPLICA IDENTITY FULL;
ALTER TABLE public.app_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_documents_read" ON public.app_documents;
CREATE POLICY "app_documents_read" ON public.app_documents
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "app_documents_insert" ON public.app_documents;
CREATE POLICY "app_documents_insert" ON public.app_documents
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "app_documents_update" ON public.app_documents;
CREATE POLICY "app_documents_update" ON public.app_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "app_documents_delete" ON public.app_documents;
CREATE POLICY "app_documents_delete" ON public.app_documents
  FOR DELETE TO authenticated USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_documents;
  END IF;
END $$;
