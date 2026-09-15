import type { NormalizedCard } from "../graders/model.ts";
import type { LookupResult } from "../graders/types.ts";

export type LookupDependencies={
  degree(certNumber:string):Promise<LookupResult<NormalizedCard>>;
  psa(certNumber:string):Promise<LookupResult<NormalizedCard>>;
  cgc?(certNumber:string):Promise<LookupResult<NormalizedCard>>;
};

export async function routeLookup(input:unknown,dependencies:LookupDependencies):Promise<LookupResult<NormalizedCard>>{
  if(typeof input!=="object"||input===null)return{ok:false,code:"INVALID_CERT",message:"The request body must be a JSON object."};
  const value=input as {grader?:unknown;certNumber?:unknown};
  const grader=String(value.grader??"").trim().toLowerCase();
  const certNumber=String(value.certNumber??"").trim();
  if(grader==="degree")return dependencies.degree(certNumber);
  if(grader==="psa")return dependencies.psa(certNumber);
  if(grader==="cgc")return dependencies.cgc?dependencies.cgc(certNumber):{ok:false,code:"LOOKUP_BLOCKED",message:"CGC’s public card lookup currently requires a browser security challenge, so this certification could not be checked automatically."};
  if(grader==="gma")return{ok:false,code:"UNSUPPORTED_GRADER",message:"GMA does not publish a public certification lookup. Enter this slab manually."};
  if(grader==="integrity grading")return{ok:false,code:"UNSUPPORTED_GRADER",message:"Integrity Grading automatic lookup is not yet supported. Enter this slab manually."};
  return{ok:false,code:"UNSUPPORTED_GRADER",message:"Automatic lookup is not supported for this grader."};
}
