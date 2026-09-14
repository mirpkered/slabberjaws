import type { NormalizedCard } from "../graders/model.ts";
import type { LookupResult } from "../graders/types.ts";

export type LookupDependencies={
  degree(certNumber:string):Promise<LookupResult<NormalizedCard>>;
  psa(certNumber:string):Promise<LookupResult<NormalizedCard>>;
};

export async function routeLookup(input:unknown,dependencies:LookupDependencies):Promise<LookupResult<NormalizedCard>>{
  if(typeof input!=="object"||input===null)return{ok:false,code:"INVALID_CERT",message:"The request body must be a JSON object."};
  const value=input as {grader?:unknown;certNumber?:unknown};
  const grader=String(value.grader??"").trim().toLowerCase();
  const certNumber=String(value.certNumber??"").trim();
  if(grader==="degree")return dependencies.degree(certNumber);
  if(grader==="psa")return dependencies.psa(certNumber);
  return{ok:false,code:"UNSUPPORTED_GRADER",message:"Automatic lookup is not supported for this grader."};
}
