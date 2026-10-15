import { classifyScanPayload, type PayloadClassification } from './payload-classification.ts';
import { parseScanPayload } from './payload.ts';
import { confirmedScanHandoff } from './handoff.ts';

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

export function scanDiagnostic(raw: string, format: string, selectedGrader = '', acceptedClassification?: PayloadClassification) {
  const parsed = parseScanPayload(raw);
  const classification = acceptedClassification ?? classifyScanPayload(raw);
  const cert = ('certNumber' in classification.payload ? classification.payload.certNumber : undefined) ?? parsed.certNumber ?? '';
  const handoff = confirmedScanHandoff(raw, selectedGrader as Parameters<typeof confirmedScanHandoff>[1], cert,
    classification.kind === 'grader-certification-url' ? classification.gradeCandidate ?? '' : '', classification);
  return {
    source: scanSourceLabel(raw, format),
    classification: classification.kind,
    raw,
    grader: selectedGrader,
    suggestedGrader: 'suggestedGrader' in classification ? classification.suggestedGrader : '',
    cert,
    grade: classification.kind === 'grader-certification-url' ? classification.gradeCandidate ?? '' : '',
    verificationUrl: classification.kind === 'grader-certification-url' ? classification.certUrl : '',
    applied: handoff?.kind === 'manual' ? {
      grader: handoff.grader,
      cert: handoff.certNumber,
      grade: handoff.grade ?? '',
      verificationUrl: handoff.certUrl ?? '',
      route: 'Manual card details',
    } : handoff?.kind === 'lookup' ? { grader: handoff.grader, cert: handoff.certNumber, grade: '', verificationUrl: '', route: 'Supported certification lookup' } : null,
  };
}

