import type { NormalizedCard } from "./model.ts";
import type { LookupResult } from "./types.ts";

type PsaCert = {CertNumber?:string;SpecID?:number;SpecNumber?:string;LabelType?:string;ReverseBarCode?:boolean;Year?:string;Brand?:string;Category?:string;CardNumber?:string;Subject?:string;Variety?:string;IsPSADNA?:boolean;IsDualCert?:boolean;GradeDescription?:string;CardGrade?:string;PrimarySigners?:string[];OtherSigners?:string[];AutographGrade?:string;TotalPopulation?:number;TotalPopulationWithQualifier?:number;PopulationHigher?:number;T206PopulationAllBacks?:number;T206PopulationHigherAllBacks?:number;ItemStatus?:string};
export type PsaResponse = {IsValidRequest?:boolean;ServerMessage?:string;PSACert?:PsaCert};

export function parsePsaResponse(value:PsaResponse,certNumber:string):NormalizedCard{
  const cert=value.PSACert;
  if(!value.IsValidRequest||!cert)throw new Error(value.ServerMessage||"No PSA certification data was returned.");
  return {id:crypto.randomUUID(),grader:"PSA",certNumber:cert.CertNumber||certNumber,grade:cert.CardGrade||cert.GradeDescription||"",year:cert.Year||"",brand:cert.Brand||"",set:"",subject:cert.Subject||"",cardNumber:cert.CardNumber||"",variant:cert.Variety||"",frontImageUrl:"",backImageUrl:"",certUrl:`https://www.psacard.com/cert/${certNumber}`,population:typeof cert.TotalPopulation==="number"?cert.TotalPopulation:null,graderSpecific:{specId:cert.SpecID??null,specNumber:cert.SpecNumber??null,labelType:cert.LabelType??null,category:cert.Category??null,gradeDescription:cert.GradeDescription??null,populationHigher:cert.PopulationHigher??null,totalPopulationWithQualifier:cert.TotalPopulationWithQualifier??null,isPsaDna:cert.IsPSADNA??false,isDualCert:cert.IsDualCert??false,autographGrade:cert.AutographGrade??null,primarySigners:cert.PrimarySigners??[],otherSigners:cert.OtherSigners??[],itemStatus:cert.ItemStatus??null},addedAt:new Date().toISOString()};
}

export async function lookupPsa(cert:string,token?:string):Promise<LookupResult<NormalizedCard>>{
  if(!/^\d{8,10}$/.test(cert))return{ok:false,code:"INVALID_CERT",message:"PSA certification numbers contain 8 to 10 digits."};
  if(!token)return{ok:false,code:"AUTH_REQUIRED",message:"PSA lookup requires a server-side API token."};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${cert}`,{headers:{authorization:`bearer ${token}`,accept:"application/json"},signal:controller.signal});
    if(response.status===401||response.status===403||response.status===500)return{ok:false,code:"AUTH_REQUIRED",message:"PSA rejected the configured API credential."};
    if(!response.ok)return{ok:false,code:"GRADER_UNAVAILABLE",message:"PSA’s certification service is unavailable."};
    const data=await response.json() as PsaResponse;
    if(data.IsValidRequest===false)return{ok:false,code:"INVALID_CERT",message:data.ServerMessage||"PSA rejected this certification number."};
    if(!data.PSACert)return{ok:false,code:"CERT_NOT_FOUND",message:data.ServerMessage||"PSA could not find this certification."};
    try{return{ok:true,card:parsePsaResponse(data,cert)}}catch{return{ok:false,code:"PARSE_FAILED",message:"PSA returned an unexpected certification response."}}
  }catch(error){return{ok:false,code:error instanceof Error&&error.name==="AbortError"?"TIMEOUT":"GRADER_UNAVAILABLE",message:error instanceof Error&&error.name==="AbortError"?"PSA lookup timed out.":"PSA lookup could not be reached."}}finally{clearTimeout(timer)}
}
