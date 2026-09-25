'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { NormalizedCard } from '../graders/model';
import { startCamera, type CameraDiagnostics } from './camera';
import { parseScanPayload, type ScanPayload } from './payload';
import { classifyScanPayload } from './payload-classification';
import { sourceRect } from './frame';
import { hasAutomaticLookup } from '../graders/registry';
import { certAfterGraderSelection, confirmedScanHandoff } from './handoff';

type Grader = NormalizedCard['grader'];
type Props = { graders: Grader[]; onConfirm(grader: Grader, cert: string): void; onManual(cert: string, grader?: Grader): void; onManualDetails(grader: Grader, cert: string, extra?:{certUrl?:string;grade?:string}): void; onCancel(): void };
const isDev = (import.meta as ImportMeta & {env?: Record<string, boolean | undefined>}).env?.DEV;
export function ScanEntry({graders,onConfirm,onManual,onManualDetails,onCancel}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const cameraSurface = useRef<HTMLDivElement>(null);
  const camera = useRef<ReturnType<typeof startCamera> | null>(null);
  const pointers = useRef(new Map<number,{x:number;y:number}>());
  const [attempt,setAttempt] = useState(0), [payload,setPayload] = useState<ScanPayload | null>(null), [barcodeCandidate,setBarcodeCandidate] = useState('');
  const [cert,setCert] = useState(''), [grader,setGrader] = useState<Grader | ''>(''), [gradeCandidate,setGradeCandidate] = useState('');
  const [error,setError] = useState(''), [status,setStatus] = useState('Requesting camera access…'), [copyStatus,setCopyStatus] = useState('');
  const [hasTorch,setHasTorch] = useState(false), [torch,setTorch] = useState(false), [diagnostics,setDiagnostics] = useState<CameraDiagnostics | null>(null), [focusPoint,setFocusPoint] = useState<{x:number;y:number}|null>(null);
  useEffect(() => {
    if (payload || !video.current) return;
    const current = startCamera({video:video.current,onRead(raw,format='') {
      const parsed = parseScanPayload(raw), classification=classifyScanPayload(raw);
      const normalizedFormat=format.toLowerCase();const linearIdBarcode=/code[_ -]?(?:128|39)/i.test(normalizedFormat)?parsed.certNumber??'':'';
      setStatus('Code found'); setPayload(parsed); setBarcodeCandidate(linearIdBarcode);setCert(classification.kind==='grader-certification-url'?classification.payload.certNumber??'':normalizedFormat.includes('qr')?parsed.certNumber??'':''); setGradeCandidate(classification.kind==='grader-certification-url'?classification.gradeCandidate??'':''); setGrader(''); setHasTorch(false);
    },onError:setError,onReady(supported, details) {setHasTorch(supported);setDiagnostics(details);setStatus('Looking for a barcode or QR code…');}});
    camera.current = current;
    const interrupt = () => { current.stop(); setError('Scanning paused. Tap Rescan to restart the camera.'); };
    const hidden = () => {if(document.hidden) interrupt();};
    document.addEventListener('visibilitychange',hidden);
    window.addEventListener('pagehide',interrupt);
    return () => {current.stop(); camera.current = null;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',interrupt);};
  },[attempt,payload]);
  function reset() {camera.current?.stop();setPayload(null);setBarcodeCandidate('');setCert('');setGrader('');setGradeCandidate('');setError('');setTorch(false);setHasTorch(false);setDiagnostics(null);setFocusPoint(null);setCopyStatus('');setStatus('Requesting camera access…');setAttempt(value=>value+1);}
  function selectGrader(value:Grader|''){setGrader(value);setCert(current=>certAfterGraderSelection(value,current,barcodeCandidate));}
  async function copyRaw() { if(!payload) return; try { await navigator.clipboard.writeText(payload.rawPayload); setCopyStatus('Copied'); } catch { setCopyStatus('Select and copy the decoded data below.'); } }
  async function scanStill() { setStatus('Scanning this frame…'); const surface=cameraSurface.current?.getBoundingClientRect(), target=cameraSurface.current?.querySelector('.scan-target')?.getBoundingClientRect(), v=video.current; const region=surface&&target&&v?.videoWidth ? sourceRect({width:v.videoWidth,height:v.videoHeight},{x:surface.x,y:surface.y,width:surface.width,height:surface.height},{x:target.x,y:target.y,width:target.width,height:target.height}) : undefined; const result=await camera.current?.scanStill(region); if(!result?.raw) setStatus(`Couldn't read that code. Hold it steady and try again, or enter the cert manually.`); }
  async function setZoom(value:number) { const current=await camera.current?.zoom(value); if(current !== undefined) setDiagnostics(previous=>previous?.zoom ? {...previous,zoom:{...previous.zoom,current}} : previous); }
  function distance() { const values=[...pointers.current.values()]; return values.length===2 ? Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y) : 0; }
  const pinchStart = useRef<{distance:number;zoom:number}|null>(null);
  function pointerDown(event:PointerEvent<HTMLDivElement>) { if(!diagnostics?.zoom) return; pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY}); if(pointers.current.size===2) { event.currentTarget.setPointerCapture(event.pointerId); pinchStart.current={distance:distance(),zoom:diagnostics.zoom.current}; } }
  function pointerMove(event:PointerEvent<HTMLDivElement>) { if(!diagnostics?.zoom || !pointers.current.has(event.pointerId)) return; pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY}); if(pinchStart.current && pointers.current.size===2) { event.preventDefault(); const scale=distance()/pinchStart.current.distance; void setZoom(pinchStart.current.zoom*scale); } }
  function pointerUp(event:PointerEvent<HTMLDivElement>) { pointers.current.delete(event.pointerId); if(pointers.current.size<2) pinchStart.current=null; }
  async function tapFocus(event:PointerEvent<HTMLDivElement>) { if(!diagnostics?.pointsOfInterest || pointers.current.size>1) return; const rect=event.currentTarget.getBoundingClientRect(), x=(event.clientX-rect.left)/rect.width, y=(event.clientY-rect.top)/rect.height; if(await camera.current?.focusAt(x,y)) { setFocusPoint({x:x*100,y:y*100}); window.setTimeout(()=>setFocusPoint(null),900); } }
  // Raw text exists only in this mounted component. Confirmation emits just grader + cert.
  function manual() {camera.current?.stop();onManual(cert,grader || undefined);}
  return <div className={`scan-entry ${payload ? 'scan-confirmation' : 'scan-active'}`}>
    {payload ? <>
      {(() => { const classification=classifyScanPayload(payload.rawPayload); return classification.kind==='grader-certification-url' ? <div className="generic-url-flow"><p className="eyebrow">CODE READ SUCCESSFULLY</p><h3>Certification link found</h3><p className="muted">Confirm the grading company, then review the card details. Slabberjaws has not verified this certification.</p><label className="field">Grading company<select value={grader} onChange={event=>setGrader(event.target.value as Grader)}><option value="">Suggested: {classification.suggestedGrader} — confirm company</option>{graders.map(value=><option key={value}>{value}</option>)}</select></label><label className="field">Certification number<input value={cert} onChange={event=>setCert(event.target.value)} autoComplete="off"/></label>{gradeCandidate&&<label className="field">Editable grade candidate<input value={gradeCandidate} onChange={event=>setGradeCandidate(event.target.value)}/></label>}{grader&&grader!==classification.suggestedGrader&&<p role="status" className="form-message">This link format is associated with {classification.suggestedGrader}. Your selected grader will be used for this card.</p>}<button className="primary wide" disabled={!grader||!cert.trim()} onClick={()=>{const handoff=confirmedScanHandoff(payload.rawPayload,grader,cert,gradeCandidate);if(handoff?.kind==='manual')onManualDetails(handoff.grader,handoff.certNumber,{certUrl:handoff.certUrl,grade:handoff.grade});else if(handoff?.kind==='lookup')onConfirm(handoff.grader,handoff.certNumber);}}>Continue to card details</button></div> : classification.kind==='generic-grader-url' ? <div className="generic-url-flow"><p className="eyebrow">CODE READ SUCCESSFULLY</p><h3>This QR code links to the grading company’s website.</h3><p className="muted">It doesn’t contain a certification number. Enter the number printed on your slab to continue.</p><label className="field">Grading company<select value={grader} onChange={event=>setGrader(event.target.value as Grader)}><option value="">Suggested: {classification.suggestedGrader} — confirm company</option>{graders.map(value=><option key={value}>{value}</option>)}</select></label><label className="field">Certification number<input autoFocus value={cert} onChange={event=>setCert(event.target.value)} inputMode="text" autoComplete="off"/></label><button className="primary wide" disabled={!grader||!cert.trim()} onClick={()=>{const handoff=confirmedScanHandoff(payload.rawPayload,grader,cert);if(handoff?.kind==='manual')onManualDetails(handoff.grader,handoff.certNumber);else if(handoff?.kind==='lookup')onConfirm(handoff.grader,handoff.certNumber);}}>Continue to card details</button><details className="raw-payload"><summary>Decoded raw data</summary><code>{payload.rawPayload}</code><button type="button" className="account-button" onClick={()=>void copyRaw()}>Copy raw data</button>{copyStatus&&<p role="status">{copyStatus}</p>}</details></div> : <><h3>Which grading company is this?</h3>
      <p className="muted">Check the slab label and confirm the certification number.</p>
      {!payload.certNumber && <><p role="status" className="form-message">The code was read, but a certification number could not be identified safely. Type it below or rescan.</p><section className="raw-payload" aria-label="Decoded raw data"><strong>DECODED RAW DATA</strong><code>{payload.rawPayload}</code><button type="button" className="account-button" onClick={()=>void copyRaw()}>Copy raw data</button>{copyStatus&&<p role="status">{copyStatus}</p>}</section></>}
      <label className="field">Grading company<select value={grader} onChange={event=>selectGrader(event.target.value as Grader)}><option value="">Choose a grading company</option>{graders.map(value=><option key={value}>{value}</option>)}</select></label>
      {barcodeCandidate&&<p role="status" className="form-message">A Code 128/39 barcode was read. Choose CSG to use its numeric certification candidate, or enter the cert printed on another grader’s slab.</p>}
      <label className="field">Decoded certification number<input value={cert} onChange={event=>setCert(event.target.value)} autoComplete="off" spellCheck={false}/></label>
      <button className="primary wide" disabled={!grader || !cert.trim()} onClick={()=>{const handoff=confirmedScanHandoff(payload.rawPayload,grader,cert);if(handoff?.kind==='lookup')onConfirm(handoff.grader,handoff.certNumber);else if(handoff?.kind==='manual')onManualDetails(handoff.grader,handoff.certNumber);}}>{grader&&hasAutomaticLookup(grader)?'Look up certification':'Continue to card details'}</button>
      </>})()}
    </> : <>
      <div className="scan-header"><button className="scan-icon-button" aria-label="Cancel scan" onClick={()=>{camera.current?.stop();onCancel();}}>×</button><strong>SCAN SLAB</strong>{hasTorch && !error ? <button className="scan-icon-button" aria-label={`Turn flashlight ${torch?'off':'on'}`} aria-pressed={torch} onClick={async()=>{try{await camera.current?.torch(!torch);setTorch(!torch);}catch{setHasTorch(false);setStatus('Flashlight unavailable. You can continue scanning.');}}}>Flash</button> : <span/>}</div>
      <div ref={cameraSurface} className="scan-camera" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onClick={tapFocus}><video ref={video} muted playsInline aria-label="Live camera preview"/><div className="scan-target" aria-hidden="true"/><span className="scan-target-label">PLACE CODE HERE</span>{focusPoint && <span className="focus-reticle" style={{left:`${focusPoint.x}%`,top:`${focusPoint.y}%`}} aria-hidden="true"/>}</div>
      <p role="status" className="scan-status">{error || status}</p>
      {!error && <button className="primary scan-still" onClick={()=>void scanStill()}>Scan this code</button>}
      {diagnostics?.zoom && <label className="scan-zoom"><span>Zoom {diagnostics.zoom.current.toFixed(1)}×</span><input aria-label="Camera zoom" type="range" min={diagnostics.zoom.min} max={diagnostics.zoom.max} step={diagnostics.zoom.step} value={diagnostics.zoom.current} onChange={event=>void setZoom(Number(event.target.value))}/></label>}
      {isDev && diagnostics && <p className="scan-diagnostics">Decoder: {diagnostics.decoder} · source: {diagnostics.width}×{diagnostics.height} · {diagnostics.formats.join(', ')}</p>}
      <div className="scan-desktop-actions">{hasTorch && !error && <button className="account-button" aria-label={`Turn flashlight ${torch?'off':'on'}`} aria-pressed={torch} onClick={async()=>{try{await camera.current?.torch(!torch);setTorch(!torch);}catch{setHasTorch(false);setStatus('Flashlight unavailable. You can continue scanning.');}}}>Turn flashlight {torch?'off':'on'}</button>}<button className="text-button" onClick={()=>{camera.current?.stop();onCancel();}}>Cancel scan</button></div>
    </>}
    {(payload || error) && <button className="text-button" onClick={reset}>Rescan</button>}
    <button className="text-button scan-manual" onClick={manual}>Enter Cert Manually</button>
    {payload && <button className="text-button" onClick={()=>{camera.current?.stop();onCancel();}}>Cancel scan</button>}
  </div>;
}
