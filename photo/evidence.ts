import type { NormalizedCard } from '../graders/model.ts';
import type { PhotoFields, PhotoFieldSources } from './extract.ts';

export type CardEvidenceSource='ocr'|'scan'|'lookup'|'manual';
export type CardEvidenceSources=Partial<Record<keyof NormalizedCard,CardEvidenceSource>>;
export type EvidenceConflict={field:keyof NormalizedCard;existing:string;incoming:string;existingSource:CardEvidenceSource;incomingSource:CardEvidenceSource};
export const emptyEvidenceSources=():CardEvidenceSources=>({});
const priority:Record<CardEvidenceSource,number>={ocr:1,scan:2,lookup:3,manual:4};
const evidenceFields:Array<keyof NormalizedCard>=['grader','certNumber','grade','year','brand','set','subject','cardNumber','variant','frontImageUrl','backImageUrl','certUrl'];

/** Transient, field-specific evidence merge. Manual corrections always win; better evidence may replace weaker evidence. */
export function mergeCardEvidence(current:NormalizedCard,sources:CardEvidenceSources,incoming:Partial<NormalizedCard>,incomingSources:Partial<Record<keyof NormalizedCard,CardEvidenceSource>>):{card:NormalizedCard;sources:CardEvidenceSources;conflicts:EvidenceConflict[]}{
 const card={...current},nextSources={...sources},conflicts:EvidenceConflict[]=[];
 for(const field of evidenceFields){
  const value=incoming[field];if(typeof value!=='string')continue;
  const oldValue=card[field];if(typeof oldValue!=='string')continue;
  const source=incomingSources[field];if(!source)continue;
  const oldSource=sources[field];
  if(!value.trim()){
   if(source==='manual'){(card as Record<keyof NormalizedCard,unknown>)[field]=value;nextSources[field]=source;}
   continue;
  }
  if(!oldValue||!oldSource||priority[source]>=priority[oldSource]){
   if(oldValue&&oldValue!==value&&oldSource&&source!=='manual'&&priority[source]!==priority[oldSource])conflicts.push({field,existing:oldValue,incoming:value,existingSource:oldSource,incomingSource:source});
   (card as Record<keyof NormalizedCard,unknown>)[field]=value;
   nextSources[field]=source;
  }else if(oldValue!==value){
   conflicts.push({field,existing:oldValue,incoming:value,existingSource:oldSource,incomingSource:source});
  }
 }
 return{card,sources:nextSources,conflicts};
}

export function sourceCard(card:NormalizedCard,source:CardEvidenceSource):CardEvidenceSources{
 return Object.fromEntries(evidenceFields.filter(field=>typeof card[field]==='string'&&String(card[field]).trim()).map(field=>[field,source])) as CardEvidenceSources;
}

export function photoEvidence(fields:PhotoFields,grader:NormalizedCard['grader'],fieldSources:PhotoFieldSources):{patch:Partial<NormalizedCard>;sources:CardEvidenceSources}{
 const sources:CardEvidenceSources={grader:'manual'};
 for(const [field,source] of Object.entries(fieldSources))if(source)sources[field as keyof NormalizedCard]=source;
 return{patch:{...fields,grader},sources};
}
