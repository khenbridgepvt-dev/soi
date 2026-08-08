import fs from 'node:fs';
import PizZip from 'pizzip';

const src = 'docs/templates/letterhead/sample covering letter.docx';
const dst = 'docs/templates/letterhead/covering-letter-shell.docx';

fs.copyFileSync(src, dst);
const zip = new PizZip(fs.readFileSync(dst));
let xml = zip.file('word/document.xml').asText();
const parts = xml.split('</w:p>');

const textOf = (paragraph) =>
  [...paragraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1]).join('');

let bodyStart = null;
let bodyEnd = null;

for (let index = 0; index < parts.length; index += 1) {
  const text = textOf(parts[index]).trim();
  if (bodyStart === null && text.startsWith('To,')) {
    bodyStart = index;
  }
  if (text.startsWith('Sincerely')) {
    bodyEnd = index;
    break;
  }
}

if (bodyStart === null || bodyEnd === null) {
  throw new Error('Could not locate body boundaries in sample letterhead DOCX');
}

const paragraphOpen = parts[bodyStart].match(/<w:p[^>]*>/)?.[0] ?? '<w:p>';
const placeholder =
  `${paragraphOpen}<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/></w:rPr>` +
  '<w:t xml:space="preserve">{{body}}</w:t></w:r></w:p>';

const before = parts.slice(0, bodyStart).join('</w:p>') + (bodyStart > 0 ? '</w:p>' : '');
const after = parts.slice(bodyEnd).join('</w:p>');
xml = before + placeholder + after;

zip.file('word/document.xml', xml);
fs.writeFileSync(dst, zip.generate({ type: 'nodebuffer' }));

const verify = new PizZip(fs.readFileSync(dst)).file('word/document.xml').asText();
const runs = [...verify.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1]).join('');
console.log(runs);
