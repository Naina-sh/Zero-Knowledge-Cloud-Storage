/**
 * Module declarations for packages without bundled type definitions.
 */

declare module 'mammoth/mammoth.browser' {
  interface ExtractRawTextOptions {
    arrayBuffer?: ArrayBuffer;
  }
  interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(
    options: ExtractRawTextOptions
  ): Promise<ExtractRawTextResult>;
}

declare module 'mammoth' {
  interface ExtractRawTextOptions {
    arrayBuffer?: ArrayBuffer;
  }
  interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(
    options: ExtractRawTextOptions
  ): Promise<ExtractRawTextResult>;
}

