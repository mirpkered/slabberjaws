import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {graders} from '../graders/registry.ts';
test('fresh Supabase schema and migration use the central eleven-grader allowlist',async()=>{
 const [schema,migration]=await Promise.all(['../supabase/schema.sql','../supabase/migrations/20260922140000_expand_cards_grader_allowlist.sql'].map(x=>readFile(new URL(x,import.meta.url),'utf8')));
 for(const grader of graders){assert.match(schema,new RegExp(`'${grader.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}'`));assert.match(migration,new RegExp(`'${grader.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}'`));}
 assert.doesNotMatch(migration,/cascade/i);assert.match(migration,/refusing to modify/i);
});
