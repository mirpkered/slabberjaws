import { sourceCrop, type Crop } from './crop.ts';

export type OcrImageMetadata = {
  sourceWidth: number;
  sourceHeight: number;
  crop: { x: number; y: number; width: number; height: number };
  inputWidth: number;
  inputHeight: number;
  orientation: string;
  preprocessing: string[];
  displayed?: { width: number; height: number; crop: { x: number; y: number; width: number; height: number } };
};

export type PreparedOcrImage = {
  file: File;
  metadata: OcrImageMetadata;
  sourceCropUrl?: string;
  normalizedCropUrl?: string;
  inputUrl?: string;
};

/**
 * The returned `file` is the exact Blob-backed image supplied to Tesseract.
 * Optional object URLs point at the exact intermediate/output blobs and must
 * be revoked by the caller; none are persisted or uploaded.
 */
export async function prepareOcrImage(file: File, crop: Crop, enhance: boolean, diagnostics = false): Promise<PreparedOcrImage> {
  let bitmap: ImageBitmap | undefined;
  let objectUrl: string | undefined;
  let image: HTMLImageElement | undefined;
  let source: CanvasImageSource;
  let width: number;
  let height: number;
  let orientation: string;
  let sourceCanvas: HTMLCanvasElement | undefined;
  let outputCanvas: HTMLCanvasElement | undefined;
  try {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      source = bitmap;
      width = bitmap.width;
      height = bitmap.height;
      orientation = 'Decoded with createImageBitmap(imageOrientation: from-image)';
    } catch {
      image = new Image();
      objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      await image.decode();
      source = image;
      width = image.naturalWidth;
      height = image.naturalHeight;
      orientation = 'Decoded by browser Image; browser EXIF-orientation behavior applies';
    }

    // Crop percentages are relative to the displayed, orientation-corrected image.
    const rect = sourceCrop(crop, width, height);
    const cropCanvas = document.createElement('canvas');
    sourceCanvas = cropCanvas;
    cropCanvas.width = Math.max(1, rect.width);
    cropCanvas.height = Math.max(1, rect.height);
    const sourceContext = cropCanvas.getContext('2d');
    if (!sourceContext) throw new Error('Canvas unavailable');
    sourceContext.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, cropCanvas.width, cropCanvas.height);

    // A fresh output canvas is the sole image input path to Tesseract.
    const scale = enhance ? Math.min(2, 2400 / Math.max(rect.width, rect.height)) : Math.min(1, 2400 / Math.max(rect.width, rect.height));
    const finalCanvas = document.createElement('canvas');
    outputCanvas = finalCanvas;
    finalCanvas.width = Math.max(1, Math.round(rect.width * scale));
    finalCanvas.height = Math.max(1, Math.round(rect.height * scale));
    const outputContext = finalCanvas.getContext('2d');
    if (!outputContext) throw new Error('Canvas unavailable');
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = 'high';
    outputContext.filter = enhance ? 'grayscale(1) contrast(1.35)' : 'none';
    outputContext.drawImage(cropCanvas, 0, 0, cropCanvas.width, cropCanvas.height, 0, 0, finalCanvas.width, finalCanvas.height);
    const blob = await new Promise<Blob | null>(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', 0.94));
    if (!blob) throw new Error('Image crop unavailable');
    const prepared: PreparedOcrImage = {
      file: new File([blob], 'local-ocr.jpg', { type: 'image/jpeg' }),
      metadata: {
        sourceWidth: width,
        sourceHeight: height,
        crop: rect,
        inputWidth: finalCanvas.width,
        inputHeight: finalCanvas.height,
        orientation,
        preprocessing: [
          'Mapped crop in orientation-normalized source pixels',
          ...(enhance ? ['grayscale', 'contrast(1.35)', `upscale ×${scale.toFixed(2)} (max dimension 2400 px)`] : ['no grayscale/contrast filter', `scale ×${scale.toFixed(2)} (max dimension 2400 px)`]),
          'JPEG quality 0.94',
        ],
      },
    };
    if (diagnostics) {
      const sourceBlob = await new Promise<Blob | null>(resolve => cropCanvas.toBlob(resolve, 'image/jpeg', 0.94));
      if (sourceBlob) {
        prepared.sourceCropUrl = URL.createObjectURL(sourceBlob);
        // The mapped crop is drawn from the orientation-normalized source above.
        prepared.normalizedCropUrl = prepared.sourceCropUrl;
      }
      prepared.inputUrl = URL.createObjectURL(blob);
    }
    return prepared;
  } finally {
    if(sourceCanvas){sourceCanvas.width=0;sourceCanvas.height=0;}
    if(outputCanvas){outputCanvas.width=0;outputCanvas.height=0;}
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export function revokeOcrPreviews(image: PreparedOcrImage) {
  const urls = new Set([image.sourceCropUrl, image.normalizedCropUrl, image.inputUrl].filter((value): value is string => !!value));
  urls.forEach(url => URL.revokeObjectURL(url));
}
