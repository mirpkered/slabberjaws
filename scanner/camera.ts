import { createDecoder, type Decoder } from './decoder.ts';

export function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was denied. Allow camera access in your browser settings, or enter the cert manually.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No usable camera was found. You can enter the cert manually.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is busy or was interrupted. Close other camera apps and try again, or enter the cert manually.';
  return 'The scanner could not start or continue in this browser. Try again, or enter the cert manually.';
}
export type CameraDiagnostics = { decoder: NonNullable<Decoder['kind']>; formats: string[]; width: number; height: number };
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
      const caps = stream.getVideoTracks()[0]?.getCapabilities?.() as MediaTrackCapabilities & {torch?: boolean};
      options.onReady(Boolean(caps?.torch), {decoder: decoder.kind ?? 'zxing', formats: decoder.formats ?? [], width: options.video.videoWidth, height: options.video.videoHeight});
      void tick();
    } catch (error) { fail(cameraError(error)); }
  })();
  return { stop, ready, async torch(enabled: boolean) {
    const track = stream?.getVideoTracks()[0];
    if (!track || stopped) return;
    await track.applyConstraints({advanced:[{torch:enabled} as MediaTrackConstraintSet]});
  }};
}
