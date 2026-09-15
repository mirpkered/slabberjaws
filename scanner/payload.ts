export type ScanPayload = { rawPayload: string; certNumber?: string };

/** Text only. Never infer a grader, follow a URL, or coerce a cert to a number. */
export function parseScanPayload(rawPayload: string): ScanPayload {
  const result: ScanPayload = { rawPayload };
  const text = rawPayload.trim();
  if (!text || text.length > 4096) return result;
  if (/^\d{5,20}$/.test(text)) return { ...result, certNumber: text };
  let candidates: string[] = [];
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      // Multiple possible identities are ambiguous, even when one is in a query.
      candidates = url.pathname.split('/').map(decodeURIComponent).filter(p => /^\d{5,20}$/.test(p));
      for (const [key, value] of url.searchParams) {
        if (/^(cert|certnumber|cert_number|certification|certificationnumber|id)$/i.test(key) && /^\d{5,20}$/.test(value)) candidates.push(value);
      }
    } catch { return result; }
  } else {
    candidates = [...text.matchAll(/(?:^|[^\w])([0-9]{5,20})(?![\w])/g)].map(match => match[1]);
  }
  const unique = [...new Set(candidates)];
  return unique.length === 1 ? { ...result, certNumber: unique[0] } : result;
}
