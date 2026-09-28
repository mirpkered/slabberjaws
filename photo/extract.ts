export type PhotoFields={certNumber:string;grade:string;year:string;brand:string;set:string;subject:string;cardNumber:string;variant:string};
export type Candidate={field:keyof PhotoFields;value:string;reason:string;autoFill?:boolean};
export type PhotoFieldSource='ocr'|'manual';
export type PhotoFieldSources=Partial<Record<keyof PhotoFields,PhotoFieldSource>>;
export const emptyPhotoFields=():PhotoFields=>({certNumber:'',grade:'',year:'',brand:'',set:'',subject:'',cardNumber:'',variant:''});
const clean=(value:string)=>value.replace(/[|]/g,'I').replace(/\s+/g,' ').trim();
const gradePattern='10(?:\\.0)?|9\\.5|9|8\\.5|8|7\\.5|7|6\\.5|6|5\\.5|5|4\\.5|4|3\\.5|3|2\\.5|2|1\\.5|1';
const brandNames=['Topps','Panini','Bowman','Donruss','Upper Deck','Fleer','Leaf','Pokémon','Pokemon','Wizards of the Coast'];
const normalized=(value:string)=>value.toLowerCase().replace(/^#/,'').replace(/[\s#]+/g,'');
const unique=(values:Candidate[])=>values.filter((candidate,index,list)=>list.findIndex(value=>value.field===candidate.field&&normalized(value.value)===normalized(candidate.value))===index);
const plausibleCardNumber=(value:string)=>value.length>0&&!/^[a-z]$/i.test(value)&&/^[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*$/.test(value);
const plausibleName=(value:string)=>value.length>=4&&value.length<=64&&(/^[\p{L}][\p{L}.'’-]*(?:\s+[\p{L}][\p{L}.'’-]*){1,5}$/u.test(value)||/^[A-Z][A-Z.'’-]{1,}(?:\s+[A-Z][A-Z.'’-]{1,}){1,5}$/.test(value))&&!/(?:cert|grade|pop|card|surface|corner|edge|center|csg|psa|sgc|gas|slab)/i.test(value);
const plausibleSubjectLine=(value:string)=>plausibleName(value)||(/^[A-Z][A-Z.'’-]{5,}$/.test(value)&&!/(?:CERT|GRADE|SURFACE|CORNER|CENTER|SLAB)/.test(value));
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
 return plausibleName(value)?value:'';
}
/** Parse OCR text only. Values remain suggestions unless independently strong. */
export function extractPhotoFields(...texts:string[]):{fields:PhotoFields;candidates:Candidate[]}{
 const text=texts.filter(Boolean).join('\n'),lineEntries=texts.flatMap(value=>{const lines=value.split(/\r?\n/).map(clean).filter(Boolean);return lines.map((line,index)=>({line,nearbyLabel:lines.slice(Math.max(0,index-3),Math.min(lines.length,index+4)).join(' ')}));}),fields=emptyPhotoFields(),candidates:Candidate[]=[];
 const cert=labelled(text,['certification number','certificate number','cert(?:ification)?\\s*(?:no|number|#)','serial\\s*(?:no|number|#)']).match(/^[A-Za-z0-9][A-Za-z0-9 -]{2,40}/)?.[0]?.trim();
 if(cert)fields.certNumber=cert;
 const gradeText=labelled(text,['final grade','overall grade','grade']);
 const grade=new RegExp(`^(${gradePattern})\\b`).exec(gradeText)?.[1]??new RegExp(`\\b(?:gem\\s*mint|mint|near\\s*mint|nm-?mt|excellent|good)\\s*(${gradePattern})\\b`,'i').exec(text)?.[1]??'';
 if(grade)fields.grade=grade;
 const year=labelled(text,['release year','year']).match(/^(?:19|20)\d{2}\b/)?.[0];if(year)fields.year=year;
 fields.brand=labelled(text,['brand','manufacturer']);fields.set=labelled(text,['set']);fields.subject=explicitCardName(text);
 const explicitCard=/(?:card\s*(?:number|no\.?|#)|number)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9#/-]{0,30})/i.exec(text)?.[1]??'';
 if(plausibleCardNumber(explicitCard))fields.cardNumber=explicitCard;
 fields.variant=labelled(text,['variant','parallel']);

 const knownBrandPattern=new RegExp(`\\b(${brandNames.join('|')})\\b`,'i');
 for(const entry of lineEntries){
  const {line,nearbyLabel}=entry;
  const yearLine=/\b((?:19|20)\d{2})\b\s+(.+)/i.exec(line);
  if(yearLine&&!/copyright|©/i.test(line)){
   const brand=knownBrandPattern.exec(yearLine[2])?.[1];
   candidates.push({field:'year',value:yearLine[1],reason:brand?'Year printed beside a recognized card brand':'Possible year from printed label text',...(brand?{autoFill:true}:{})});
   if(brand)candidates.push({field:'brand',value:brandNames.find(name=>name.toLowerCase()===brand.toLowerCase())??brand,reason:'Recognized brand on the same line as the card year',autoFill:true});
  }else if(!/copyright|©/i.test(line)){
   const damaged=/^[^\w\d]*[\/|Il](\d{3})\s+(.+)/.exec(line);
   const damagedBrand=damaged&&knownBrandPattern.exec(damaged[2])?.[1];
   if(damaged&&damagedBrand)candidates.push({field:'year',value:`2${damaged[1]}`,reason:'Possible year; first character is unclear in OCR. Review before using.'});
  }
  const brand=knownBrandPattern.exec(line)?.[1];if(brand&&!fields.brand)candidates.push({field:'brand',value:brandNames.find(name=>name.toLowerCase()===brand.toLowerCase())??brand,reason:'Possible card manufacturer printed on the label'});

  // Common label layout: #285 Dylan Carlson. The hash gives strong card-number context;
  // preserve the remaining printed words as an editable subject candidate.
  const numberAndName=/^\s*#\s*([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\s+(.+?)\s*$/.exec(line);
  if(numberAndName&&plausibleCardNumber(numberAndName[1])){
   candidates.push({field:'cardNumber',value:numberAndName[1],reason:'Card number is explicitly prefixed with # on a label line',autoFill:true});
   if(plausibleName(numberAndName[2]))candidates.push({field:'subject',value:numberAndName[2],reason:'Name follows the # card number on the same label line',autoFill:true});
  }else{
   const cardNumber=/(?:^|\s)#\s*([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)(?=\s|$)/.exec(line)?.[1];
   if(cardNumber&&plausibleCardNumber(cardNumber))candidates.push({field:'cardNumber',value:cardNumber,reason:'Possible card number; confirm against the printed label'});
  }

  if(!fields.subject&&!numberAndName&&plausibleSubjectLine(line))candidates.push({field:'subject',value:line,reason:'Possible subject/player name from label text'});
  const certDigits=/^\s*(\d{8,20})\s*$/.exec(line);if(certDigits&&!fields.certNumber)candidates.push({field:'certNumber',value:certDigits[1],reason:'Possible certification number; confirm it matches the slab label'});
  const labeledGrade=new RegExp(`(?:NM\\s*[/ -]?\\s*MT|MINT|GRADE|CSG)[^\\d]{0,20}(${gradePattern})\\b`,'i').exec(line)?.[1];
  if(labeledGrade&&!fields.grade)candidates.push({field:'grade',value:labeledGrade,reason:'Possible grading-label score; confirm against the slab'});
  const standaloneGrade=new RegExp(`^(${gradePattern})$`).exec(line);
  if(standaloneGrade&&!fields.grade&&(/\b(?:CSG|CGC|PSA|SGC|GMA|GAS|CERTIFIED|GRADE|GRADER|GEM MINT|NM\s*[/ -]?\s*MT)\b/i.test(nearbyLabel)||standaloneGrade[1].includes('.')))candidates.push({field:'grade',value:standaloneGrade[1],reason:'Possible standalone slab grade; OCR may miss small decimal marks, so review it'});
 }
 for(const field of Object.keys(fields) as (keyof PhotoFields)[])if(fields[field])candidates.push({field,value:fields[field],reason:'OCR read this explicitly labelled value; confirm it against the slab'});
 return{fields,candidates:unique(candidates)};
}
/** Auto-fill only strong structure from a readable label crop; weak OCR remains review-only. */
export function autoFillPhotoCandidates(candidates:Candidate[],confidence:number,hasLabelCrop:boolean):{fields:PhotoFields;used:Candidate[]}{
 const fields=emptyPhotoFields(),minimum=hasLabelCrop?68:82;
 if(confidence<minimum)return{fields,used:[]};
 const used=candidates.filter(candidate=>candidate.autoFill);
 for(const candidate of used)if(!fields[candidate.field])fields[candidate.field]=candidate.value;
 return{fields,used};
}
/** Only explicit values from individually strong regions can directly fill fields. */
export function fieldsFromConfidentRegions(regions:{text:string;confidence:number}[],threshold=55):PhotoFields{
 return extractPhotoFields(...regions.filter(region=>region.text.trim()&&region.confidence>=threshold).map(region=>region.text)).fields;
}
export function mergeOcrFields(current:PhotoFields,next:PhotoFields,protectedFields:Set<keyof PhotoFields>){const merged={...current};for(const key of Object.keys(next)as(keyof PhotoFields)[])if(!protectedFields.has(key)&&!merged[key]&&next[key])merged[key]=next[key];return merged;}
