import { DOCUMENT_KINDS, type DocumentKind } from './types';

export { DOCUMENT_KINDS };

export type ParseDocumentKindResult =
  | { ok: true; kind: DocumentKind }
  | { ok: false; message: string };

export function parseDocumentKind(param: string): ParseDocumentKindResult {
  if (param === 'covering_letter' || param === 'parental_consent') {
    return { ok: true, kind: param };
  }

  return {
    ok: false,
    message: 'kind must be covering_letter or parental_consent.',
  };
}
