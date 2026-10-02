import test from 'node:test';
import assert from 'node:assert/strict';
import {abilityCandidates,createCareer,rosterPlan,progress,nextYear,saveCareer,loadCareer,negotiateSalary,retire,careerScore,teamBudget,coachRecommendation,LEVELS,acknowledgeEvent} from '../src/engine.js';

const config=(seed=1,role='bat',position='중견수')=>({seed,name:'검증 선수',school:'경남고',role,position,type:role==='bat'?'교타형':'제구형',team:0,hand:'우투우타'});
const pro=(seed=1)=>{const c=createCareer(config(seed));c.stage='프로';c.phase='prepare';c.year=2030;c.age=24;c.reserved=true;c.playerStatus='reserved';c.contract={kind:'reserved',annualMan:12000,left:1};return c;};

test('세 후보는 서로 다른 성향과 능력 분포를 가진다',()=>{for(const role of ['bat','pitch']){const rows=abilityCandidates(role,82);assert.equal(rows.length,3);assert.equal(new Set(rows.map(x=>x.type)).size,3);assert.equal(new Set(rows.map(x=>x.a.join(','))).size,3);assert.deepEqual(rows,abilityCandidates(role,82));}assert.deepEqual(LEVELS,['2군','1군 백업','1군 준주전','1군 주전']);});

test('부상 상태·이동·등록일수가 같은 188일 기록에서 나온다',()=>{const c=pro(18);c.player.a.fill(82);const plan=rosterPlan(c,{startDay:55,days:30});assert.equal(plan.calendar.length,188);assert.equal(plan.registeredDays,plan.calendar.filter(x=>x==='1군').length);assert.deepEqual(plan.calendar.slice(55,85),Array(30).fill('재활군'));assert.equal(plan.calendar[85],'2군');const transitions=plan.moves.map(x=>x.to);assert.ok(transitions.indexOf('재활군')<transitions.indexOf('2군'));assert.ok(transitions.indexOf('2군')<transitions.lastIndexOf('1군'));for(const move of plan.moves)assert.equal(plan.calendar[move.day-1],move.to);});

test('병역 첫 시즌은 결장하고 둘째 시즌 후반에 복귀한다',()=>{const c=pro(19);c.player.a.fill(90);c.service=2;c.servicePath='regular';const first=progress(c);assert.equal(first.stat.g,0);assert.equal(first.registeredDays,0);while(c.pendingEvent)acknowledgeEvent(c);nextYear(c);const second=progress(c);assert.ok(second.stat.g>0);assert.ok(second.registeredDays>0);assert.equal(second.rosterCalendar[0],'복무');assert.equal(second.rosterCalendar[119],'2군');assert.equal(second.rosterCalendar[138],'1군');});

test('포스트시즌 기록은 정규시즌과 분리되고 저장 후 복구된다',()=>{const c=pro(21);c.player.a.fill(85);const row=progress(c);const before=structuredClone(row.stat),post=structuredClone(row.postseason);assert.deepEqual(row.stat,before);assert.equal(row.postseason.finalRank,row.postseason.champion===row.team?1:row.postseason.finalRank);assert.equal(row.registeredDays,row.rosterCalendar.filter(x=>x==='1군').length);retire(c);const data=new Map();saveCareer(c,{setItem:(k,v)=>data.set(k,v)});const restored=loadCareer({getItem:k=>data.get(k)});assert.deepEqual(restored.history.at(-1).postseason,post);assert.equal(restored.careerScore,careerScore(c));});

test('재협상 실패에도 최초 구단 제안을 적용한다',()=>{let failed;for(let seed=1;seed<20&&!failed;seed++){const c=pro(seed);c.salaryPending=true;const result=negotiateSalary(c,true);if(!result.accepted)failed={c,result};}assert.ok(failed);assert.equal(failed.result.annualMan,failed.result.baseMan);assert.equal(failed.c.contract.annualMan,failed.result.baseMan);});

test('팀 급여 여력은 계약금 배분과 실제 지급 옵션을 반영한다',()=>{const c=pro(32);c.contract={annualMan:30000,years:3,signingBonusMan:9000,options:[{amountMan:5000}]};const planned=teamBudget(c.year,c.player.team,c);assert.equal(planned.playerCostMan,38000);c.salaryLedger.push({year:c.year,team:c.player.team,optionPaidMan:2000});const paid=teamBudget(c.year,c.player.team,c);assert.equal(paid.playerCostMan,35000);assert.equal(paid.roomMan,planned.roomMan+3000);});

test('코치 추천을 따랐을 때만 소폭의 신뢰도 보상을 받는다',()=>{const a=pro(44),b=structuredClone(a),recommended=coachRecommendation(a).index,other=(recommended+1)%6;progress(a,[recommended]);progress(b,[other]);assert.deepEqual(a.history[0].stat,b.history[0].stat);assert.equal(a.clubTrust,b.clubTrust+2);});
