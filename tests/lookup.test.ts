import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { lookupDegree } from "../graders/degree.ts";
import { lookupPsa, parsePsaResponse } from "../graders/psa.ts";
import { routeLookup } from "../lookup/router.ts";
import { createManualCard } from "../lookup/manual.ts";

const degreeFixture=`<script type="application/ld+json">{"@type":"Product","image":"https://degreegrading.com/cards/00409451.png","brand":{"name":"Topps"},"about":{"name":"Joe Oliver"},"additionalProperty":[{"name":"Grade","value":"DEGREE 9"},{"name":"Surface","value":"2"},{"name":"Corners/Edges","value":"3"},{"name":"Centering","value":"3"},{"name":"Creases/Dents","value":"1"},{"name":"Card Number","value":"#14"}]}</script><span class="slab-grade">9</span><span class="hero-year">1993 Topps</span><p class="hero-set">Series One - Black Gold</p><span class="tier rar-uncommon">Uncommon<span></span></span><p>The only copy to earn a grade out of <b>1</b> we&rsquo;ve graded, across the entire <b>19</b>-card population.</p>`;

test("Degree lookup forwards the session cookie before parsing",async()=>{
  const originalFetch=globalThis.fetch;let cookie="";
  globalThis.fetch=async(_input,init)=>{if(init?.method==="POST")return new Response(JSON.stringify({success:true,data:{exists:true,slug:"00409451"}}),{status:200,headers:{"content-type":"application/json","set-cookie":"PHPSESSID=test-session; Path=/; HttpOnly"}});cookie=new Headers(init?.headers).get("cookie")??"";return new Response(degreeFixture,{status:200})};
  try{const result=await lookupDegree("00409451");assert.equal(result.ok,true);assert.equal(cookie,"PHPSESSID=test-session");if(result.ok)assert.equal(result.card.subject,"Joe Oliver")}finally{globalThis.fetch=originalFetch}
});

test("PSA adapter is credential-gated and normalizes documented fields",async()=>{
  const missing=await lookupPsa("94877724");assert.deepEqual(missing,{ok:false,code:"AUTH_REQUIRED",message:"PSA lookup requires a server-side API token."});
  const card=parsePsaResponse({IsValidRequest:true,ServerMessage:"Request successful",PSACert:{CertNumber:"94877724",Year:"2023",Brand:"Topps",Category:"Baseball Cards",CardNumber:"1",Subject:"Fixture subject",Variety:"Refractor",CardGrade:"10",GradeDescription:"GEM MINT 10",TotalPopulation:7,PopulationHigher:0}},"94877724");
  assert.equal(card.grade,"10");assert.equal(card.population,7);assert.equal(card.set,"");assert.equal(card.graderSpecific.category,"Baseball Cards");
});

test("lookup router returns normalized failures and success payloads",async()=>{
  const dependencies={degree:async()=>({ok:false,code:"CERT_NOT_FOUND",message:"Missing"} as const),psa:async()=>({ok:true,card:createManualCard("PSA","94877724")} as const)};
  assert.equal((await routeLookup({grader:"degree",certNumber:"00409451"},dependencies)).ok,false);
  const success=await routeLookup({grader:"psa",certNumber:"94877724"},dependencies);assert.equal(success.ok,true);
  const unsupported=await routeLookup({grader:"cgc",certNumber:"6126303210"},dependencies);assert.deepEqual(unsupported,{ok:false,code:"UNSUPPORTED_GRADER",message:"Automatic lookup is not supported for this grader."});
});

test("manual fallback preserves grader and certification number",()=>{
  const card=createManualCard("Degree"," 00409452 ");assert.equal(card.grader,"Degree");assert.equal(card.certNumber,"00409452");assert.equal(card.manual,true);
});

test("charcoal theme exposes accessible shark-blue shared tokens",async()=>{
  const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
  for(const token of ["--bg: #17191c","--surface: #22252a","--surface-raised: #2a2e34","--border: #3a3f46","--text: #f2f0e9","--text-muted: #a8adb4","--accent: #28a8e8","--accent-highlight: #39c5ff","--accent-deep: #1677b8","focus-visible"])assert.ok(css.includes(token),token);
});
