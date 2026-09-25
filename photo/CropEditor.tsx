"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { containedImageRect, moveCropByDisplayDelta, resizeCropFromCorner, type Crop, type CropCorner } from "./crop";

type Props = { src: string; alt: string; crop: Crop; onChange(crop: Crop): void };
type Size = { width: number; height: number };
type Drag = { pointerId: number; x: number; y: number; crop: Crop; mode: "move" | "resize"; corner?: CropCorner };

/** Touch-safe crop editor. Crop percentages are relative to the visible, object-fit:contain image, not its letterboxed stage. */
export function CropEditor({ src, alt, crop, onChange }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [stageSize, setStageSize] = useState<Size>({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    if (!stage.current) return;
    const element = stage.current;
    const measure = () => setStageSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const imageRect = containedImageRect(imageSize.width, imageSize.height, stageSize.width, stageSize.height);
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const target=event.target instanceof HTMLElement?event.target:event.currentTarget;
    const handle=target.closest<HTMLElement>("[data-crop-resize]");
    const corner=(['top-left','top-right','bottom-left','bottom-right'] as CropCorner[]).find(value=>value===handle?.dataset.cropResize);
    try { target.setPointerCapture(event.pointerId); } catch { /* Older WebKit may not expose capture for synthetic pointer events. */ }
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, crop, mode:handle?"resize":"move", ...(corner?{corner}:{}) };
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    onChange(active.mode === "move"
      ? moveCropByDisplayDelta(active.crop, dx, dy, imageRect)
      : resizeCropFromCorner(active.crop, dx, dy, imageRect, active.corner ?? "bottom-right"));
  }
  function pointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }
  function keyboardResize(event: KeyboardEvent<HTMLButtonElement>, corner: CropCorner) {
    const deltas: Record<string, [number, number]> = { ArrowRight: [3, 0], ArrowLeft: [-3, 0], ArrowDown: [0, 3], ArrowUp: [0, -3] };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    onChange(resizeCropFromCorner(crop, delta[0] * imageRect.width / 100, delta[1] * imageRect.height / 100, imageRect, corner));
  }

  return <div className="crop-stage" ref={stage} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
    <div className="crop-image-frame" style={{ width: imageRect.width, height: imageRect.height, left: imageRect.x, top: imageRect.y }}>
      <img src={src} alt={alt} draggable={false} onLoad={event => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
      <div className="crop-box" data-crop-move="true" role="group" aria-label="Crop region; drag inside to move" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }} onPointerDown={pointerDown}>
        {(["top-left","top-right","bottom-left","bottom-right"] as CropCorner[]).map(corner=><button key={corner} className={`crop-handle crop-handle-${corner}`} data-crop-resize={corner} type="button" aria-label={`Resize crop ${corner}`} onKeyDown={event=>keyboardResize(event,corner)} />)}
      </div>
    </div>
  </div>;
}
