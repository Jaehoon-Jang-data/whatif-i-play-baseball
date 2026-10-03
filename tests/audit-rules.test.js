import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,emptyBat,emptyPitch,hasChampionshipRing,secondaryDraftEligible,salaryOffer,negotiateSalary,TITLES,offers,deferFA,postseasonResult,rookieEligible} from '../src/engine.js';

const career=(seed=1)=>{const c=createCareer({seed,name:'검증',school:'가명고',role:'bat',position:'중견수',type:'교타형',team:0});c.stage='프로';c.year=2030;c.age=25;c.reserved=true;c.contract={kind:'reserved',annualMan:10000,left:0};c.player.a.fill(20);return c;};
test('신인상 자격은 5년 이내 누적 60타석 또는 30이닝까지 유지된다',()=>{
  const c=career(),row={stage:'프로',year:2028,role:'bat',military:false,stat:{...emptyBat(),pa:60}};
  c.history=[row];assert.equal(rookieEligible(c),true);
  c.history=[{...row,stat:{...emptyBat(),pa:61}}];assert.equal(rookieEligible(c),false);
  c.player.role='pitch';c.history=[{...row,role:'pitch',stat:{...emptyPitch(),outs:90}}];assert.equal(rookieEligible(c),true);
  c.history=[{...row,role:'pitch',stat:{...emptyPitch(),outs:91}}];assert.equal(rookieEligible(c),false);
});
test('2차 드래프트는 입단 3년 이하, 4년차 군 보류, 당해 FA를 자동 보호한다',()=>{
  const c=career();const row={stage:'프로',role:'bat',military:false,year:2027,registeredDays:50,stat:emptyBat(),minorStat:emptyBat()};
  c.history=[row,row];assert.equal(secondaryDraftEligible(c),false);
  c.history.push(row);assert.equal(secondaryDraftEligible(c),true);
  c.history[1]={...row,servicePath:'athletic',military:true};assert.equal(secondaryDraftEligible(c),false);
  c.history=Array.from({length:8},(_,i)=>({...row,year:2022+i,registeredDays:145}));assert.equal(secondaryDraftEligible(c),false);
});
test('선수의 우승 반지는 실제 포스트시즌 로스터와 출장을 요구한다',()=>{
  const base={team:0,postseason:{champion:0,selected:false,ring:false,stat:emptyBat()}};
  assert.equal(hasChampionshipRing(base),false);
  base.postseason.selected=true;base.postseason.stat.g=1;base.postseason.ring=true;assert.equal(hasChampionshipRing(base),true);
});
test('부진 연봉과 FA 유보 후 연봉 협상',()=>{
  const c=career(4);c.year=2029;c.contract.annualMan=30000;c.history=[{stage:'프로',role:'bat',military:false,position:'중견수',stat:{...emptyBat(),g:100,pa:420,ab:380,h:38},minorStat:emptyBat()}];
  assert.ok(salaryOffer(c)<30000);
  c.salaryPending=true;const base=salaryOffer(c),result=negotiateSalary(c,true);if(!result.accepted)assert.equal(result.annualMan,base);
  c.phase='fa_choice';c.contract.left=0;deferFA(c);assert.equal(c.phase,'prepare');assert.equal(c.salaryPending,true);
});
test('타이틀 대상에서 WHIP·OPS를 제외하고 실제 대상만 둔다',()=>{
  const titles=TITLES.map(x=>x[0]);assert.equal(titles.length,14);assert.ok(titles.includes('승률왕'));assert.ok(titles.includes('득점왕'));assert.ok(!titles.includes('WHIP'));assert.ok(!titles.includes('OPS'));
});
test('와일드카드 4위는 한 경기 승리로 진출한다',()=>{
  const teams=Array.from({length:10},(_,id)=>({id,w:90-id*3,l:54+id*3,g:144}));
  const out=postseasonResult({year:2030,games:144,teams,players:[]},{team:0,role:'bat',stat:{g:0}},null,15);
  assert.ok(out.rounds[0].games<=2);assert.ok(out.rounds[0].winner===3||out.rounds[0].winner===4);
});

test('포스트시즌 하위 시드가 우승해도 정규시즌 1위는 최종 2위다',()=>{
  const teams=Array.from({length:10},(_,id)=>({id,w:90-id*3,l:54+id*3,g:144}));
  const league={year:2030,games:144,teams,players:[]};
  for(let seed=1;seed<=1000;seed++){
    const first=postseasonResult(league,{team:0,role:'bat',stat:{...emptyBat(),g:0}},null,seed);
    assert.ok([1,2].includes(first.finalRank));
    assert.equal(first.finalRank,first.champion===0?1:2);
    assert.deepEqual(first.rounds.map(x=>x.round),['와일드카드','준플레이오프','플레이오프','한국시리즈']);
  }
});

test('수상 3개 주전의 연봉과 MVP 타자의 FA 총액은 성적을 반영한다',()=>{
  const c=career(7);c.player.position='2루수';c.contract.annualMan=4400;c.history=[{stage:'프로',military:false,role:'bat',position:'2루수',stat:{...emptyBat(),g:140,pa:590,ab:520,h:180,hr:25,rbi:100,bb:60},awards:['최다안타','타점','골든글러브 · 2루수']}];
  assert.ok(salaryOffer(c)>=12000);
  c.phase='market';c.faDeclared=true;c.age=29;c.contract.annualMan=20000;c.history=Array.from({length:3},(_,i)=>({...c.history[0],awards:i===2?['MVP','최다안타','타점','홈런','골든글러브 · 2루수']:[]}));
  assert.ok(offers(c).every(x=>x.totalMan>=600000));
  const without=structuredClone(c);without.history[2].awards=[];
  assert.ok(offers(c)[0].totalMan>offers(without)[0].totalMan);
});

test('백분위 비교군은 플레이어 표본 구간 이상이며 동점은 중간 순위다',async()=>{
  const {percentileReport,percentile}=await import('../src/engine.js');
  const players=Array.from({length:13},(_,i)=>({id:i?'peer'+i:'user',role:'bat',position:'2루수',team:0,stat:{...emptyBat(),g:100,pa:i===0?223:i<=3?112:i<=6?223:i<=9?335:446,ab:200,h:80+i}}));
  const league={games:144,teams:[{id:0,g:144}],players};
  let report=percentileReport(league,'bat').find(x=>x.key==='h');
  assert.equal(report.qualification,'50%');assert.equal(report.count,10);assert.equal(report.threshold,223);
  assert.equal(report.percentile,percentile(80,players.slice(4).map(p=>p.stat.h)));
  players[0].stat.pa=335;report=percentileReport(league,'bat').find(x=>x.key==='h');assert.equal(report.qualification,'75%');assert.equal(report.count,7);assert.ok(report.percentile!==null);assert.equal(report.threshold,335);
  players[0].stat.pa=112;report=percentileReport(league,'bat').find(x=>x.key==='h');assert.equal(report.qualification,'25%');assert.equal(report.count,13);
});
