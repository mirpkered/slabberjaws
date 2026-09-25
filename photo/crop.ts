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

export type CropCorner="top-left"|"top-right"|"bottom-left"|"bottom-right";

/** Resize from any corner, keeping the opposite corner anchored and enforcing bounds/minimum dimensions. */
export function resizeCropFromCorner(crop:Crop,dx:number,dy:number,imageRect:{width:number;height:number},corner:CropCorner){
  if(imageRect.width<=0||imageRect.height<=0)return validCrop(crop);
  const c=validCrop(crop),mx=dx/imageRect.width*100,my=dy/imageRect.height*100;
  let left=c.x,right=c.x+c.width,top=c.y,bottom=c.y+c.height;
  if(corner.includes("left"))left=Math.max(0,Math.min(right-8,left+mx));else right=Math.min(100,Math.max(left+8,right+mx));
  if(corner.startsWith("top"))top=Math.max(0,Math.min(bottom-8,top+my));else bottom=Math.min(100,Math.max(top+8,bottom+my));
  return {x:left,y:top,width:right-left,height:bottom-top};
}
export const resizeCropByDisplayDelta=(crop:Crop,dx:number,dy:number,imageRect:{width:number;height:number})=>resizeCropFromCorner(crop,dx,dy,imageRect,"bottom-right");
