export type Crop={x:number;y:number;width:number;height:number};
export const fullCrop=():Crop=>({x:0,y:0,width:100,height:100});
export function validCrop(crop:Crop):Crop{const width=Math.min(100,Math.max(8,crop.width)),height=Math.min(100,Math.max(8,crop.height));return{x:Math.min(100-width,Math.max(0,crop.x)),y:Math.min(100-height,Math.max(0,crop.y)),width,height};}
export function sourceCrop(crop:Crop,width:number,height:number){const c=validCrop(crop);return{x:Math.round(c.x/100*width),y:Math.round(c.y/100*height),width:Math.round(c.width/100*width),height:Math.round(c.height/100*height)};}

/** The displayed photograph uses object-fit: contain; this is its real box inside the editor stage. */
export function containedImageRect(imageWidth:number,imageHeight:number,stageWidth:number,stageHeight:number){
  if(imageWidth<=0||imageHeight<=0||stageWidth<=0||stageHeight<=0)return{x:0,y:0,width:0,height:0};
  const scale=Math.min(stageWidth/imageWidth,stageHeight/imageHeight),width=imageWidth*scale,height=imageHeight*scale;
  return{x:(stageWidth-width)/2,y:(stageHeight-height)/2,width,height};
}

/** Convert pointer movement measured in displayed image pixels to source-relative crop percentages. */
export function moveCropByDisplayDelta(crop:Crop,dx:number,dy:number,imageRect:{width:number;height:number}){
  if(imageRect.width<=0||imageRect.height<=0)return validCrop(crop);
  return validCrop({...crop,x:crop.x+dx/imageRect.width*100,y:crop.y+dy/imageRect.height*100});
}

/** Resize from the lower-right corner, preserving the crop origin and clamping within image bounds. */
export function resizeCropByDisplayDelta(crop:Crop,dx:number,dy:number,imageRect:{width:number;height:number}){
  if(imageRect.width<=0||imageRect.height<=0)return validCrop(crop);
  return validCrop({...crop,width:crop.width+dx/imageRect.width*100,height:crop.height+dy/imageRect.height*100});
}
