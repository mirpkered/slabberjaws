import { lookupDegree } from "../../../../../graders/degree";
import { adapters } from "../../../../../graders/adapters";

export async function GET(_request:Request,{params}:{params:Promise<{grader:string;cert:string}>}){
  const {grader,cert}=await params; const decoded=decodeURIComponent(grader); const number=decodeURIComponent(cert).trim();
  const result=decoded==="Degree"?await lookupDegree(number):await (adapters as Record<string,{lookup:(cert:string)=>Promise<unknown>}>)[decoded]?.lookup(number)??{ok:false,code:"unsupported",message:"This grader is not supported."};
  return Response.json(result,{status:(result as {ok?:boolean}).ok?200:422,headers:{"cache-control":"no-store"}});
}
