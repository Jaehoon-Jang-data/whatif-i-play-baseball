import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,emptyPitch,simulateSeason,changePosition,resolvePositionOffer,saveCareer,loadCareer,availableTraining} from '../src/engine.js';
import {assignBullpenRoles,chooseBullpenPitcher,reliefAvailability,holdEligible} from '../src/bullpen.js';
import {gameEligibleRoster} from '../src/league-operations.js';
const arm=(id,value,position='중간계투')=>({id,role:'pitch',position,a:Array(6).fill(value),stat:emptyPitch()});
const staff=[arm('ace',90),arm('setup',85),arm('middle',60),arm('long',55),arm('closer',80,'마무리')];staff[3].a[3]=80;
const roles=assignBullpenRoles(staff,p=>p.a[0]),pick=(inning,lead,workloads=new Map(),usedIds=new Set())=>chooseBullpenPitcher({pitchers:staff,roles,workloads,usedIds,day:20,inning,lead,seasonStart:0,score:p=>p.a[0],random:()=>0});
test('접전 필승조·세이브 마무리·비접전 추격조·이른 롱릴리프를 구분한다',()=>{
 assert.equal(pick(7,2).pitcher.id,'ace');assert.equal(pick(7,0).pitcher.id,'ace');assert.equal(pick(8,2).pitcher.id,'closer');assert.ok(['middle','long'].includes(pick(7,7).pitcher.id));assert.equal(pick(4,-4).pitcher.id,'long');
});
test('실제 달력 3연투와 30·45구 이후 휴식 및 주간 부하 경계를 적용한다',()=>{
 assert.equal(reliefAvailability([{day:18,pitches:12},{day:19,pitches:12}],20).available,false);
 assert.equal(reliefAvailability([{day:19,pitches:30}],20).available,false);assert.equal(reliefAvailability([{day:18,pitches:30}],20).available,true);
 assert.equal(reliefAvailability([{day:18,pitches:45}],20).available,false);assert.equal(reliefAvailability([{day:17,pitches:45}],20).available,true);
 assert.equal(reliefAvailability([{day:14,pitches:25},{day:16,pitches:25},{day:18,pitches:25}],20).available,false);
 const load=new Map([['ace',[{day:18,pitches:12},{day:19,pitches:12}]]]);assert.equal(pick(7,1,load).pitcher.id,'setup');
 assert.equal(pick(7,1,new Map(),new Set(staff.map(p=>p.id))),null);
});
test('홀드는 패전 팀에도 가능하며 승리·패전·경기 마무리 투수는 제외한다',()=>{
 const v={started:false,finished:false,entry:1,exit:1,outs:1};assert.equal(holdEligible(v),true);assert.equal(holdEligible(v,{winner:true}),false);assert.equal(holdEligible(v,{loser:true}),false);assert.equal(holdEligible({...v,finished:true}),false);assert.equal(holdEligible({...v,started:true}),false);assert.equal(holdEligible({...v,holdLost:true}),false);assert.equal(holdEligible({...v,blown:true}),false);
 assert.equal(holdEligible({...v,entry:3}),false);assert.equal(holdEligible({...v,entry:3,outs:3}),true);assert.equal(holdEligible({...v,entry:4,entryRunners:3}),true);
});
test('여러 시즌의 등판 로그는 홀드 원기록·역할·휴식과 일치하고 재등판이 없다',()=>{
 for(const seed of [3,17,41]){
  const season=simulateSeason({seed,year:2034,recordPitching:true}),history=new Map(),unique=new Set();assert.equal(season.rosterViolations,0);assert.equal(season.pitchingAudit.threeConsecutiveDays,0);assert.equal(season.pitchingAudit.heavyRestViolations,0);
  for(const e of season.pitchingLog){const key=`${e.day}:${e.id}`;assert.ok(!unique.has(key));unique.add(key);const prior=history.get(e.id)||[];if(!e.started)assert.equal(reliefAvailability(prior,e.calendarDay).available,true);prior.push({day:e.calendarDay,pitches:e.pitches});history.set(e.id,prior);if(e.hold)assert.ok(!e.started&&!e.finished&&!e.winner&&!e.loser&&!e.save);}
  for(const p of season.players.filter(p=>p.role==='pitch')){const log=season.pitchingLog.filter(e=>e.id===p.id);assert.equal(log.reduce((n,e)=>n+e.outs,0),p.stat.outs);assert.equal(log.filter(e=>e.hold).length,p.stat.hold);if(!p.stat.gs)assert.ok(p.stat.g<=75);}
  assert.ok(season.pitchingAudit.nonCloseCore<=season.pitchingAudit.nonCloseCoreEmergency+season.pitchingAudit.maintenance);
 }
 assert.equal(simulateSeason({seed:2,year:2030,games:8}).pitchingLog,undefined);
});
const career=()=>{const c=createCareer({seed:31,name:'전향 회귀',school:'가상고',role:'pitch',position:'선발',type:'제구형',team:0});Object.assign(c,{stage:'프로',year:2031,age:32,proYears:5,served:true,reserved:true});c.player.a=[70,69,70,50,65,60];c.potentialCaps=c.player.a.map(v=>v+10);c.potentialCaps[1]=69;c.training=[1];c.pendingTraining=[1];c.history=[{year:2030,stage:'프로',role:'pitch',position:'선발',team:0,military:false,stat:{...emptyPitch(),g:27,gs:27,outs:450,er:40,h:140,bb:40},awards:[],aAfter:[...c.player.a]}];c.contract={kind:'reserved',annualMan:3300,left:1};return c;};
const restore=c=>{let raw;saveCareer(c,{setItem:(_,v)=>raw=v});return loadCareer({getItem:()=>raw});};
test('두 보직 변경 경로의 제구 +1은 개인 상한도 올리고 정상 훈련 상한은 유지한다',()=>{
 const direct=career();changePosition(direct);assert.equal(direct.player.a[1],70);assert.equal(direct.potentialCaps[1],70);assert.ok(!direct.training.includes(1));assert.ok(!availableTraining(direct,[1]).includes(1));assert.equal(restore(direct).player.a[1],70);
 const staged=career();staged.year=2030;staged.phase='position_choice';staged.pendingPositionOffer={target:'중간계투'};resolvePositionOffer(staged,true);assert.equal(staged.player.a[1],70);assert.equal(staged.potentialCaps[1],70);assert.ok(!staged.pendingTraining.includes(1));
 const declined=career();declined.phase='position_choice';declined.pendingPositionOffer={target:'중간계투'};resolvePositionOffer(declined,false);assert.equal(declined.player.a[1],69);
});
test('구 저장의 상한에 잘린 보직 보너스는 확인 가능한 준비 상태에서 부족분만 한 번 복원한다',()=>{
 const c=career();c.player.position='중간계투';c.player.a[1]=70;c.potentialCaps[1]=70;c.history[0].aAfter[1]=69.5;c.positionDecisionYear=c.year;c.events=[{year:c.year,text:'코치 제안 수락 · 선발 → 중간계투 · 적응 1시즌'}];const fixed=restore(c);assert.equal(fixed.player.a[1],70.5);assert.equal(fixed.potentialCaps[1],70.5);assert.equal(restore(fixed).player.a[1],70.5);assert.equal(fixed.history[0].aAfter[1],69.5);
 const finished=structuredClone(c);finished.history[0].year=c.year;assert.equal(restore(finished).player.a[1],70);
});

test('경기 명단 축소 시 중복 야수 벤치를 빼고 투수진과 아홉 포지션을 보존한다',()=>{
 const positions=['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'];
 const bats=Array.from({length:16},(_,i)=>({id:`b${i}`,role:'bat',position:positions[i%9]})),arms=Array.from({length:13},(_,i)=>arm(`p${i}`,60,i<5?'선발':'중간계투'));
 for(const limit of [28,27]){const eligible=gameEligibleRoster([...bats,...arms],limit);assert.equal(eligible.length,limit);assert.equal(eligible.filter(p=>p.role==='pitch').length,13);for(const position of positions)assert.ok(eligible.some(p=>p.position===position));}
});
