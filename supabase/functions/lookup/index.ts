import { lookupDegree } from "../../../graders/degree.ts";
import { lookupPsa } from "../../../graders/psa.ts";
import type { LookupFailure, LookupResult } from "../../../graders/types.ts";
import type { NormalizedCard } from "../../../graders/model.ts";
import { routeLookup } from "../../../lookup/router.ts";

declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Response|Promise<Response>):void};

const productionOrigin="https://mirpkered.github.io";
function cors(origin:string|null){const allowed=origin===productionOrigin||origin==="http://localhost:5173"||origin==="http://127.0.0.1:5173";return{"access-control-allow-origin":allowed&&origin?origin:productionOrigin,"access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS","vary":"Origin"}}
function status(result:LookupResult<NormalizedCard>){if(result.ok)return 200;return({INVALID_CERT:400,CERT_NOT_FOUND:404,AUTH_REQUIRED:503,LOOKUP_BLOCKED:502,PARSE_FAILED:502,TIMEOUT:504,UNSUPPORTED_GRADER:400,GRADER_UNAVAILABLE:503} satisfies Record<LookupFailure["code"],number>)[result.code]}
function json(body:unknown,statusCode:number,origin:string|null){return new Response(JSON.stringify(body),{status:statusCode,headers:{...cors(origin),"content-type":"application/json","cache-control":"no-store"}})}

Deno.serve(async(request)=>{
  const origin=request.headers.get("origin");
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=="POST")return json({ok:false,code:"UNSUPPORTED_GRADER",message:"Use POST /lookup."},405,origin);
  let input:{grader?:unknown;certNumber?:unknown};
  try{input=await request.json()}catch{return json({ok:false,code:"INVALID_CERT",message:"The request body must be valid JSON."},400,origin)}
  const result=await routeLookup(input,{degree:lookupDegree,psa:(certNumber)=>lookupPsa(certNumber,Deno.env.get("PSA_API_TOKEN")),cgc:async()=>({ok:false,code:"LOOKUP_BLOCKED",message:"CGC’s public card lookup currently requires a browser security challenge, so this certification could not be checked automatically."})});
  return json(result,status(result),origin);
});
