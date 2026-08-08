import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { getVariantById } from './registry';
import type { VariantId } from './types';

const TEMPLATE_ROOT = path.join(process.cwd(), 'docs', 'templates');

export async function loadTemplate(variantId: VariantId): Promise<string> {
  const variant = getVariantById(variantId);
  const filePath = path.join(TEMPLATE_ROOT, variant.sourceRelativePath);
  return readFile(filePath, 'utf8');
}

export function loadTemplateSync(variantId: VariantId): string {
  const variant = getVariantById(variantId);
  const filePath = path.join(TEMPLATE_ROOT, variant.sourceRelativePath);
  return readFileSync(filePath, 'utf8');
}
