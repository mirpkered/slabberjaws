import type { NormalizedCard } from "../graders/model";
import type { LookupFailure, LookupResult } from "../graders/types";

const env=(import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env;

function endpoint(){
  const explicit=env?.VITE_LOOKUP_API_URL?.trim();
  if(explicit)return explicit;
  const supabaseUrl=env?.VITE_SUPABASE_URL?.trim();
  if(supabaseUrl&&!supabaseUrl.includes("your-project-ref"))return new URL("/functions/v1/lookup",supabaseUrl).toString();
  if(typeof location!=="undefined"&&(location.hostname==="localhost"||location.hostname==="127.0.0.1"))return "local";
  return null;
}

export async function lookupCertification(grader:string,certNumber:string):Promise<LookupResult<NormalizedCard>>{
  const target=endpoint();
  if(!target)return{ok:false,code:"GRADER_UNAVAILABLE",message:"Automatic lookup is not configured for this deployment."};
  try{
    const response=target==="local"
      ?await fetch(`/api/lookup/${encodeURIComponent(grader)}/${encodeURIComponent(certNumber)}`)
      :await fetch(target,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({grader:grader.toLowerCase(),certNumber})});
    const value=await response.json() as LookupResult<NormalizedCard>;
    if(typeof value?.ok!=="boolean")throw new Error("Invalid lookup response");
    return value;
  }catch{
    return{ok:false,code:"GRADER_UNAVAILABLE",message:"The certification lookup service could not be reached."} satisfies LookupFailure;
  }
}
