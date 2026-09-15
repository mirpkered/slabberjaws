export const scanFormats = ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];
export type Decoder = { decode(video: HTMLVideoElement): Promise<string | undefined>; dispose(): void };

export async function createDecoder(): Promise<Decoder> {
  type NativeDetector = { detect(video: HTMLVideoElement): Promise<Array<{rawValue: string}>> };
  const Native = (globalThis as typeof globalThis & { BarcodeDetector?: {
    new(options: {formats: string[]}): NativeDetector;
    getSupportedFormats(): Promise<string[]>;
  }}).BarcodeDetector;
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats();
      if (scanFormats.every(format => supported.includes(format))) {
        const detector = new Native({formats: scanFormats});
        return {async decode(video) { const values = await detector.detect(video); return values.length === 1 ? values[0].rawValue : undefined; }, dispose() {}};
      }
    } catch { /* Safari/native partial implementations fall back to ZXing. */ }
  }
  const [{BrowserMultiFormatReader}, {BarcodeFormat, DecodeHintType, NotFoundException, ChecksumException, FormatException}] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
  const reader = new BrowserMultiFormatReader(new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.QR_CODE, BarcodeFormat.ITF, BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417, BarcodeFormat.AZTEC]]]));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context) throw new Error('Scanner initialization failed');
  return {
    async decode(video) {
      // A bounded, reusable decode frame only. Never serialized, uploaded, or retained as a still.
      const scale = Math.min(1, 1280 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      try { return reader.decodeFromCanvas(canvas).getText(); }
      catch (error) {
        if (error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException) return undefined;
        throw error;
      }
    },
    dispose() { canvas.width = 0; canvas.height = 0; },
  };
}
