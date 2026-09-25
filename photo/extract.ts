export type PhotoFields={certNumber:string;grade:string;year:string;brand:string;set:string;subject:string;cardNumber:string;variant:string};
export type Candidate={field:keyof PhotoFields;value:string;reason:string};
export const emptyPhotoFields=():PhotoFields=>({certNumber:'',grade:'',year:'',brand:'',set:'',subject:'',cardNumber:'',variant:''});
const clean=(value:string)=>value.replace(/[|]/g,'I').replace(/\s+/g,' ').trim();
const gradePattern='10(?:\\.0)?|9\\.5|9|8\\.5|8|7\\.5|7|6\\.5|6|5\\.5|5|4\\.5|4|3\\.5|3|2\\.5|2|1\\.5|1';
const brandNames=['Topps','Panini','Bowman','Donruss','Upper Deck','Fleer','Leaf','Pokémon','Pokemon','Wizards of the Coast'];
const unique=(values:Candidate[])=>values.filter((candidate,index,list)=>list.findIndex(value=>value.field===candidate.field&&value.value.toLowerCase()===candidate.value.toLowerCase())===index);
function labelled(text:string,labels:string[]){
 const linePattern=new RegExp(`^\\s*(?:${labels.join('|')})\\s*[:#-]?\\s*(.*?)\\s*$`,'i');
 const lines=text.split(/\r?\n/).map(clean);
 for(let index=0;index<lines.length;index++){
  const match=linePattern.exec(lines[index]);if(!match)continue;
  const inline=match[1].replace(/^[:#-]+\s*/,'').trim();
  if(inline)return inline;
  const next=lines[index+1]??'';if(next&&!/^[A-Z][A-Z\s#-]{2,}$/.test(next))return next;
 }
 return '';
}
function explicitCardName(text:string){
 const value=labelled(text,['player','subject','card name']);
 return /^[\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*){1,3}$/u.test(value)?value:'';
}
/**
 * Extract only explicit label values into fields. Unlabelled OCR is surfaced as
 * editable candidates, never treated as verified card facts. Certs stay strings.
 */
export function extractPhotoFields(...texts:string[]):{fields:PhotoFields;candidates:Candidate[]}{
 const text=texts.filter(Boolean).join('\n'),lines=texts.flatMap(value=>value.split(/\r?\n/).map(clean).filter(Boolean)),fields=emptyPhotoFields(),candidates:Candidate[]=[];
 const cert=labelled(text,['certification number','certificate number','cert(?:ification)?\\s*(?:no|number|#)','serial\\s*(?:no|number|#)']).match(/^[A-Za-z0-9][A-Za-z0-9 -]{2,40}/)?.[0]?.trim();
 if(cert)fields.certNumber=cert;
 const gradeText=labelled(text,['final grade','overall grade','grade']);
 const grade=new RegExp(`^(${gradePattern})\\b`).exec(gradeText)?.[1]??new RegExp(`\\b(?:gem\\s*mint|mint|near\\s*mint|nm-?mt|excellent|good)\\s*(${gradePattern})\\b`,'i').exec(text)?.[1]??'';
 if(grade)fields.grade=grade;
 const year=labelled(text,['release year','year']).match(/^(?:19|20)\d{2}\b/)?.[0];if(year)fields.year=year;
 fields.brand=labelled(text,['brand','manufacturer']);fields.set=labelled(text,['set']);fields.subject=explicitCardName(text);
 fields.cardNumber=/\b(?:card\s*(?:number|no\.?|#)|number)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9#/-]{0,30})/i.exec(text)?.[1]??'';
 fields.variant=labelled(text,['variant','parallel']);

 const knownBrandPattern=new RegExp(`\\b(${brandNames.join('|')})\\b`,'i');
 for(const line of lines){
  if(!fields.year){
   const exact=/\b((?:19|20)\d{2})\b\s+(.+)/i.exec(line);
   if(exact&&!/copyright|©/i.test(line)){candidates.push({field:'year',value:exact[1],reason:'Possible year from printed card-label text'});}
   const damaged=/^[^\w\d]*[\/|Il]([0-9]{3})\s+(.+)/.exec(line);
   if(damaged&&knownBrandPattern.test(damaged[2]))candidates.push({field:'year',value:`2${damaged[1]}`,reason:'Possible year; the first printed character was unclear in OCR. Review before using.'});
  }
  const brand=knownBrandPattern.exec(line)?.[1];if(brand&&!fields.brand)candidates.push({field:'brand',value:brandNames.find(name=>name.toLowerCase()===brand.toLowerCase())??brand,reason:'Possible card manufacturer printed on the label'});
  const cardNumber=/(?:^|\s)#\s*([A-Za-z0-9][A-Za-z0-9-]{0,11})(?:\s|$)/.exec(line);
  if(cardNumber&&!fields.cardNumber)candidates.push({field:'cardNumber',value:cardNumber[1],reason:'Possible card number; confirm against the printed label'});
  if(!fields.subject&&line.length>=5&&line.length<=48&&!/\d{5}/.test(line)&&!/(?:cert|grade|pop|card|surface|corner|edge|center|csg|psa|sgc|gas|slab)/i.test(line)){
   if(/^[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?\s+[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?$/.test(line))candidates.push({field:'subject',value:line,reason:'Possible subject/player name from label text'});
   else if(/^[A-Z][A-Z.'-]{5,}$/.test(line))candidates.push({field:'subject',value:line,reason:'Possible single-word card subject; confirm before using'});
  }
  const certDigits=/^\s*(\d{8,20})\s*$/.exec(line);if(certDigits&&!fields.certNumber)candidates.push({field:'certNumber',value:certDigits[1],reason:'Possible certification number; confirm it matches the slab label'});
  const labeledGrade=new RegExp(`(?:NM\\s*[/ -]?\\s*MT|MINT|GRADE|CSG)[^\\d]{0,20}(${gradePattern})\\b`,'i').exec(line)?.[1];
  if(labeledGrade&&!fields.grade)candidates.push({field:'grade',value:labeledGrade,reason:'Possible grading-label score; confirm against the slab'});
  const standaloneGrade=new RegExp(`^(${gradePattern})$`).exec(line);
  if(standaloneGrade&&!fields.grade&&/\b(?:CSG|CGC|PSA|SGC|GMA|GAS|GRADE|GEM MINT|NM\s*[/ -]?\s*MT)\b/i.test(text))candidates.push({field:'grade',value:standaloneGrade[1],reason:'Possible standalone slab grade in grading-label text; confirm against the printed label'});
 }
 return{fields,candidates:unique(candidates)};
}
/** Only field-fill from individually strong image regions; weak OCR remains review-only candidate/raw text. */
export function fieldsFromConfidentRegions(regions:{text:string;confidence:number}[],threshold=55):PhotoFields{
 return extractPhotoFields(...regions.filter(region=>region.text.trim()&&region.confidence>=threshold).map(region=>region.text)).fields;
}
export function mergeOcrFields(current:PhotoFields,next:PhotoFields,edited:Set<keyof PhotoFields>){const merged={...current};for(const key of Object.keys(next)as(keyof PhotoFields)[])if(!edited.has(key)&&next[key])merged[key]=next[key];return merged;}
