import test from 'node:test';import assert from 'node:assert/strict';import {loadMarketDefenseFixture} from './fixtures/nov15-market-defense-loader.mjs';
import * as E from '../src/engine.js';import {fatigueBand,fatigueMeter} from '../src/health-ui.js';import {teamDevelopment} from '../src/team-development.js';
const fixture=loadMarketDefenseFixture();
const saved=key=>Object.assign(E.createCareer({seed:17,name:'검증',school:'가상고',role:key==='pitcher'?'pitch':'bat',position:key==='pitcher'?'선발':'유격수',team:0}),structuredClone(fixture[key].career));
const restore=c=>{let raw;E.saveCareer(c,{setItem:(_,v)=>raw=v});return E.loadCareer({getItem:()=>raw});};
const market=()=>{const c=saved('pitcher');c.phase='market';c.faDeclared=true;c.faCount=0;c.contract={kind:'reserved',annualMan:57000,left:0};return c;};
test('피로도는 경계마다 초록·노랑·빨강 3단계로 표시하며 숫자를 노출하지 않는다',()=>{
 for(const [n,key,count]of [[0,'low',1],[34.99,'low',1],[35,'medium',2],[64.99,'medium',2],[65,'high',3],[100,'high',3]]){assert.equal(fatigueBand(n).key,key);const html=fatigueMeter(n);assert.equal((html.match(/<i /g)||[]).length,3);assert.equal((html.match(/class="active"/g)||[]).length,count);assert.ok(!/\d/.test(html));assert.match(html,/role="img"/);assert.match(html,/aria-label="피로도 /);}
});
test('실제 첨부의 젊은 우수 선발에게만 실적 프리미엄을 주고 확정 계약은 보존한다',()=>{
 const c=market(),premium=E.faMarketPremium(c);assert.ok(premium>1.4&&premium<1.7);const offers=E.offers(c);assert.ok(Math.max(...offers.map(x=>x.totalMan))>600000);for(const o of offers){assert.equal(o.guaranteedMan,o.years*o.annualMan+o.signingBonusMan);assert.equal(o.totalMan,o.guaranteedMan+o.optionMan);assert.ok(o.budget.annualCostMan<=o.budget.roomMan+o.budget.playerCostMan);}
 const existing=saved('pitcher'),old=structuredClone(existing.contract);assert.deepEqual(restore(existing).contract,old);
 for(const state of [{age:40},{player:{...c.player,position:'중간계투'}}])assert.equal(E.faMarketPremium({...c,...state}),1);
 const small=market();small.history.forEach(r=>r.stat.outs=60);assert.equal(E.faMarketPremium(small),1);
 const weak=market();weak.history.forEach(r=>{r.stat.er=150;r.stat.hr=50;r.stat.bb=100;r.stat.k=40;});assert.equal(E.faMarketPremium(weak),1);
});
test('수비형 첨부는 실제 방출·자동 은퇴를 보존하고 향후 저표본 유망 수비수를 보호한다',()=>{
 const c=saved('defender');assert.equal(c.retirementReason,'재취업 시장 실패');assert.equal(restore(c).retired,true);assert.equal(E.releaseAssessment(c).developmentValue,true);assert.equal(E.releaseAssessment(c).probability,0);
 const a=saved('defender');a.age=23;a.retired=false;a.player.a.fill(35);assert.ok(E.releaseAssessment(a).probability>0);
 const established=saved('defender');established.history.slice(-3).forEach(r=>{r.stat.pa=400;r.stat.ab=370;r.stat.h=40;});assert.equal(E.releaseAssessment(established).developmentValue,false);
});
test('팀별 강점·추천은 포지션 경쟁과 상한·이동을 반영하고 캐시를 저장하지 않는다',()=>{
 const c=saved('defender'),a=teamDevelopment(c);assert.ok(a.compared>0);assert.equal(a.programs.length,2);assert.equal(a.strengths.length,2);c.latest.level='amateur';assert.equal(teamDevelopment(c).compared,0);c.latest.level='major';c.leagueRoster=[{id:'new-rookie',team:c.player.team,role:'bat',position:'유격수',a:[90,90,90,90,20,20]}];c.phase='prepare';assert.equal(teamDevelopment(c).compared,1);delete c.leagueRoster;c.phase='retired';c.latest.players=c.latest.players.filter(p=>p.team!==9);c.player.team=9;assert.equal(teamDevelopment(c).compared,0);
 c.player.team=5;for(const p of c.latest.players.filter(p=>p.team===5&&p.position==='유격수'&&p.id!=='user'))p.a=[90,90,90,90,20,20];assert.deepEqual(teamDevelopment(c).strengths,['송구','수비']);c.player.a=[50,50,50,50,80,80];c.potentialCaps=[50,50,50,50,80,80];assert.equal(teamDevelopment(c).programs.length,0);
 c.potentialCaps=[50,50,50,50,90,90];assert.ok(teamDevelopment(c).programs.every(p=>p.id==='bat-field'||p.id==='bat-running'));assert.equal('teamDevelopment' in c,false);
});
test('젊은 선수의 한 번 실패는 자동 은퇴가 아니고 연도·저장·재도전 횟수를 일관되게 처리한다',()=>{
 let c;for(let seed=1;seed<100;seed++){const x=saved('defender');Object.assign(x,{seed,retired:false,retirementReason:null,phase:'free_tryout_choice',tryoutYear:null,age:24,year:2033});if(!E.freeAgentTryout(x).success){c=x;break;}}assert.ok(c);assert.equal(c.retired,false);assert.equal(c.phase,'free_agent');assert.throws(()=>E.freeAgentTryout(c));assert.throws(()=>E.advanceJobSearch(c));E.acknowledgeEvent(c);
 const legacy=structuredClone(c);delete legacy.jobSearchStartedYear;E.advanceJobSearch(legacy);assert.equal(legacy.jobSearchStartedYear,2033);const r=restore(c),salary=E.totalSalary(r),n=r.history.length;E.advanceJobSearch(r);assert.equal(r.year,2034);assert.equal(r.age,25);assert.equal(r.history.length,n);assert.equal(E.totalSalary(r),salary);assert.throws(()=>E.advanceJobSearch(r));assert.equal(E.canContinueJobSearch({...r,age:28}),false);assert.equal(E.canContinueJobSearch({...r,year:2035}),false);
});
