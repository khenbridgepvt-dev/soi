-- Ticket 0061: private Storage bucket for covering letter letterhead DOCX only (ADR-0021).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-templates',
  'document-templates',
  false,
  5242880,
  ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Admin-only access — staff use bundled letterhead; server reads via service role on download.

CREATE POLICY document_templates_admin_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'document-templates'
    AND (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );

CREATE POLICY document_templates_admin_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'document-templates'
    AND (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );

CREATE POLICY document_templates_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'document-templates'
    AND (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  )
  WITH CHECK (
    bucket_id = 'document-templates'
    AND (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );
