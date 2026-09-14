import type { NormalizedCard } from "./model.ts";
import type { LookupResult } from "./types.ts";

type ProductSchema={"@type"?:string;image?:string;brand?:{name?:string};about?:{name?:string};additionalProperty?:Array<{name?:string;value?:string}>};
const text=(html:string,className:string)=>{const hit=html.match(new RegExp(`<([a-z0-9]+)[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`,"i"));return hit?decode(hit[2].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()):""};
const decode=(value:string)=>value.replace(/&amp;/g,"&").replace(/&#8217;|&rsquo;/g,"’").replace(/&ndash;/g,"–").replace(/&quot;/g,'"');

export function parseDegreeHtml(html:string,certNumber:string):NormalizedCard{
  const schemas=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>{try{return JSON.parse(m[1])}catch{return null}});
  const product=(schemas.find(s=>s?.["@type"]==="Product")??schemas.flatMap(s=>s?.["@graph"]??[]).find((s:ProductSchema)=>s?.["@type"]==="Product")) as ProductSchema|undefined;
  if(!product)throw new Error("Degree product schema was not found");
  const props=Object.fromEntries((product.additionalProperty??[]).map(p=>[p.name??"",String(p.value??"")]));
  const yearBrand=text(html,"hero-year"); const year=yearBrand.match(/^\d{4}/)?.[0]??""; const brand=product.brand?.name??yearBrand.replace(/^\d{4}\s*/,"");
  const grade=text(html,"slab-grade")||props.Grade?.replace(/^DEGREE\s+/i,"");
  const exactPopulation=text(html,"hero-summary").match(/out of\s+(\d+)\s+we[’']ve graded/i)?.[1]??html.match(/out of\s*<b>(\d+)<\/b>/i)?.[1];
  const totalSet=html.match(/entire\s*<b>(\d+)<\/b>-card/i)?.[1];
  const rarity=text(html,"tier rar-")||text(html,"tier");
  return {id:`degree:${certNumber}`,grader:"Degree",certNumber,grade,year,brand,set:text(html,"hero-set"),subject:product.about?.name??"",cardNumber:props["Card Number"]??"",variant:text(html,"hero-variant"),frontImageUrl:product.image??"",backImageUrl:"",certUrl:`https://degreegrading.com/certification/${certNumber}/`,population:exactPopulation?Number(exactPopulation):null,graderSpecific:{subgrades:{surface:props.Surface??null,cornersEdges:props["Corners/Edges"]??null,centering:props.Centering??null,creasesDents:props["Creases/Dents"]??null},setPopulation:totalSet?Number(totalSet):null,rarity:rarity||null,imageType:product.image?"grader-hosted certification graphic; not a front slab scan":null},addedAt:new Date().toISOString()};
}

export async function lookupDegree(cert:string):Promise<LookupResult<NormalizedCard>>{
  if(!/^\d{8}$/.test(cert))return{ok:false,code:"INVALID_CERT",message:"Degree certification numbers contain eight digits."};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  const publicHeaders={"user-agent":"Mozilla/5.0 (compatible; Slabberjaws/1.0; +personal collection lookup)","accept":"text/html,application/json;q=0.9,*/*;q=0.8","referer":"https://degreegrading.com/certification-lookup/"};
  try{const check=await fetch("https://degreegrading.com/wp-admin/admin-ajax.php",{method:"POST",headers:{...publicHeaders,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({action:"degree_check_cert",cert:cert.replace(/^0+/,"")}),signal:controller.signal});
    if(!check.ok)return{ok:false,code:"GRADER_UNAVAILABLE",message:"Degree’s lookup service is unavailable."};
    const result=await check.json() as {success?:boolean;data?:{exists?:boolean;slug?:string}};
    if(!result.success||!result.data?.exists)return{ok:false,code:"CERT_NOT_FOUND",message:"Degree could not find this certification."};
    const sessionCookie=check.headers.get("set-cookie")?.split(";",1)[0];
    if(!sessionCookie)return{ok:false,code:"LOOKUP_BLOCKED",message:"Degree did not establish the lookup session required to open this certification."};
    const page=await fetch(`https://degreegrading.com/certification/${result.data.slug}/`,{headers:{...publicHeaders,cookie:sessionCookie},signal:controller.signal});
    if(page.status===403)return{ok:false,code:"LOOKUP_BLOCKED",message:"Degree blocked the certification page request."};
    if(!page.ok)return{ok:false,code:"GRADER_UNAVAILABLE",message:"Degree’s certification page is unavailable."};
    try{return{ok:true,card:{...parseDegreeHtml(await page.text(),cert),id:crypto.randomUUID()}}}catch{return{ok:false,code:"PARSE_FAILED",message:"Degree’s certification page format has changed."}}
  } catch(error) {
    return {ok:false,code:error instanceof Error&&error.name==="AbortError"?"TIMEOUT":"GRADER_UNAVAILABLE",message:error instanceof Error&&error.name==="AbortError"?"Degree lookup timed out.":"Degree lookup could not be reached."};
  } finally { clearTimeout(timer); }
}
