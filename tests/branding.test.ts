import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root=new URL('../',import.meta.url);
async function pngSize(path:string){const file=await readFile(new URL(path,root));return {width:file.readUInt32BE(16),height:file.readUInt32BE(20)};}
test('PWA manifest keeps Pages-relative icon paths and shark artwork derivatives',async()=>{
  const manifest=JSON.parse(await readFile(new URL('public/manifest.webmanifest',root),'utf8')) as {name:string;short_name:string;start_url:string;scope:string;display:string;background_color:string;theme_color:string;icons:Array<{src:string;sizes:string;purpose?:string}>};
  assert.equal(manifest.name,'Slabberjaws');assert.equal(manifest.short_name,'Slabberjaws');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');assert.equal(manifest.background_color,'#17191c');assert.equal(manifest.theme_color,'#1677b8');
  assert.deepEqual(manifest.icons.map(icon=>icon.src),['./icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png']);
  for(const [path,size] of [['public/icons/icon-32.png',32],['public/icons/icon-48.png',48],['public/icons/apple-touch-icon.png',180],['public/icons/icon-192.png',192],['public/icons/icon-512.png',512],['public/icons/icon-512-maskable.png',512]] as const)assert.deepEqual(await pngSize(path),{width:size,height:size},path);
  assert.equal(manifest.icons.at(-1)?.purpose,'maskable');
});
test('metadata declares an Apple touch icon, manifest, and app title',async()=>{
  const layout=await readFile(new URL('app/layout.tsx',root),'utf8');
  for(const value of ['manifest: "./manifest.webmanifest"','apple-touch-icon.png','title: "Slabberjaws"','icon-32.png','icon-48.png'])assert.ok(layout.includes(value),value);
});
