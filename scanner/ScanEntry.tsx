'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { NormalizedCard } from '../graders/model';
import { startCamera, type CameraDiagnostics } from './camera';
import { parseScanPayload, type ScanPayload } from './payload';
import { sourceRect } from './frame';

type Grader = NormalizedCard['grader'];
type Props = { graders: Grader[]; onConfirm(grader: Grader, cert: string): void; onManual(cert: string, grader?: Grader): void; onCancel(): void };
const isDev = (import.meta as ImportMeta & {env?: Record<string, boolean | undefined>}).env?.DEV;
export function ScanEntry({graders,onConfirm,onManual,onCancel}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const cameraSurface = useRef<HTMLDivElement>(null);
  const camera = useRef<ReturnType<typeof startCamera> | null>(null);
  const pointers = useRef(new Map<number,{x:number;y:number}>());
  const [attempt,setAttempt] = useState(0), [payload,setPayload] = useState<ScanPayload | null>(null);
  const [cert,setCert] = useState(''), [grader,setGrader] = useState<Grader | ''>('');
  const [error,setError] = useState(''), [status,setStatus] = useState('Requesting camera access…');
  const [hasTorch,setHasTorch] = useState(false), [torch,setTorch] = useState(false), [diagnostics,setDiagnostics] = useState<CameraDiagnostics | null>(null), [focusPoint,setFocusPoint] = useState<{x:number;y:number}|null>(null);
  useEffect(() => {
    if (payload || !video.current) return;
    const current = startCamera({video:video.current,onRead(raw) {
      const parsed = parseScanPayload(raw);
      setStatus('Code found'); setPayload(parsed); setCert(parsed.certNumber ?? ''); setGrader(''); setHasTorch(false);
    },onError:setError,onReady(supported, details) {setHasTorch(supported);setDiagnostics(details);setStatus('Looking for a barcode or QR code…');}});
    camera.current = current;
    const interrupt = () => { current.stop(); setError('Scanning paused. Tap Rescan to restart the camera.'); };
    const hidden = () => {if(document.hidden) interrupt();};
    document.addEventListener('visibilitychange',hidden);
    window.addEventListener('pagehide',interrupt);
    return () => {current.stop(); camera.current = null;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',interrupt);};
  },[attempt,payload]);
  function reset() {camera.current?.stop();setPayload(null);setCert('');setGrader('');setError('');setTorch(false);setHasTorch(false);setDiagnostics(null);setFocusPoint(null);setStatus('Requesting camera access…');setAttempt(value=>value+1);}
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
      <h3>Which grading company is this?</h3>
      <p className="muted">Check the slab label and confirm the certification number.</p>
      {!payload.certNumber && <p role="status" className="form-message">The code was read, but a certification number could not be identified safely. Type it below or rescan.</p>}
      <label className="field">Grading company<select value={grader} onChange={event=>setGrader(event.target.value as Grader)}><option value="">Choose a grading company</option>{graders.map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="field">Decoded certification number<input value={cert} onChange={event=>setCert(event.target.value)} autoComplete="off" spellCheck={false}/></label>
      <button className="primary wide" disabled={!grader || !cert.trim()} onClick={()=>{if(grader)onConfirm(grader,cert.trim());}}>Look up certification</button>
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
