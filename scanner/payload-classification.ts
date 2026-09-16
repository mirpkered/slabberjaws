import { parseScanPayload, type ScanPayload } from './payload.ts';

export type PayloadClassification =
  | {kind:'certification'; payload:ScanPayload}
  | {kind:'generic-grader-url'; payload:ScanPayload; suggestedGrader:'GMA'|'Integrity Grading'}
  | {kind:'unknown-url'; payload:ScanPayload}
  | {kind:'unrecognized'; payload:ScanPayload};

const genericDestinations:{host:string;path:string;grader:'GMA'|'Integrity Grading'}[]=[
  {host:'gmagrading.com',path:'/gma-free-card-price-guide',grader:'GMA'},
  {host:'igscards.com',path:'/',grader:'Integrity Grading'},
];
export function classifyScanPayload(rawPayload:string):PayloadClassification {
  const payload=parseScanPayload(rawPayload);
  if(payload.certNumber)return {kind:'certification',payload};
  try { const url=new URL(rawPayload.trim()); const host=url.hostname.toLowerCase().replace(/^www\./,''); const path=url.pathname.replace(/\/+$/,'')||'/'; const match=genericDestinations.find(value=>value.host===host&&value.path===path); return match?{kind:'generic-grader-url',payload,suggestedGrader:match.grader}:{kind:'unknown-url',payload}; }
  catch { return {kind:'unrecognized',payload}; }
}
