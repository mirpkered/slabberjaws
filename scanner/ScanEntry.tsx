'use client';
import { useEffect, useRef, useState } from 'react';
import type { NormalizedCard } from '../graders/model';
import { startCamera } from './camera';
import { parseScanPayload, type ScanPayload } from './payload';

type Grader = NormalizedCard['grader'];
type Props = { graders: Grader[]; onConfirm(grader: Grader, cert: string): void; onManual(cert: string, grader?: Grader): void; onCancel(): void };
export function ScanEntry({graders,onConfirm,onManual,onCancel}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<ReturnType<typeof startCamera> | null>(null);
  const [attempt,setAttempt] = useState(0), [payload,setPayload] = useState<ScanPayload | null>(null);
  const [cert,setCert] = useState(''), [grader,setGrader] = useState<Grader | ''>('');
  const [error,setError] = useState(''), [status,setStatus] = useState('Requesting camera access…');
  const [hasTorch,setHasTorch] = useState(false), [torch,setTorch] = useState(false);
  useEffect(() => {
    if (payload || !video.current) return;
    const current = startCamera({video:video.current,onRead(raw) {
      const parsed = parseScanPayload(raw);
      setPayload(parsed); setCert(parsed.certNumber ?? ''); setGrader(''); setHasTorch(false);
    },onError:setError,onReady(supported) {setHasTorch(supported);setStatus('Place one barcode or QR code inside the frame.');}});
    camera.current = current;
    const interrupt = () => { current.stop(); setError('Scanning paused. Tap Rescan to restart the camera.'); };
    const hidden = () => {if(document.hidden) interrupt();};
    document.addEventListener('visibilitychange',hidden);
    window.addEventListener('pagehide',interrupt);
    return () => {current.stop(); camera.current = null;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',interrupt);};
  },[attempt,payload]);
  function reset() {camera.current?.stop();setPayload(null);setCert('');setGrader('');setError('');setTorch(false);setHasTorch(false);setStatus('Requesting camera access…');setAttempt(value=>value+1);}
  // Raw text exists only in this mounted component. Confirmation emits just grader + cert.
  function manual() {camera.current?.stop();onManual(cert,grader || undefined);}
  return <div className="scan-entry">
    {payload ? <>
      <h3>Which grading company is this?</h3>
      <p className="muted">Check the slab label and confirm the certification number.</p>
      {!payload.certNumber && <p role="status" className="form-message">The code was read, but a certification number could not be identified safely. Type it below or rescan.</p>}
      <label className="field">Grading company<select value={grader} onChange={event=>setGrader(event.target.value as Grader)}><option value="">Choose a grading company</option>{graders.map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="field">Decoded certification number<input value={cert} onChange={event=>setCert(event.target.value)} autoComplete="off" spellCheck={false}/></label>
      <button className="primary wide" disabled={!grader || !cert.trim()} onClick={()=>{if(grader)onConfirm(grader,cert.trim());}}>Look up certification</button>
    </> : <>
      <div className="scan-camera"><video ref={video} muted playsInline aria-label="Live camera preview"/><div className="scan-target" aria-hidden="true"/></div>
      <p role="status" className="muted">{error || status}</p>
      <p className="scan-privacy">Camera frames stay on this device. No photo or video is saved or uploaded.</p>
      {hasTorch && !error && <button className="account-button" aria-pressed={torch} onClick={async()=>{try{await camera.current?.torch(!torch);setTorch(!torch);}catch{setHasTorch(false);setStatus('Flashlight unavailable. You can continue scanning.');}}}>Turn flashlight {torch?'off':'on'}</button>}
    </>}
    {(payload || error) && <button className="text-button" onClick={reset}>Rescan</button>}
    <button className="text-button" onClick={manual}>Enter Cert Manually</button>
    <button className="text-button" onClick={()=>{camera.current?.stop();onCancel();}}>Cancel scan</button>
  </div>;
}
