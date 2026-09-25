import { hasAutomaticLookup } from "../graders/registry.ts";
import { classifyScanPayload } from "./payload-classification.ts";
import type { NormalizedCard } from "../graders/model.ts";

type Grader = NormalizedCard["grader"];
export type ConfirmedScanHandoff =
  | { kind: "lookup"; grader: Grader; certNumber: string }
  | { kind: "manual"; grader: Grader; certNumber: string; certUrl?: string; grade?: string };

/** A linear numeric barcode is offered as a cert only after the user picks CSG. */
export function certAfterGraderSelection(selected: Grader | "", currentCert: string, barcodeCandidate: string) {
  if (!barcodeCandidate) return currentCert;
  if (selected === "CSG" && !currentCert.trim()) return barcodeCandidate;
  if (selected !== "CSG" && currentCert === barcodeCandidate) return "";
  return currentCert;
}

/** Shared decision point: a readable identifier never implies that the cert was authenticated. */
export function confirmedScanHandoff(rawPayload: string, grader: Grader | "", certNumber: string, gradeCandidate = ""): ConfirmedScanHandoff | null {
  const cert = certNumber.trim();
  if (!grader || !cert) return null;
  const classification = classifyScanPayload(rawPayload);
  if (classification.kind === "grader-certification-url") {
    return {
      kind: "manual",
      grader,
      certNumber: cert,
      ...(grader === classification.suggestedGrader ? { certUrl: classification.certUrl, ...(gradeCandidate.trim() ? { grade: gradeCandidate.trim() } : {}) } : {}),
    };
  }
  return hasAutomaticLookup(grader)
    ? { kind: "lookup", grader, certNumber: cert }
    : { kind: "manual", grader, certNumber: cert };
}
