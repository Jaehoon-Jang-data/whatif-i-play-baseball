import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,loadCareer,saveCareer,SAVE_KEY,SAVE_TOMBSTONE,LEGACY_SAVE_KEYS} from '../src/engine.js';
import {ARCHIVE_KEY,archiveEntries,savedCareerSlots,removeArchivedEntry,removeCareerSlot} from '../src/storage-management.js';

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
