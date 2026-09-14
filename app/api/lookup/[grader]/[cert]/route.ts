import { lookupDegree } from "../../../../../graders/degree";
import { lookupPsa } from "../../../../../graders/psa";
import { adapters } from "../../../../../graders/adapters";

export async function GET(_request:Request,{params}:{params:Promise<{grader:string;cert:string}>}){
  const {grader,cert}=await params; const decoded=decodeURIComponent(grader); const number=decodeURIComponent(cert).trim();
  const result=decoded==="Degree"?await lookupDegree(number):decoded==="PSA"?await lookupPsa(number,process.env.PSA_API_TOKEN):await (adapters as Record<string,{lookup:(cert:string)=>Promise<unknown>}>)[decoded]?.lookup(number)??{ok:false,code:"UNSUPPORTED_GRADER",message:"This grader is not supported."};
  return Response.json(result,{status:(result as {ok?:boolean}).ok?200:422,headers:{"cache-control":"no-store"}});
}
