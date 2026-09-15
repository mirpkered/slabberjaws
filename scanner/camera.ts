import { createDecoder, type Decoder } from './decoder.ts';

export function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was denied. Allow camera access in your browser settings, or enter the cert manually.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No usable camera was found. You can enter the cert manually.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is busy or was interrupted. Close other camera apps and try again, or enter the cert manually.';
  return 'The scanner could not start or continue in this browser. Try again, or enter the cert manually.';
}
export type ZoomCapability = { min: number; max: number; step: number; current: number };
export type CameraDiagnostics = { decoder: NonNullable<Decoder['kind']>; formats: string[]; width: number; height: number; label: string; torch: boolean; zoom?: ZoomCapability; focusModes: string[]; focusMode?: string; pointsOfInterest: boolean };
type Options = { video: HTMLVideoElement; onRead(raw: string): void; onError(message: string): void; onReady(torch: boolean, diagnostics: CameraDiagnostics): void };
export type CameraDependencies = {
  secure: boolean;
  getMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  decoder: () => Promise<Decoder>;
};

/** Owns every camera resource, including streams resolved after cancellation.
 * No images/video/payloads are uploaded or sent to a persistence repository. */
export function startCamera(options: Options, dependencies: CameraDependencies = {
  secure: window.isSecureContext,
  getMedia: navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices),
  decoder: createDecoder,
}) {
  let stopped = false;
  let stream: MediaStream | undefined;
  let decoder: Decoder | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let diagnostics: CameraDiagnostics | undefined;
  function videoTrack() { return stream?.getVideoTracks()[0]; }
  function stop() {
    stopped = true;
    clearTimeout(timer);
    stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    stream = undefined;
    decoder?.dispose(); decoder = undefined;
    options.video.pause(); options.video.srcObject = null;
  }
  function fail(message: string) { if (!stopped) { stop(); options.onError(message); } }
  async function tick() {
    if (stopped) return;
    try {
      if (options.video.readyState >= 2 && options.video.videoWidth > 0) {
        const raw = await decoder?.decode(options.video);
        if (stopped) return;
        if (raw?.trim()) { stop(); options.onRead(raw); return; }
      }
      timer = setTimeout(tick, 180);
    } catch (error) { fail(cameraError(error)); }
  }
  const ready = (async () => {
    if (!dependencies.secure) { fail('Camera scanning needs a secure HTTPS page. Enter the cert manually here.'); return; }
    if (!dependencies.getMedia) { fail('This browser does not offer camera access. Enter the cert manually.'); return; }
    try {
      const acquired = await dependencies.getMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
      if (stopped) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      stream.getTracks().forEach(track => { track.onended = () => fail('Camera access ended. Rescan to try again, or enter the cert manually.'); });
      options.video.srcObject = stream;
      await options.video.play();
      if (stopped) return;
      const loaded = await dependencies.decoder();
      if (stopped) { loaded.dispose(); return; }
      decoder = loaded;
      const track = videoTrack();
      const caps = track?.getCapabilities?.() as MediaTrackCapabilities & {torch?: boolean; zoom?: {min:number;max:number;step?:number}; focusMode?: string[]; pointsOfInterest?: unknown};
      const settings = track?.getSettings?.() as MediaTrackSettings & {zoom?:number; focusMode?:string};
      const focusModes = caps?.focusMode ?? [];
      // This is best-effort and intentionally not a prerequisite for scanning.
      if (focusModes.includes('continuous')) try { await track?.applyConstraints({advanced:[{focusMode:'continuous'} as MediaTrackConstraintSet]}); } catch {}
      const refreshed = track?.getSettings?.() as MediaTrackSettings & {zoom?:number; focusMode?:string};
      diagnostics = {decoder: decoder.kind ?? 'zxing', formats: decoder.formats ?? [], width: options.video.videoWidth, height: options.video.videoHeight, label: track?.label ?? '', torch:Boolean(caps?.torch), zoom:caps?.zoom ? {min:caps.zoom.min,max:caps.zoom.max,step:caps.zoom.step ?? .1,current:refreshed?.zoom ?? settings?.zoom ?? caps.zoom.min} : undefined, focusModes, focusMode:refreshed?.focusMode ?? settings?.focusMode, pointsOfInterest:Boolean(caps?.pointsOfInterest)};
      options.onReady(Boolean(caps?.torch), diagnostics);
      void tick();
    } catch (error) { fail(cameraError(error)); }
  })();
  return { stop, ready, async torch(enabled: boolean) {
    const track = videoTrack();
    if (!track || stopped) return;
    await track.applyConstraints({advanced:[{torch:enabled} as MediaTrackConstraintSet]});
  }, async zoom(value: number) {
    const track = videoTrack(), zoom = diagnostics?.zoom;
    if (!track || !zoom || stopped) return undefined;
    const next = Math.min(zoom.max, Math.max(zoom.min, Math.round((value - zoom.min) / zoom.step) * zoom.step + zoom.min));
    await track.applyConstraints({advanced:[{zoom:next} as MediaTrackConstraintSet]});
    zoom.current = (track.getSettings() as MediaTrackSettings & {zoom?:number}).zoom ?? next;
    return zoom.current;
  }, async focusAt(x: number, y: number) {
    const track = videoTrack();
    if (!track || !diagnostics?.pointsOfInterest || stopped) return false;
    try { await track.applyConstraints({advanced:[{pointsOfInterest:[{x,y}]} as unknown as MediaTrackConstraintSet]}); return true; } catch { return false; }
  }};
}
