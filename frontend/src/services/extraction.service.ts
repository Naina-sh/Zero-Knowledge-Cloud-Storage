/**
 * Text extraction service — extracts plain text from PDF, DOCX, and TXT files.
 * All extraction happens CLIENT-SIDE (the server never sees the document content).
 *
 * @module services/extraction.service
 */

import { getFileType } from '../utils/format';

/**
 * Extract text content from a file based on its type.
 * @param file The File object to extract text from
 * @returns Extracted plain text (empty string for unsupported types)
 */
export async function extractText(file: File): Promise<string> {
  const fileType = getFileType(file.name);

  try {
    switch (fileType) {
      case 'pdf':
        return await extractFromPdf(file);
      case 'docx':
        return await extractFromDocx(file);
      case 'txt':
      case 'md':
      case 'csv':
      case 'json':
        return await extractFromText(file);
      default:
        // For unsupported types, use the filename as a fallback for embedding
        return file.name;
    }
  } catch (err) {
    console.warn(`Text extraction failed for ${file.name}:`, err);
    // Fallback to filename so we still generate an embedding
    return file.name;
  }
}

/**
 * Extract text from a PDF file using pdf.js (PDF.js).
 */
async function extractFromPdf(file: File): Promise<string> {
  // Dynamic import to avoid loading PDF.js until needed
  const pdfjs = await import('pdfjs-dist');

  // Set the worker source
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

/**
 * Extract text from a DOCX file using mammoth.js.
 */
async function extractFromDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Read a plain text file (TXT, MD, CSV, JSON).
 */
async function extractFromText(file: File): Promise<string> {
  return file.text();
}
