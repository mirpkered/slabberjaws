export type Crop={x:number;y:number;width:number;height:number};
export const fullCrop=():Crop=>({x:0,y:0,width:100,height:100});
export function validCrop(crop:Crop):Crop{const width=Math.min(100,Math.max(8,crop.width)),height=Math.min(100,Math.max(8,crop.height));return{x:Math.min(100-width,Math.max(0,crop.x)),y:Math.min(100-height,Math.max(0,crop.y)),width,height};}
export function sourceCrop(crop:Crop,width:number,height:number){const c=validCrop(crop);return{x:Math.round(c.x/100*width),y:Math.round(c.y/100*height),width:Math.round(c.width/100*width),height:Math.round(c.height/100*height)};}
