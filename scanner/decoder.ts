export const scanFormats = ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];
export type Decoder = { kind?: 'native' | 'zxing'; formats?: string[]; lastFailure?: string; decode(video: HTMLVideoElement): Promise<string | undefined>; decodeStill?(video: HTMLVideoElement): Promise<string | undefined>; dispose(): void };

function shouldPreferZXing() {
  // Chrome and other iOS browsers run WebKit. BarcodeDetector availability is
  // inconsistent there, especially for QR, so prefer our tested multi-format
  // decoder rather than choosing native merely because the symbol exists.
  return /iP(?:hone|ad|od)/i.test(navigator.userAgent) ||
    (/AppleWebKit/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent));
}

export async function createDecoder(): Promise<Decoder> {
  type NativeDetector = { detect(video: HTMLVideoElement): Promise<Array<{rawValue: string}>> };
  const Native = (globalThis as typeof globalThis & { BarcodeDetector?: {
    new(options: {formats: string[]}): NativeDetector;
    getSupportedFormats(): Promise<string[]>;
  }}).BarcodeDetector;
  if (Native && !shouldPreferZXing()) {
    try {
      const supported = await Native.getSupportedFormats();
      if (scanFormats.every(format => supported.includes(format))) {
        const detector = new Native({formats: scanFormats});
        return {kind: 'native', formats: scanFormats, async decode(video) { const values = await detector.detect(video); return values.length === 1 ? values[0].rawValue : undefined; }, dispose() {}};
      }
    } catch { /* Safari/native partial implementations fall back to ZXing. */ }
  }
  const [browser, libraryModule] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
  // The package is published with both CommonJS and ESM entry points. Avoid a
  // named dynamic import here: Node's Linux loader can otherwise reject it.
  const library = (libraryModule as unknown as { default?: typeof libraryModule }).default ?? libraryModule;
  const { BrowserMultiFormatReader, BrowserQRCodeReader } = browser;
  const { BarcodeFormat, DecodeHintType, NotFoundException, ChecksumException, FormatException } = library;
  const enabledFormats = [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.QR_CODE, BarcodeFormat.ITF, BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417, BarcodeFormat.AZTEC];
  const hints = new Map<unknown, unknown>([[DecodeHintType.POSSIBLE_FORMATS, enabledFormats], [DecodeHintType.TRY_HARDER, true]]);
  const reader = new BrowserMultiFormatReader(hints as never);
  const qrReader = new BrowserQRCodeReader();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context) throw new Error('Scanner initialization failed');
  let lastFailure = '';
  async function readCanvas(tryStill = false) {
    try { return qrReader.decodeFromCanvas(canvas).getText(); }
    catch (error) { lastFailure = error instanceof Error ? error.name : 'QR decode failed'; }
    try { return reader.decodeFromCanvas(canvas).getText(); }
    catch (error) { lastFailure = error instanceof Error ? error.name : 'Multi-format decode failed'; if (error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException) return undefined; throw error; }
  }
  async function capture(video: HTMLVideoElement, crop = false) {
      // A bounded, reusable decode frame only. Never serialized, uploaded, or retained as a still.
      // Decode the source frame rather than the CSS-painted view. Retaining up
      // to 1920px gives small QR modules enough source detail on rear cameras.
      const scale = Math.min(1, 1920 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      if (crop) { const margin=.08, sx=video.videoWidth*margin, sy=video.videoHeight*margin, sw=video.videoWidth*(1-margin*2), sh=video.videoHeight*(1-margin*2); context!.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height); } else context!.drawImage(video, 0, 0, canvas.width, canvas.height);
      return readCanvas();
  }
  return {
    async decode(video) { return capture(video); },
    async decodeStill(video) { try { return await capture(video) ?? await capture(video,true); } finally { canvas.width=0; canvas.height=0; } },
    get lastFailure() { return lastFailure; },
    kind: 'zxing', formats: [...scanFormats, 'itf', 'data_matrix', 'pdf_417', 'aztec'],
    dispose() { canvas.width = 0; canvas.height = 0; },
  };
}
