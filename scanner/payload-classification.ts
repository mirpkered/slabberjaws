import { parseScanPayload, type ScanPayload } from './payload.ts';

export type PayloadClassification =
  | {kind:'certification'; payload:ScanPayload}
  | {kind:'grader-certification-url';payload:ScanPayload;suggestedGrader:'CSG'|'C3G';certUrl:string;gradeCandidate?:string}
  | {kind:'generic-grader-url'; payload:ScanPayload; suggestedGrader:'GMA'|'Integrity Grading'}
  | {kind:'unknown-url'; payload:ScanPayload}
  | {kind:'unrecognized'; payload:ScanPayload};

const genericDestinations:{host:string;path:string;grader:'GMA'|'Integrity Grading'}[]=[
  {host:'gmagrading.com',path:'/gma-free-card-price-guide',grader:'GMA'},
  {host:'igscards.com',path:'/',grader:'Integrity Grading'},
];
export function classifyScanPayload(rawPayload:string):PayloadClassification {
  const payload=parseScanPayload(rawPayload);
  try { const url=new URL(rawPayload.trim()); const host=url.hostname.toLowerCase().replace(/^www\./,''); const parts=url.pathname.split('/').filter(Boolean);
    if(host==='cgccards.com'){if(parts[0]?.toUpperCase()==='CERTLOOKUP'&&/^\d{5,20}$/.test(parts[1]??'')){const grade=/^(10|[1-9](?:_[05])?)$/.exec(parts[2]??'')?.[1]?.replace('_','.');return {kind:'grader-certification-url',payload:{rawPayload,certNumber:parts[1]},suggestedGrader:'CSG',certUrl:rawPayload, ...(grade?{gradeCandidate:grade}:{})};}return {kind:'unknown-url',payload};}
    if(host==='c3-grading.com'){if(/^Reports-\d+$/i.test(parts[0]??'')&&/^\d+$/.test(parts[1]??'')&&/^\d{5,20}$/.test(parts[2]??'')&&parts.length===3)return {kind:'grader-certification-url',payload:{rawPayload,certNumber:parts[2]},suggestedGrader:'C3G',certUrl:rawPayload};return {kind:'unknown-url',payload};}
    if(host.includes('cgccards')||host.includes('c3-grading'))return {kind:'unknown-url',payload};
    if(payload.certNumber)return {kind:'certification',payload};
    const path=url.pathname.replace(/\/+$/,'')||'/'; const match=genericDestinations.find(value=>value.host===host&&value.path===path); return match?{kind:'generic-grader-url',payload,suggestedGrader:match.grader}:{kind:'unknown-url',payload}; }
  catch { return {kind:'unrecognized',payload}; }
}
