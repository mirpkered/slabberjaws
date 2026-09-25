export type SupportedGrader = 'Degree'|'PSA'|'CGC'|'PGS'|'Collect Direct'|'GMA'|'Integrity Grading'|'CSG'|'C3G'|'SGC'|'GAS';
export const graderRegistry:ReadonlyArray<{id:SupportedGrader;label:string;fullName?:string;generalVerificationUrl?:string}>= [
 {id:'Degree',label:'Degree'},{id:'PSA',label:'PSA'},{id:'CGC',label:'CGC'},{id:'PGS',label:'PGS'},{id:'Collect Direct',label:'Collect Direct'},
 {id:'GMA',label:'GMA'},{id:'Integrity Grading',label:'Integrity Grading'},
 {id:'CSG',label:'CSG',fullName:'Certified Sports Guaranty'}, {id:'C3G',label:'C3G',fullName:'C 3 Grading'},
 {id:'SGC',label:'SGC',generalVerificationUrl:'https://www.gosgc.com/cert-code-lookup'}, {id:'GAS',label:'GAS',fullName:'Global Authentication Services',generalVerificationUrl:'https://gasgrading.com'},
];
export const graders=graderRegistry.map(x=>x.id) as SupportedGrader[];
// Only graders with an implemented lookup adapter should invoke certificate lookup.
export const lookupEnabledGraders:ReadonlySet<SupportedGrader>=new Set(['Degree','PSA','CGC']);
export const hasAutomaticLookup=(grader:string)=>lookupEnabledGraders.has(grader as SupportedGrader);
export function generalVerificationUrl(grader:string){return graderRegistry.find(x=>x.id===grader)?.generalVerificationUrl??'';}
export function certificationLinkLabel(grader:string){return grader==='SGC'?'Open Certification Lookup':grader==='GAS'?'Visit Grader Website':grader==='CSG'||grader==='C3G'?'View Certification':'Open certification';}
