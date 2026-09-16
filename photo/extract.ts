export type PhotoFields={certNumber:string;grade:string;year:string;brand:string;set:string;subject:string;cardNumber:string;variant:string};
export type Candidate={field:keyof PhotoFields;value:string;reason:string};
export const emptyPhotoFields=():PhotoFields=>({certNumber:'',grade:'',year:'',brand:'',set:'',subject:'',cardNumber:'',variant:''});
const clean=(value:string)=>value.replace(/[|]/g,'I').replace(/\s+/g,' ').trim();
const labelled=(text:string,labels:string[])=>new RegExp(`(?:${labels.join('|')})\\s*[:#-]?\\s*([^\\n\\r]{1,80})`,'i').exec(text)?.[1]?.trim()??'';
const gradePattern='10(?:\\.0)?|9\\.5|9|8\\.5|8|7\\.5|7|6\\.5|6|5\\.5|5|4\\.5|4|3\\.5|3|2\\.5|2|1\\.5|1';
/** Explicit values prefill fields; plausible unlabelled label lines are offered for review. */
export function extractPhotoFields(...texts:string[]):{fields:PhotoFields;candidates:Candidate[]}{
 const text=texts.filter(Boolean).join('\n'),lines=texts.flatMap(t=>t.split(/\r?\n/).map(clean).filter(Boolean)),fields=emptyPhotoFields(),candidates:Candidate[]=[];
 const cert=labelled(text,['certification number','certificate number','cert(?:ification)?\\s*(?:no|number|#)','serial\\s*(?:no|number|#)']).match(/^[A-Za-z0-9][A-Za-z0-9 -]{2,40}/)?.[0]?.trim();if(cert)fields.certNumber=cert;
 const gradeText=labelled(text,['final grade','overall grade','grade'])||new RegExp(`\\b(?:gem\\s*mint|mint|near\\s*mint|nm-?mt|excellent|good)\\s*(${gradePattern})\\b`,'i').exec(text)?.[1]||'';const grade=new RegExp(`^(${gradePattern})\\b`).exec(gradeText)?.[1];if(grade)fields.grade=grade;
 const year=labelled(text,['release year','year']).match(/^(?:19|20)\d{2}\b/)?.[0];if(year)fields.year=year;
 fields.brand=labelled(text,['brand','manufacturer']);fields.set=labelled(text,['set']);fields.subject=labelled(text,['player','subject','card name']);fields.cardNumber=/\b(?:card\s*(?:number|no\.?|#)|number)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9#/-]{0,30})/i.exec(text)?.[1]??'';fields.variant=labelled(text,['variant','parallel']);
 for(const line of lines){if(!fields.year&&/^(?:19|20)\d{2}\s+[A-Z][A-Z0-9 .'-]{2,}$/i.test(line)&&!/copyright|©/i.test(line)){const [value,...rest]=line.split(' ');candidates.push({field:'year',value,reason:'Possible release year from label line'});if(rest.length)candidates.push({field:'set',value:rest.join(' '),reason:'Possible set from label line'});}if(!fields.subject&&/^[A-Z][A-Z .'-]{3,}$/i.test(line)&&!/^(GRADE|CERT|CARD|POP|SUBGRADES?|CENTERING|CORNERS|EDGES|SURFACE)$/i.test(line))candidates.push({field:'subject',value:line,reason:'Possible card name from label text'});}
 return{fields,candidates:candidates.filter((c,i,self)=>self.findIndex(x=>x.field===c.field&&x.value===c.value)===i)};
}
export function mergeOcrFields(current:PhotoFields,next:PhotoFields,edited:Set<keyof PhotoFields>){const merged={...current};for(const key of Object.keys(next)as(keyof PhotoFields)[])if(!edited.has(key)&&next[key])merged[key]=next[key];return merged;}
