import type { NormalizedCard } from "../graders/model.ts";

export function createManualCard(grader:NormalizedCard["grader"],certNumber:string):NormalizedCard{
  return{id:crypto.randomUUID(),grader,certNumber:certNumber.trim(),grade:"",year:"",brand:"",set:"",subject:"",cardNumber:"",variant:"",frontImageUrl:"",backImageUrl:"",certUrl:"",population:null,graderSpecific:{},addedAt:new Date().toISOString(),manual:true};
}
