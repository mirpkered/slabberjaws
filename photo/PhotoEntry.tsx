"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedCard } from "../graders/model";
import { emptyPhotoFields, extractPhotoFields, type PhotoFields } from "./extract";

type Grader = NormalizedCard["grader"];
type PhotoSide = "front" | "back";
type Props = {
  graders: Grader[];
  onCancel(): void;
  onManualDetails(grader: Grader, fields: PhotoFields): void;
};
type OcrWorker = { recognize(image: File): Promise<{ data: { text: string } }>; terminate(): Promise<unknown> };

export function PhotoEntry({ graders, onCancel, onManualDetails }: Props) {
  const [grader, setGrader] = useState<Grader | "">("");
  const [phase, setPhase] = useState<"company" | "front" | "back" | "review" | "results">("company");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [ocrFront, setOcrFront] = useState("");
  const [ocrBack, setOcrBack] = useState("");
  const [fields, setFields] = useState<PhotoFields>(emptyPhotoFields);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);
  const worker = useRef<OcrWorker | null>(null);

  useEffect(() => () => {
    if (frontUrl) URL.revokeObjectURL(frontUrl);
    if (backUrl) URL.revokeObjectURL(backUrl);
    void worker.current?.terminate();
  }, [frontUrl, backUrl]);

  function choose(side: PhotoSide, file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === "front") {
      if (frontUrl) URL.revokeObjectURL(frontUrl);
      setFront(file); setFrontUrl(url); setPhase("back");
    } else {
      if (backUrl) URL.revokeObjectURL(backUrl);
      setBack(file); setBackUrl(url); setPhase("review");
    }
    setError("");
  }
  function retake(side: PhotoSide) {
    if (side === "front") frontInput.current?.click();
    else backInput.current?.click();
  }
  async function runOcr() {
    if (!front && !back) { setError("Take at least one photo before reviewing the label."); return; }
    setBusy(true); setError("");
    try {
      // Tesseract runs in a browser worker; image files never leave this device.
      const module = await import("tesseract.js");
      const active = await module.createWorker("eng", 1, { logger: () => undefined });
      worker.current = active as OcrWorker;
      const frontText = front ? (await active.recognize(front)).data.text : "";
      const backText = back ? (await active.recognize(back)).data.text : "";
      setOcrFront(frontText); setOcrBack(backText); setFields(extractPhotoFields(frontText, backText));
      await active.terminate(); worker.current = null; setPhase("results");
    } catch {
      setError("We couldn't read those photos. Retake them with the label clear and evenly lit, then try again.");
    } finally {
      // Release the OCR worker on success and failure; it holds no persisted image state.
      if (worker.current) { await worker.current.terminate(); worker.current = null; }
      setBusy(false);
    }
  }
  function update(key: keyof PhotoFields, value: string) { setFields((current) => ({ ...current, [key]: value })); }
  function clearAndCancel() {
    // Files and object URLs are released by unmounting; no image is persisted or uploaded.
    setFront(null); setBack(null); setOcrFront(""); setOcrBack(""); setFields(emptyPhotoFields()); onCancel();
  }
  const capture = (side: PhotoSide) => <>
    <input ref={side === "front" ? frontInput : backInput} className="photo-file-input" type="file" accept="image/*" capture="environment" aria-label={`Take or choose ${side} slab photo`} onChange={(event) => choose(side, event.target.files?.[0])} />
    <button className="primary wide" type="button" onClick={() => side === "front" ? frontInput.current?.click() : backInput.current?.click()}>
      {side === "front" ? "Take front photo" : "Take back photo"}
    </button>
  </>;
  if (phase === "company") return <div className="photo-entry">
    <h3>Photograph a slab</h3><p className="muted">Choose the grading company first, then photograph the front and back label. Images are used only in this browser for review.</p>
    <label className="field">Grading company<select value={grader} onChange={(event) => setGrader(event.target.value as Grader)}><option value="">Choose a grading company</option>{graders.map((value) => <option key={value}>{value}</option>)}</select></label>
    <button className="primary wide" disabled={!grader} onClick={() => setPhase("front")}>Continue to photos</button><button className="text-button" onClick={onCancel}>Back to Add Card</button>
  </div>;
  if (phase === "front" || phase === "back") {
    const side = phase;
    return <div className="photo-entry"><p className="eyebrow">{grader} · {side === "front" ? "PHOTO 1 OF 2" : "PHOTO 2 OF 2"}</p><h3>{side === "front" ? "Photograph the front label" : "Photograph the back label"}</h3><p className="muted">Keep the slab flat, fill the frame with the label, and avoid glare. You can use the camera or choose an existing photo.</p>{capture(side)}
      {side === "back" && <button className="text-button" onClick={() => setPhase("review")}>Continue with front photo only</button>}
      <button className="text-button" onClick={() => side === "front" ? setPhase("company") : setPhase("front")}>Back</button></div>;
  }
  if (phase === "review") return <div className="photo-entry"><h3>Review photos</h3><p className="muted">Photos stay temporarily on this device and are discarded when you leave this flow.</p><div className="photo-review-grid">{frontUrl ? <figure><img src={frontUrl} alt="Front slab label preview"/><figcaption>Front <button type="button" className="text-button" onClick={() => retake("front")}>Retake</button></figcaption></figure> : <p className="photo-missing">No front photo</p>}{backUrl ? <figure><img src={backUrl} alt="Back slab label preview"/><figcaption>Back <button type="button" className="text-button" onClick={() => retake("back")}>Retake</button></figcaption></figure> : <button className="account-button" onClick={() => setPhase("back")}>Add back photo</button>}</div>{error && <p role="status" className="form-message">{error}</p>}<button className="primary wide" disabled={busy} onClick={() => void runOcr()}>{busy ? "Reading labels…" : "Read label text"}</button><button className="text-button" onClick={() => setPhase("front")}>Take another photo</button></div>;
  return <div className="photo-entry photo-results"><p className="eyebrow">OCR REVIEW</p><h3>Review detected details</h3><p className="muted">Confirm or correct every field before continuing. OCR can misread slab labels.</p><div className="manual-grid">{([['certNumber','Certification number'],['grade','Grade'],['year','Year'],['brand','Brand'],['set','Set'],['subject','Subject / card name'],['cardNumber','Card number']] as [keyof PhotoFields,string][]).map(([key,label]) => <label key={key} className="field">{label}<input value={fields[key]} onChange={(event) => update(key,event.target.value)} autoComplete="off" /></label>)}</div>{!fields.certNumber.trim() && <p className="form-message">No certification number was detected. Enter the printed number before saving the card.</p>}<details className="photo-ocr-text"><summary>View recognized text</summary><p><strong>Front</strong></p><pre>{ocrFront || "No front text read."}</pre><p><strong>Back</strong></p><pre>{ocrBack || "No back text read."}</pre></details><button className="primary wide" onClick={() => { if (grader) onManualDetails(grader, { ...fields, certNumber: fields.certNumber.trim() }); }}>Continue to card details</button><button className="text-button" onClick={() => setPhase("review")}>Back to photos</button><button className="text-button" onClick={clearAndCancel}>Cancel</button></div>;
}
