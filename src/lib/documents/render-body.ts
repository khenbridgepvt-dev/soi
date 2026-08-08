import { buildMergeContext } from './merge-context';
import { loadTemplateSync } from './load-template';
import type { RenderedDocumentBody, VariantId, WizardAnswers } from './types';

const MERGE_TOKEN_RE = /\{\{([a-z0-9_]+)\}\}/g;

export function substituteMergeTokens(
  template: string,
  context: Record<string, string>,
): string {
  return template.replace(MERGE_TOKEN_RE, (_match, key: string) => context[key] ?? '');
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function mergedTextToHtml(mergedText: string): string {
  const paragraphs = mergedText
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs
    .map((paragraph) => {
      const escaped = escapeHtml(paragraph).replace(/\n/g, '<br />');
      return `<p>${escaped}</p>`;
    })
    .join('\n');
}

export function renderMergedBodyFromTemplate(
  variantId: VariantId,
  answers: WizardAnswers,
  template: string,
): RenderedDocumentBody {
  const context = buildMergeContext(variantId, answers);
  const mergedText = substituteMergeTokens(template, context).trim();
  const mergedHtml = mergedTextToHtml(mergedText);

  return { mergedText, mergedHtml };
}

export function renderMergedBody(
  variantId: VariantId,
  answers: WizardAnswers,
): RenderedDocumentBody {
  const template = loadTemplateSync(variantId);
  return renderMergedBodyFromTemplate(variantId, answers, template);
}
