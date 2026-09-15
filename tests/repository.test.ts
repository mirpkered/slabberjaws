import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedCard } from "../graders/model.ts";
import { LocalStorageCollectionRepository, CURRENT_STORAGE_KEY, LEGACY_STORAGE_KEY, type StorageLike } from "../collection/local-storage-repository.ts";
import { DuplicateCardError, type CollectionRepository } from "../collection/repository.ts";
import { cardFromRow, cardToRow, SupabaseCollectionRepository } from "../collection/supabase-repository.ts";
import { importLocalCards } from "../collection/import-local.ts";
import { selectRepository } from "../collection/factory.ts";

class MemoryStorage implements StorageLike {
  values = new Map<string,string>();
  getItem(key:string){return this.values.get(key)??null}
  setItem(key:string,value:string){this.values.set(key,value)}
}

const card = (overrides:Partial<NormalizedCard>={}):NormalizedCard => ({
  id:"3f7269fc-f95e-42e0-b1c3-bf03e16bf2c0",grader:"PSA",certNumber:"94877724",grade:"10",
  year:"2023",brand:"Topps",set:"Chrome",subject:"Collection preview",cardNumber:"#1",
  variant:"Refractor",frontImageUrl:"https://example.com/front.jpg",backImageUrl:"",certUrl:"",
  population:1,graderSpecific:{label:"Gem Mint"},addedAt:"2026-09-14T00:00:00.000Z",manual:true,...overrides,
});

test("local repository preserves the legacy storage migration",async()=>{
  const storage=new MemoryStorage();storage.setItem(LEGACY_STORAGE_KEY,JSON.stringify([card()]));
  const repository=new LocalStorageCollectionRepository(storage);
  assert.equal((await repository.getCards()).length,1);
  assert.ok(storage.getItem(CURRENT_STORAGE_KEY));
  await repository.addCard(card({id:"6d3c2a44-c2b2-43c5-b7f9-98535effb76a",grader:"CGC",certNumber:"6126303210"}));
  assert.ok(storage.getItem(CURRENT_STORAGE_KEY));
  assert.ok(storage.getItem(LEGACY_STORAGE_KEY));
});

test("local repository supports CRUD and normalized duplicate detection",async()=>{
  const repository=new LocalStorageCollectionRepository(new MemoryStorage());
  const original=card();await repository.addCard(original);
  assert.equal(await repository.hasCard("psa","94 877 724"),true);
  await assert.rejects(()=>repository.addCard(card({id:crypto.randomUUID(),certNumber:"94 877 724"})),DuplicateCardError);
  await repository.updateCard({...original,subject:"Updated"});
  assert.equal((await repository.getCard(original.id))?.subject,"Updated");
  await repository.deleteCard(original.id);assert.equal((await repository.getCards()).length,0);
});

test("cloud rows round-trip through the normalized card model",()=>{
  const row=cardToRow(card({certNumber:"94 877 724"}),"user-1");
  assert.equal(row.cert_number,"94877724");
  assert.deepEqual(cardFromRow(row),card());
});

test("local import skips duplicates and reports invalid writes",async()=>{
  const destination=new LocalStorageCollectionRepository(new MemoryStorage());
  await destination.addCard(card());
  const broken:CollectionRepository={getCards:()=>destination.getCards(),getCard:(id)=>destination.getCard(id),hasCard:async()=>false,addCard:async()=>{throw new Error("offline")},updateCard:(value)=>destination.updateCard(value),deleteCard:(id)=>destination.deleteCard(id)};
  const duplicateResult=await importLocalCards([card(),card({id:"bad",grader:"CGC",certNumber:"6126303210"})],destination);
  assert.deepEqual(duplicateResult,{imported:1,duplicates:1,failed:0});
  const failedResult=await importLocalCards([card({grader:"Degree",certNumber:"00409451"})],broken);
  assert.equal(failedResult.failed,1);
  const invalidResult=await importLocalCards([{grader:"PSA",certNumber:""}],destination);
  assert.equal(invalidResult.failed,1);
});

test("repository selection follows authentication state",()=>{
  const storage=new MemoryStorage();
  assert.ok(selectRepository({storage}) instanceof LocalStorageCollectionRepository);
  const fakeClient={} as SupabaseClient;
  assert.ok(selectRepository({storage,client:fakeClient,userId:"user-1"}) instanceof SupabaseCollectionRepository);
});

test("new grader names persist and retain separate duplicate identities",async()=>{
  const repository=new LocalStorageCollectionRepository(new MemoryStorage());
  await repository.addCard(card({grader:"GMA",certNumber:"12345"}));
  await repository.addCard(card({id:crypto.randomUUID(),grader:"Integrity Grading",certNumber:"12345"}));
  assert.equal(await repository.hasCard("GMA","12345"),true);
  assert.deepEqual((await repository.getCards()).map(value=>value.grader).sort(),["GMA","Integrity Grading"]);
});
