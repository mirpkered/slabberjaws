export type Rect={x:number;y:number;width:number;height:number};
/** Maps an overlay in an object-fit:cover viewport back to source-video pixels. */
export function sourceRect(source:{width:number;height:number}, viewport:Rect, overlay:Rect):Rect {
  const scale=Math.max(viewport.width/source.width,viewport.height/source.height), drawn={width:source.width*scale,height:source.height*scale};
  const offsetX=(viewport.width-drawn.width)/2,offsetY=(viewport.height-drawn.height)/2;
  const x=Math.max(0,(overlay.x-viewport.x-offsetX)/scale), y=Math.max(0,(overlay.y-viewport.y-offsetY)/scale);
  return {x,y,width:Math.min(source.width-x,overlay.width/scale),height:Math.min(source.height-y,overlay.height/scale)};
}
