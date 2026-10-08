import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,emptyBat,emptyPitch,positionOffer,nextYear,resolvePositionOffer,decideRetirementAdvice,progress,retire,archiveEntry,archiveSalaryTotal,upsertArchive,saveCareer,loadCareer} from '../src/engine.js';

const career=(seed=31)=>{const c=createCareer({seed,name:'흐름 검증',school:'검증고',team:0,role:'pitch',position:'중간계투',type:'변화구형'});c.stage='프로';c.phase='result';c.year=2030;c.age=41;c.proYears=8;c.reserved=true;c.served=true;c.player.a=[75,78,78,70,76,70];c.contract={kind:'reserved',annualMan:5000,left:0};c.latest={players:[{id:'closer',team:0,role:'pitch',position:'마무리',a:[50,50,50,50,50,50]}]};c.history=[{year:2030,stage:'프로',role:'pitch',position:'중간계투',team:0,stat:{...emptyPitch(),g:60,outs:180,er:15,hold:20},awards:[]}];return c;};

test('은퇴 권고가 보직 제안보다 우선하고 시즌 결과 다음 스토브리그 입구에 한 번만 열린다',()=>{
 const c=career();assert.equal(positionOffer({...c,phase:'prepare',age:42})?.target,'마무리');nextYear(c);
 assert.equal(c.year,2031);assert.equal(c.age,42);assert.equal(c.phase,'retirement_advice');assert.equal(c.pendingEvent?.type,'retirement_advice');assert.equal(c.pendingPositionOffer,undefined);
 assert.throws(()=>nextYear(c));assert.throws(()=>progress(c));
 let raw;saveCareer(c,{setItem:(_,value)=>raw=value});const loaded=loadCareer({getItem:()=>raw});assert.equal(loaded.phase,'retirement_advice');assert.equal(loaded.pendingEvent.type,'retirement_advice');
 decideRetirementAdvice(c,true);assert.equal(c.phase,'retired');assert.equal(c.retirementReason,'은퇴 권고 수락');
});

test('은퇴 대상이 아니면 시즌 결과 → 보직 제안 → 다음 시즌 준비 순서다',()=>{
 const c=career(32);c.age=31;nextYear(c);assert.equal(c.phase,'position_choice');assert.equal(c.year,2030);assert.equal(c.pendingPositionOffer.target,'마무리');
 resolvePositionOffer(c,true);assert.equal(c.year,2031);assert.equal(c.player.position,'마무리');assert.equal(c.phase,'prepare');assert.equal(c.pendingEvent.type,'position_result');
});

test('보직 변경과 구단 이동이 같은 겨울이면 변경 결과를 먼저 확인한다',()=>{
 const c=career(305);c.age=31;c.phase='position_choice';c.pendingPositionOffer={target:'마무리'};
 resolvePositionOffer(c,true);assert.equal(c.pendingEvent.type,'position_result');assert.equal(c.eventQueue[0]?.type,'trade');
});

test('은퇴 보관은 시즌 기록과 연봉을 보존하고 같은 선수만 갱신한다',()=>{
 const c=createCareer({seed:55,name:'보관 검증',school:'검증고',team:0,role:'bat',position:'우익수',type:'교타형'});c.stage='프로';c.year=2032;c.age=23;c.proYears=2;c.archiveId='career-55';
 c.history=[{year:2030,stage:'프로',role:'bat',position:'우익수',team:0,stat:{...emptyBat(),g:100,pa:400,h:100},minorStat:{...emptyBat(),g:20},awards:['안타왕']},{year:2031,stage:'프로',role:'bat',position:'우익수',team:0,stat:{...emptyBat(),g:130,pa:520,h:150},awards:['골든글러브 · 우익수']}];
 c.salaryLedger=[{year:2030,team:0,salaryMan:3300,optionPaidMan:500,allowanceMan:0},{year:2031,team:0,salaryMan:5000,optionPaidMan:1000,allowanceMan:0}];c.signingIncome=6000;retire(c);
 const first=archiveEntry(c);assert.equal(first.salaryLedger.length,2);assert.equal(archiveSalaryTotal(first),8300);assert.equal(first.signingIncome,6000);assert.equal(first.history[0].minorStat.g,20);assert.deepEqual(first.history.flatMap(x=>x.awards),['안타왕','골든글러브 · 우익수']);
 let entries=upsertArchive([],c);entries=upsertArchive(entries,c);assert.equal(entries.length,1);
 const other=structuredClone(c);other.archiveId='career-56';entries=upsertArchive(entries,other);assert.equal(entries.length,2);
 const restored=JSON.parse(JSON.stringify(entries));assert.equal(archiveSalaryTotal(restored[0]),8300);assert.equal(restored[0].history[1].stat.h,150);assert.equal(archiveSalaryTotal({id:'old',history:first.history}),null);
});

test('시즌 진행률 콜백은 실제 경기 처리에 따라 증가하고 기록이 끝날 때 100%가 된다',()=>{
 const c=createCareer({seed:71,name:'진행 검증',school:'검증고',team:0,role:'bat',position:'우익수',type:'교타형'}),values=[];
 progress(c,[0],fraction=>values.push(fraction));assert.equal(c.phase,'result');assert.ok(values.length>10);assert.equal(values.at(-1),1);assert.ok(values.every((value,i)=>value>=0&&value<=1&&(i===0||value>=values[i-1])));
});
