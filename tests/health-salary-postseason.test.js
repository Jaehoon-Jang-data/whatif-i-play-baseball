import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createCareer,emptyPitch,loadCareer,saveCareer,programProfile,nextYear,salaryOffer,negotiateSalary,postseasonRosterAssessment,postseasonEligibility,postseasonRules,retirementAssessment,positionOffer,moveTeam,simulateSeason,postseasonResult,runDraft} from '../src/engine.js';
import {fatigue,injuryRisk,recoverOffseason,completeSeasonHealth,fatigueAfterDay} from '../src/health.js';
const make=(role='pitch')=>{const c=createCareer({seed:17,name:'검증',school:'가상고',role,position:role==='pitch'?'선발':'유격수',type:role==='pitch'?'제구형':'교타형',team:0});Object.assign(c,{stage:'프로',year:2040,age:31,proYears:10,served:true,reserved:true});c.player.a.fill(65);c.contract={kind:'reserved',annualMan:3300,left:0};return c;};
const row=(extra={})=>({year:2039,age:30,stage:'프로',team:0,role:'pitch',position:'선발',military:false,awards:[],stat:{...emptyPitch(),g:29,gs:29,outs:450,w:13,l:7,er:77,r:80,h:155,bb:45,k:110},minorStat:emptyPitch(),...extra});
const roundtrip=c=>{let raw;saveCareer(c,{setItem:(_,v)=>raw=v});return loadCareer({getItem:()=>raw});};
test('v7 신뢰도는 삭제하고 실제 훈련 피로에서 이관하며 저장 뒤 일치한다',()=>{
 const c=make();c.version=7;delete c.health;c.clubTrust=100;c.trustHistory=[{value:100}];c.trainingState={fatigue:40};
 const restored=loadCareer({getItem:()=>JSON.stringify(c)});assert.equal(restored.version,8);assert.equal(restored.health.fatigue,18);assert.equal('clubTrust' in restored,false);assert.equal('trustHistory' in restored,false);assert.equal(roundtrip(restored).health.fatigue,18);
 const zero=structuredClone(c);delete zero.trainingState;assert.equal(loadCareer({getItem:()=>JSON.stringify(zero)}).health.fatigue,0);
});
test('출장·투구·훈련은 피로에 반영되고 휴식은 연도별 한 번만 회복한다',()=>{
 const a=make(),b=make(),profile=programProfile(a,['pitch-power']);completeSeasonHealth(a,profile,null,{outs:510},{},{estimatedPitches7:95});completeSeasonHealth(b,programProfile(b,['pitch-condition']),null,{outs:60},{},{estimatedPitches7:0});assert.ok(fatigue(a)>fatigue(b));const before=fatigue(a);a.year++;recoverOffseason(a);assert.ok(fatigue(a)<before);const after=fatigue(a);recoverOffseason(a);assert.equal(fatigue(a),after);moveTeam(a,4);assert.equal(fatigue(a),after);
});
test('피로와 위험을 분리하고 나이·내구성·이력·복귀·강도에 반응한다',()=>{
 const a=make(),b=make();a.health.fatigue=b.health.fatigue=25;b.age=40;b.injuries=5;b.history=[row({injury:{days:70}})];b.recoveryState={year:b.year};assert.equal(fatigue(a),fatigue(b));assert.ok(injuryRisk(b).probability>injuryRisk(a).probability);
 const standard=injuryRisk(a,programProfile(a,['pitch-power'])).probability;a.trainingIntensity='high';assert.ok(injuryRisk(a,programProfile(a,['pitch-power'])).probability>standard);assert.ok(programProfile(a,['pitch-power']).efficiency>1);a.trainingIntensity='recovery';assert.ok(injuryRisk(a,programProfile(a,['pitch-power'])).probability<standard);assert.ok(programProfile(a,['pitch-power']).efficiency<1);
 b.trainingState={durability:12};assert.ok(injuryRisk({...b,trainingState:{durability:0}}).probability>injuryRisk(b).probability);
});
test('첨부 사례와 같은 선발 실적은 최초 제안부터 인상하고 실패해도 구단 제안을 지급한다',()=>{
 for(const [g,outs,er,w]of [[26,405,54,11],[29,450,77,13],[20,342,35,11]]){const c=make();c.history=[row({stat:{...emptyPitch(),g,gs:g,outs,er,w,h:outs/3,bb:30}})];c.salaryPending=true;const offer=salaryOffer(c);assert.ok(offer>3300,`${w}승 ${outs/3}이닝 ${offer}`);const result=negotiateSalary(c,true);assert.equal(result.baseMan,offer);if(!result.accepted)assert.equal(result.annualMan,offer);assert.equal(c.contract.annualMan,result.annualMan);assert.equal(roundtrip(c).salaryDecision.baseMan,offer);}
 const c=make();c.history=[row({awards:['신인왕'],stat:{...emptyPitch(),g:14,gs:14,outs:216,er:42,h:75,bb:30}})];const withAward=salaryOffer(c);c.history[0].awards=[];assert.ok(withAward>salaryOffer(c));
 c.history=[row({stat:{...emptyPitch(),g:12,gs:12,outs:120,er:55,h:75,bb:35}})];assert.equal(salaryOffer(c),3300);c.contract.annualMan=50000;assert.ok(salaryOffer(c)<50000);
});
test('정규시즌 1군 등록일수가 아니라 소속 등록일 및 제대·외국인 예외를 확인한다',()=>{
 const r=row({year:2026,registeredDays:0,clubRegistration:{date:'2026-07-31'}});assert.equal(postseasonEligibility(r).eligible,true);r.clubRegistration.date='2026-08-01';assert.equal(postseasonEligibility(r).eligible,false);r.foreign=true;r.clubRegistration.date='2026-08-15';assert.equal(postseasonEligibility(r).eligible,true);r.clubRegistration.date='2026-08-16';assert.equal(postseasonEligibility(r).eligible,false);delete r.foreign;r.servicePath='regular';r.clubRegistration.date='2026-10-07';assert.equal(postseasonEligibility(r).eligible,true);r.clubRegistration.date='2026-10-08';assert.equal(postseasonEligibility(r).eligible,false);
 assert.equal(postseasonRules(2026).registered,30);assert.equal(postseasonRules(2026).gameEligible,28);assert.equal(postseasonRules(2026).assumed,false);assert.equal(postseasonRules(2040).assumed,true);
});
test('건강한 2군 선수는 선발할 수 있고 부상 회복 전에는 제외하며 다음 시리즈 회복을 반영한다',()=>{
 const r=row({rosterCalendar:Array(188).fill('2군'),aAfter:Array(6).fill(75)});assert.equal(postseasonRosterAssessment(r).selected,true);r.injury={startDay:150,days:45};assert.equal(postseasonRosterAssessment(r,null,188).selected,false);assert.equal(postseasonRosterAssessment(r,null,198).selected,true);assert.ok(postseasonRosterAssessment(r,null,198).health.scale<1);r.military=true;assert.equal(postseasonRosterAssessment(r,null,220).selected,false);
});
test('은퇴 권고는 반복 중증 부상과 기량·출장 저하를 함께 평가하며 보직 제안을 우선하지 않는다',()=>{
 const c=make();c.age=39;c.player.a.fill(50);c.history=[row({year:2038,stat:{...emptyPitch(),g:10,outs:50,er:20},injury:{days:70}}),row({stat:{...emptyPitch(),g:10,outs:50,er:20},injury:{days:65}})];assert.equal(retirementAssessment(c).eligible,true);assert.equal(retirementAssessment(c).seriousInjuries,2);assert.equal(positionOffer(c),null);c.contract={kind:'fa',annualMan:5000,left:1};assert.equal(retirementAssessment(c).eligible,false);c.contract.left=0;assert.equal(retirementAssessment(c).eligible,true);c.phase='result';nextYear(c);assert.equal(c.phase,'retirement_advice');assert.ok(c.pendingEvent.diagnostics.lostDays>=135);
 const healthyStar=make();healthyStar.age=40;healthyStar.player.a.fill(80);healthyStar.history=[row({injury:{days:70},stat:{...emptyPitch(),g:29,gs:29,outs:540,er:40,h:135,bb:25,k:180}})];assert.equal(retirementAssessment(healthyStar).eligible,false);
});
test('포스트시즌은 실제 리그 선수의 시리즈 명단을 고정하고 30명·28명 제한을 적용한다',()=>{
 const c=make(),league=simulateSeason({seed:9,year:2040}),team=[...league.teams].sort((a,b)=>b.w-a.w)[0].id;c.player.team=team;const r=row({year:2040,team,aAfter:Array(6).fill(80)});const result=postseasonResult(league,r,c.player,9);assert.ok(result.series.length);for(const series of result.series){assert.ok(series.locked);assert.equal(series.rosterViolations,0);assert.ok(series.registeredIds.length<=30);assert.equal(new Set(series.registeredIds).size,series.registeredIds.length);assert.ok(series.rosterAudit.length);for(const audit of series.rosterAudit){assert.ok(audit.registered<=30);assert.ok(audit.gameEligible<=28);}assert.ok(series.registeredIds.every(id=>id==='user'||league.players.some(p=>p.id===id)));}
});

test('실제 첨부 저장의 발췌 기록을 보존하고 2040년 최초 제안을 다시 산정한다',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/salary-stagnation.json',import.meta.url))),c=make();Object.assign(c,{year:fixture.year,age:fixture.age,history:fixture.history,contract:fixture.contract,salaryDecision:fixture.salaryDecision});c.player.a=fixture.a;
 assert.equal(c.salaryDecision.baseMan,3300);assert.equal(salaryOffer(c),16000);const before=c.history.map(r=>r.salaryMan);assert.deepEqual(roundtrip(c).history.map(r=>r.salaryMan),before);assert.equal(roundtrip(c).salaryDecision.baseMan,3300);
});
test('경기 직후 피로 증가와 무출장일 회복을 실제 타석·투구 수에서 계산한다',()=>{
 assert.ok(fatigueAfterDay(20,{role:'pitch',pitches:90})>20);assert.ok(fatigueAfterDay(20,{role:'pitch',pitches:0,elapsedDays:4})<20);assert.ok(fatigueAfterDay(20,{role:'bat',pa:5})>20);assert.ok(fatigueAfterDay(20,{role:'bat',pa:0,recovery:true})<fatigueAfterDay(20,{role:'bat',pa:0}));
});

test('신인 계약은 다가오는 시즌의 소속 등록으로 기록되어 포스트시즌 자격을 막지 않는다',()=>{
 let drafted;for(let seed=1;seed<50&&!drafted;seed++){const c=make();c.seed=seed;c.stage='고교';c.phase='path';c.draftAttempts=[];const result=runDraft(c);if(result.selected)drafted=c;}
 assert.ok(drafted);assert.ok(drafted.clubRegistration.date<=`${drafted.year}-07-31`);assert.equal(postseasonEligibility({year:drafted.year,clubRegistration:drafted.clubRegistration}).eligible,true);
});

test('구 저장의 잘못된 2군 제외 문구만 정리하고 과거 출장·우승·급여는 재작성하지 않는다',()=>{
 const c=make();c.history=[row({postseason:{selected:false,selectionReason:'제출 시점 2군 소속',stat:emptyPitch(),ring:false}})];c.version=7;const restored=roundtrip(c),ps=restored.history[0].postseason;assert.equal(ps.selected,false);assert.equal(ps.ring,false);assert.equal(ps.stat.g,0);assert.equal(ps.selectionReason,'당시 로스터 미선발');assert.equal(ps.previousSelectionReason,'제출 시점 2군 소속');assert.deepEqual(restored.history[0].stat,c.history[0].stat);
});
