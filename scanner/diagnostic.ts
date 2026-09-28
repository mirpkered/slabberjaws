import { classifyScanPayload } from './payload-classification.ts';
import { parseScanPayload } from './payload.ts';

export function scanSourceLabel(raw: string, format: string) {
  const normalized = format.toLowerCase().replace(/[\s-]/g, '_');
  if (normalized.includes('qr')) {
    try { if (/^https?:/i.test(raw.trim())) return 'QR URL'; } catch { /* display as a QR payload */ }
    return 'QR code';
  }
  if (normalized.includes('code_128')) return 'Linear barcode — Code 128';
  if (normalized.includes('code_39')) return 'Linear barcode — Code 39';
  return format ? `Barcode / decoder format — ${format}` : 'Decoder format unavailable';
}

export function scanDiagnostic(raw: string, format: string, selectedGrader = '') {
  const parsed = parseScanPayload(raw);
  const classification = classifyScanPayload(raw);
  return {
    source: scanSourceLabel(raw, format),
    raw,
    grader: selectedGrader || ('suggestedGrader' in classification ? classification.suggestedGrader : ''),
    cert: ('certNumber' in classification.payload ? classification.payload.certNumber : undefined) ?? parsed.certNumber ?? '',
    grade: classification.kind === 'grader-certification-url' ? classification.gradeCandidate ?? '' : '',
    verificationUrl: classification.kind === 'grader-certification-url' ? classification.certUrl : '',
  };
}
