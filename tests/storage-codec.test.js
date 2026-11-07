import test from'node:test';import assert from'node:assert/strict';
import{encodeStoredJSON,decodeStoredJSON,writeStoredJSON,storedJSONPreview,STORAGE_CODEC}from'../src/storage-codec.js';
import{createCareer,simulateSeason,archiveEntry,retire,saveCareer,loadCareer,SAVE_KEY,LEGACY_SAVE_KEYS}from'../src/engine.js';
import{ARCHIVE_KEY,ARCHIVE_EXPORT_FORMAT,archiveEntries,storeRetiredCareer,replaceArchivedCareer,archiveExport,importArchiveExport,savedCareerSlots}from'../src/storage-management.js';
import{careerWarSnapshot}from'../src/war.js';
const db=(limit=Infinity)=>{const values=new Map();return{values,getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k),setItem(k,v){const size=[...values].filter(([x])=>x!==k).reduce((n,[x,y])=>n+x.length+y.length,0)+k.length+v.length;if(size>limit)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});values.set(k,v);}};};
const large={version:7,player:{name:'한글·😀'},year:2051,history:Array.from({length:4000},(_,i)=>({year:2027+i%25,position:'우익수',stats:[i%100,-.1,3.141592653589793],text:'한글/😀/\ud800/\u0000/é/\/\\\"'}))};

test('무손실 압축은 한글·유니코드·정밀 수치와 기존 일반 JSON을 보존한다',()=>{
 const raw=JSON.stringify(large),stored=encodeStoredJSON(large);assert.equal(JSON.parse(stored)._storageCodec,STORAGE_CODEC);assert.ok(stored.length<raw.length*.3);assert.deepEqual(decodeStoredJSON(stored),large);assert.deepEqual(storedJSONPreview(stored).player,large.player);
 assert.deepEqual(decodeStoredJSON(raw),large);assert.equal(encodeStoredJSON({small:1}),' {"small":1}'.trim());
 for(let n=1;n<=40;n++){const x={text:Array.from({length:n*20},(_,i)=>String.fromCharCode((i*379+n*137)%65536)).join('').repeat(10)};assert.deepEqual(decodeStoredJSON(encodeStoredJSON(x,{force:true})),x);}
});
test('손상·길이 불일치·미지원 압축 형식은 정상 데이터로 취급하지 않는다',()=>{
 const good=JSON.parse(encodeStoredJSON(large));for(const change of [{checksum:good.checksum^1},{data:good.data.slice(0,-1)},{byteLength:good.byteLength+1},{byteLength:2**31},{_storageCodec:'unknown'}])assert.throws(()=>decodeStoredJSON(JSON.stringify({...good,...change})),/손상|압축 저장|지원하지/);
});
test('할당량 부족 시 지정된 구 저장만 무손실 압축하고 어떤 기록도 먼저 삭제하지 않는다',()=>{
 const storage=db(70000),old={padding:'동일한 구버전 저장 '.repeat(2500)},oldRaw=JSON.stringify(old);storage.setItem('legacy',oldRaw);storage.setItem('unrelated','다른 서비스 설정');
 const next={data:'현재 커리어 '.repeat(2000)},length=encodeStoredJSON(next).length;
 // Fill unused space so the first current-save attempt must fail.
 storage.setItem('filler','x'.repeat(70000-oldRaw.length-'legacy'.length-'unrelated'.length-'다른 서비스 설정'.length-'filler'.length-20));
 assert.ok(length>20);writeStoredJSON(storage,'current',next,['legacy']);assert.deepEqual(decodeStoredJSON(storage.getItem('legacy')),old);assert.deepEqual(decodeStoredJSON(storage.getItem('current')),next);assert.equal(storage.getItem('unrelated'),'다른 서비스 설정');assert.ok(storage.getItem('legacy').length<oldRaw.length);
 const full=db(300);full.setItem('current','{"old":true}');full.setItem('other','z'.repeat(250));assert.throws(()=>writeStoredJSON(full,'current',{random:Array.from({length:400},(_,i)=>i*779)},['other']),/quota/);assert.equal(full.getItem('current'),'{"old":true}');assert.equal(full.getItem('other'),'z'.repeat(250));
});
function career(){
 const c=createCareer({seed:11,name:'장기 저장 검증',school:'가상고',role:'bat',position:'우익수',team:0,type:'교타형'});Object.assign(c,{year:2051,age:42,stage:'프로',proYears:24});
 const l=simulateSeason({seed:11,year:2030,games:18,player:{...c.player,a:Array(6).fill(80),opportunity:1}}),p=l.players.find(x=>x.id==='user');
 c.history=Array.from({length:24},(_,i)=>{const league=structuredClone(l);league.year=2027+i;return{year:league.year,age:18+i,stage:'프로',role:'bat',position:'우익수',team:0,stat:structuredClone(p.stat),league,awards:[],teamSegments:[{team:0,stat:structuredClone(p.stat)}]};});c.latest=c.history.at(-1).league;retire(c);return c;
}
test('24시즌 현재 저장·은퇴 7명·불러오기·내보내기는 동일한 기록과 WAR를 보존한다',()=>{
 const c=career(),storage=db(1500000);saveCareer(c,storage);assert.equal(JSON.parse(storage.getItem(SAVE_KEY))._storageCodec,STORAGE_CODEC);
 const before=loadCareer({getItem:()=>JSON.stringify(c)}),after=loadCareer(storage);assert.deepEqual(after,before);assert.deepEqual(careerWarSnapshot(after.history),careerWarSnapshot(before.history));assert.deepEqual(after.latest,before.latest);
 for(let i=0;i<7;i++){const next=structuredClone(c);next.archiveId='long-'+i;next.player.name='보관 '+i;assert.equal(storeRetiredCareer(storage,next),true);}
 const original=archiveEntries(storage),backup=archiveExport(original),target=db(1500000);assert.equal(importArchiveExport(target,backup),7);assert.deepEqual(archiveEntries(target),original);
 const eighth=structuredClone(c);eighth.archiveId='long-8';assert.equal(storeRetiredCareer(storage,eighth),false);replaceArchivedCareer(storage,eighth,2,'long-2');assert.equal(archiveEntries(storage).length,7);assert.equal(archiveEntries(storage).filter(x=>x.id==='long-8').length,1);
 assert.equal(savedCareerSlots(storage).find(x=>x.key===SAVE_KEY).name,c.player.name);
 const legacy=db(1500000);legacy.setItem(LEGACY_SAVE_KEYS[0],encodeStoredJSON(c));assert.equal(loadCareer(legacy).year,c.year);
});
test('손상된 은퇴 목록을 빈 목록으로 간주해 덮어쓰지 않는다',()=>{
 const storage=db(),raw='{"_storageCodec":"deflate-utf16-v1","data":"broken"}';storage.setItem(ARCHIVE_KEY,raw);const c=createCareer({seed:1,name:'보호',school:'고교',role:'bat',position:'포수',team:0});retire(c);
 assert.throws(()=>archiveEntries(storage),/읽을 수 없습니다/);assert.throws(()=>storeRetiredCareer(storage,c),/읽을 수 없습니다/);assert.throws(()=>importArchiveExport(storage,{format:ARCHIVE_EXPORT_FORMAT,entries:[archiveEntry(c)]}),/읽을 수 없습니다/);assert.equal(storage.getItem(ARCHIVE_KEY),raw);
});
