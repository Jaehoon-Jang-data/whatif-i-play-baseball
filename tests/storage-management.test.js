import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,loadCareer,saveCareer,retire,archiveEntry,upsertArchive,SAVE_KEY,SAVE_TOMBSTONE,LEGACY_SAVE_KEYS} from '../src/engine.js';
import {ARCHIVE_KEY,ARCHIVE_LIMIT,archiveEntries,savedCareerSlots,removeArchivedEntry,removeCareerSlot,retirementArchiveState,storeRetiredCareer,replaceArchivedCareer,archiveExport,importArchiveExport} from '../src/storage-management.js';

function storage(){
  const items=new Map();
  return {getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)};
}
const career=()=>createCareer({seed:73,name:'저장 검증',school:'검증고',role:'bat',position:'우익수',type:'교타형',team:0});

test('현재 선수를 삭제해도 은퇴 보관과 구버전 백업은 남고 재시작 때 되살아나지 않는다',()=>{
  const c=career(),db=storage();
  saveCareer(c,db);db.setItem(LEGACY_SAVE_KEYS[0],JSON.stringify(c));
  db.setItem(ARCHIVE_KEY,JSON.stringify([{id:'retired-1',name:'은퇴 선수'}]));
  assert.equal(savedCareerSlots(db).length,2);
  assert.equal(removeCareerSlot(db,SAVE_KEY),true);
  assert.equal(db.getItem(SAVE_KEY),SAVE_TOMBSTONE);
  assert.equal(loadCareer(db),null);
  assert.equal(archiveEntries(db).length,1);
  assert.equal(savedCareerSlots(db).length,1);
  saveCareer(c,db);assert.equal(loadCareer(db).player.name,'저장 검증');
});

test('은퇴 선수 하나만 삭제하고 같은 이름의 다른 기록과 시즌 지급 내역은 보존한다',()=>{
  const db=storage(),entries=[{id:'first',name:'동명이인',salaryLedger:[{year:2030,salaryMan:3000}]},{id:'second',name:'동명이인',salaryLedger:[{year:2040,salaryMan:5000}]}];
  db.setItem(ARCHIVE_KEY,JSON.stringify(entries));
  assert.throws(()=>removeArchivedEntry(db,0,'second'),/변경/);
  assert.equal(removeArchivedEntry(db,0,'first').id,'first');
  assert.deepEqual(archiveEntries(db),[entries[1]]);
  removeArchivedEntry(db,0,'second');
  assert.equal(db.getItem(ARCHIVE_KEY),null);
});

test('구버전 백업 삭제로 공간을 되찾아 현재 자동 저장을 다시 쓸 수 있다',()=>{
  const c=career(),db=storage(),backup=LEGACY_SAVE_KEYS[0]+'-archive';
  db.setItem(backup,'x'.repeat(5000));
  const bounded={...db,setItem:(key,value)=>{const used=[SAVE_KEY,backup].reduce((sum,item)=>sum+(item===key?value.length:db.getItem(item)?.length||0),0);if(used>5500)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});db.setItem(key,value);}};
  assert.throws(()=>saveCareer(c,bounded),/quota/);
  assert.equal(removeCareerSlot(bounded,backup),true);
  saveCareer(c,bounded);
  assert.equal(loadCareer(bounded).player.name,c.player.name);
  assert.throws(()=>removeCareerSlot(bounded,'unrelated-key'),/삭제할 수 없는/);
});

const retired=index=>{const c=career();c.archiveId=`retired-${index}`;c.player.name=`은퇴 선수 ${index}`;retire(c);return c;};
const fullArchive=db=>{for(let i=0;i<ARCHIVE_LIMIT;i++)assert.equal(storeRetiredCareer(db,retired(i)),true);};

test('은퇴 보관은 7명까지이며 같은 선수 갱신은 가능하고 8번째는 새로고침 후에도 선택을 기다린다',()=>{
  const db=storage();fullArchive(db);const original=db.getItem(ARCHIVE_KEY),eighth=retired(8);saveCareer(eighth,db);
  assert.equal(storeRetiredCareer(db,eighth),false);assert.equal(db.getItem(ARCHIVE_KEY),original);assert.equal(archiveEntries(db).length,7);
  const restored=loadCareer(db);assert.equal(retirementArchiveState(archiveEntries(db),restored).pending,true);
  assert.throws(()=>upsertArchive(archiveEntries(db),restored),/7명/);
  const existing=retired(0);existing.signingIncome=4000;assert.equal(storeRetiredCareer(db,existing),true);assert.equal(archiveEntries(db).length,7);assert.equal(archiveEntries(db)[0].signingIncome,4000);
});

test('선택한 기존 선수만 새 은퇴 선수로 교체하며 다른 여섯 기록은 보존한다',()=>{
  const db=storage();fullArchive(db);const original=archiveEntries(db),eighth=retired(8);
  assert.throws(()=>replaceArchivedCareer(db,eighth,2,'retired-3'),/변경/);assert.deepEqual(archiveEntries(db),original);
  const state=replaceArchivedCareer(db,eighth,2,'retired-2');assert.equal(state.pending,false);assert.equal(state.stored,true);
  const updated=archiveEntries(db);assert.equal(updated.length,7);assert.ok(updated.some(x=>x.id===eighth.archiveId));assert.ok(!updated.some(x=>x.id==='retired-2'));assert.deepEqual(updated.filter(x=>x.id!==eighth.archiveId),original.filter(x=>x.id!=='retired-2'));
  storeRetiredCareer(db,eighth);assert.equal(archiveEntries(db).length,7);
});

test('교체 저장이 공간 부족으로 실패하면 기존 기록을 삭제하지 않는다',()=>{
  const db=storage();fullArchive(db);const original=db.getItem(ARCHIVE_KEY),failing={...db,setItem:()=>{throw Object.assign(Error('quota'),{name:'QuotaExceededError'});}};
  assert.throws(()=>replaceArchivedCareer(failing,retired(8),0,'retired-0'),/quota/);assert.equal(db.getItem(ARCHIVE_KEY),original);assert.equal(retirementArchiveState(archiveEntries(db),retired(8)).pending,true);
});

test('기존 7명 초과 저장은 자동으로 잘리지 않고 사용자가 고른 기록부터 정리한다',()=>{
  const db=storage(),entries=Array.from({length:9},(_,i)=>archiveEntry(retired(i)));db.setItem(ARCHIVE_KEY,JSON.stringify(entries));
  const tenth=retired(10);assert.equal(storeRetiredCareer(db,tenth),false);assert.deepEqual(archiveEntries(db),JSON.parse(JSON.stringify(entries)));
  assert.equal(retirementArchiveState(entries,tenth).excess,2);
  for(let i=0;i<3;i++){const state=replaceArchivedCareer(db,tenth,0,`retired-${i}`);assert.equal(state.pending,i<2);}
  assert.equal(archiveEntries(db).length,7);assert.ok(archiveEntries(db).some(x=>x.id===tenth.archiveId));
});

test('보관 내보내기·복원은 기록을 유지하고 중복을 만들지 않으며 한도 초과·손상은 원자적으로 거절한다',()=>{
  const db=storage();fullArchive(db);const original=archiveEntries(db),backup=JSON.parse(JSON.stringify(archiveExport(original))),target=storage();
  assert.equal(importArchiveExport(target,backup),7);assert.equal(importArchiveExport(target,backup),7);assert.deepEqual(archiveEntries(target),original);
  const before=target.getItem(ARCHIVE_KEY);assert.throws(()=>importArchiveExport(target,archiveExport([archiveEntry(retired(8))])),/7명/);assert.equal(target.getItem(ARCHIVE_KEY),before);
  const malformed=structuredClone(backup);malformed.entries[1].salaryLedger={};assert.throws(()=>importArchiveExport(target,malformed),/손상/);assert.equal(target.getItem(ARCHIVE_KEY),before);
  const withoutId={...original[0]};delete withoutId.id;const legacy=archiveExport([withoutId]);assert.equal(legacy.entries[0].id,archiveExport([withoutId]).entries[0].id);const legacyDb=storage();legacyDb.setItem(ARCHIVE_KEY,JSON.stringify([withoutId]));assert.equal(importArchiveExport(legacyDb,legacy),1);
});
