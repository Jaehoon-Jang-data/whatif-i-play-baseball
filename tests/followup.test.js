import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,offers,sign,faContractTerm,faStatus,progress,nextYear,acknowledgeEvent,rosterPlan,springEvaluation,simulateSeason,requestTrade,saveCareer,loadCareer} from '../src/engine.js';

const career=(seed=1)=>{const c=createCareer({seed,name:'검증 선수',school:'가명고',role:'bat',position:'중견수',type:'교타형',team:0});c.stage='프로';c.phase='prepare';c.year=2030;c.age=37;c.served=true;c.contract={kind:'reserved',annualMan:6000,years:1,left:0};return c;};
const clearEvents=c=>{while(c.pendingEvent)acknowledgeEvent(c);};

test('2년 FA 계약은 0/2, 1/2, 만료 순서로 진행하고 협상을 계약 중 막는다',()=>{
  const c=career(31);c.phase='market';c.faDeclared=true;const offer=offers(c)[0];assert.equal(offer.years,2);sign(c,offer);
  assert.deepEqual(faContractTerm(c),{years:2,elapsed:0,remaining:2,active:true});assert.equal(c.salaryPending,false);c.phase='prepare';
  let saved;saveCareer(c,{setItem:(_,value)=>saved=value});const restored=loadCareer({getItem:()=>saved});assert.deepEqual(faContractTerm(restored),faContractTerm(c));assert.equal(restored.salaryPending,false);
  const stale=JSON.parse(saved);stale.salaryPending=true;assert.equal(loadCareer({getItem:()=>JSON.stringify(stale)}).salaryPending,false);
  c.salaryPending=true;const first=progress(c);assert.ok(first.stat.g>=0);assert.equal(c.salaryPending,false);assert.deepEqual(faContractTerm(c),{years:2,elapsed:1,remaining:1,active:true});
  clearEvents(c);nextYear(c);assert.equal(c.phase,'prepare');assert.equal(c.salaryPending,false);assert.equal(faStatus(c).required,4);
  progress(c);clearEvents(c);assert.deepEqual(faContractTerm(c),{years:2,elapsed:2,remaining:0,active:false});nextYear(c);assert.equal(c.salaryPending,true);
});

test('일반 육성선수는 첫 시즌 2군에서 출발하고 예외 평가만 시즌 전에 발생한다',()=>{
  const c=career(45);c.age=19;c.proYears=0;c.developmental=true;c.player.a.fill(90);c.contract.left=1;
  const ordinary=rosterPlan(c);assert.equal(ordinary.opening,'2군');assert.ok(ordinary.calendar.every(x=>x==='2군'));
  assert.equal(springEvaluation(c),null);c.developmentalElite=true;const exceptional=rosterPlan(c);assert.equal(exceptional.opening,'1군');
  const event=springEvaluation(c);assert.equal(event.type,'spring_evaluation');assert.equal(event.year,c.year);assert.equal(c.phase,'prepare');assert.equal(springEvaluation(c),null);
  c.developmentalElite=false;const first=progress(c);assert.equal(first.stat.g,0);assert.ok(first.minorStat.g>0);clearEvents(c);nextYear(c);assert.equal(c.proYears,1);assert.equal(c.developmental,true);assert.ok(rosterPlan(c).calendar.includes('1군'));
});

test('100시드의 안타와 수비상 분포가 정상 능력 및 높은 능력에서 구별된다',()=>{
  const tally=value=>{let hits=0,hitTitles=0,defense=0;for(let seed=1;seed<=100;seed++){const league=simulateSeason({seed,year:2030,player:{name:'검증',team:0,role:'bat',position:'중견수',a:Array(6).fill(value),opportunity:1}}),user=league.players.find(x=>x.id==='user');hits+=user.stat.h;hitTitles+=+league.awards.some(x=>x.title==='최다안타'&&x.winners.includes('user'));defense+=+league.awards.some(x=>x.title==='수비상 · 중견수'&&x.winners.includes('user'));}return {hits:hits/100,hitTitles,defense};};
  const normal=tally(60),elite=tally(90);assert.ok(normal.hits>=150&&normal.hits<=155);assert.ok(normal.hitTitles<=10);assert.ok(normal.defense<=35);assert.ok(elite.hits>normal.hits&&elite.hitTitles>normal.hitTitles&&elite.defense>normal.defense);
});

test('트레이드 제안이 없으면 팝업을 만들지 않는다',()=>{let declined;for(let seed=1;seed<100&&!declined;seed++){const c=career(seed);c.proYears=3;const event=requestTrade(c);if(event.outcome!=='수락')declined=c;}assert.ok(declined);assert.equal(declined.pendingEvent,null);assert.equal(declined.tradeRequestYear,declined.year);});
