import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCareer,awards,offers,salaryOffer,negotiateSalary,automaticTradeChance,nationalSelectionChance,nationalInvitation,saveCareer,loadCareer,emptyPitch,money,visibleSalaryChange,settleSalary,teamBudget,simulateSeason,rng} from '../src/engine.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/contract-award-feedback.json',import.meta.url)));
const expand=l=>({...structuredClone(l),players:l.players.map(row=>Object.fromEntries(fixture.playerFields.filter((k,i)=>row[i]!==null).map(k=>[k,structuredClone(row[fixture.playerFields.indexOf(k)])])))});
const saved=year=>{const f=fixture.cases[year].career,c=Object.assign(createCareer(f.player),structuredClone(f));c.history.at(-1).league=expand(fixture.leagues[f.leagueYear]);c.latest=c.history.at(-1).league;return c;};
const restore=c=>{let raw;saveCareer(c,{setItem:(_,v)=>raw=v});return loadCareer({getItem:()=>raw});};
test('합성 우수 투수 3개 시즌은 투타 공통 평가에서 MVP 경쟁력을 갖는다',()=>{
 for(const year of [2033,2034,2041]){const c=saved(year),l=c.latest,computed=awards(l);assert.deepEqual(computed.find(x=>x.title==='정규시즌 MVP').winners,['user']);assert.deepEqual(c.history.at(-1).awards,fixture.cases[year].career.history.at(-1).awards);}
 const l=saved(2041).latest,p=l.players.find(x=>x.id==='user');p.stat.er=100;assert.notDeepEqual(awards(l).find(x=>x.title==='정규시즌 MVP').winners,['user']);
 const batter=l.players.find(x=>x.role==='bat'&&x.stat.pa>500);Object.assign(batter.stat,{h:300,ab:600,pa:700,d:55,t:5,hr:65,bb:95});assert.deepEqual(awards(l).find(x=>x.title==='정규시즌 MVP').winners,[batter.id]);
});
test('합성 신인왕의 무작위 34세 후보를 제외하고 실제 루키 성적을 비교한다',()=>{
 const c=saved(2028),old=c.latest.awards.find(x=>x.title==='신인왕');assert.equal(c.latest.players.find(p=>p.id===old.winners[0]).age,34);
 const a=awards(c.latest).find(x=>x.title==='신인왕');assert.deepEqual(a.winners,['user']);assert.ok(!a.candidates.some(x=>x.id===old.winners[0]));
 const late=c.latest.players.find(p=>p.id===old.winners[0]);late.rookieYear=2028;late.priorPa=0;late.priorOuts=0;
 assert.ok(awards(c.latest).find(x=>x.title==='신인왕').candidates.some(x=>x.id===late.id),'공식 자격에는 나이 상한을 만들지 않는다');
 late.priorPa=61;assert.ok(!awards(c.latest).find(x=>x.title==='신인왕').candidates.some(x=>x.id===late.id));
 const league=simulateSeason({seed:9917,year:2028,games:6});assert.ok(league.players.filter(p=>p.rookie).every(p=>p.rookieYear===2028&&p.age<=24));
});
test('합성 47세 계약은 복리 연봉을 FA 하한으로 승계하지 않고 예산 안에서 단년 제안한다',()=>{
 const c=saved(2056),before=structuredClone(c.contract),os=offers(c);assert.equal(before.annualMan,900000);assert.ok(salaryOffer(c)<20000);assert.equal(os.length,3);
 for(const o of os){assert.equal(o.years,1);assert.ok(o.totalMan<20000);assert.ok(o.annualMan>o.reservedReferenceMan);assert.equal(o.guaranteedMan,o.annualMan*o.years+o.signingBonusMan);assert.equal(o.totalMan,o.guaranteedMan+o.optionMan);assert.ok(o.budget.annualCostMan<=o.budget.roomMan+o.budget.playerCostMan);}
 assert.deepEqual(c.contract,before);assert.equal(restore(c).contract.annualMan,before.annualMan,'이전 확정 계약·실제 지급액은 재작성하지 않는다');assert.deepEqual(offers(restore(c)),os);
 assert.equal(teamBudget(2056,0).capMan,teamBudget(2028,0).capMan);
});
test('우수 성적이 반복되어도 보류 연봉은 장기 복리로 폭증하지 않는다',()=>{
 for(const position of ['선발','마무리']){const c=saved(2041);Object.assign(c,{phase:'prepare',age:28,year:2034});c.player.position=position;c.contract={kind:'reserved',annualMan:3300,left:0};for(let i=0;i<20;i++){c.salaryPending=true;negotiateSalary(c,false);assert.ok(c.contract.annualMan<=180000);assert.equal(c.salaryDecision.annualMan,c.contract.annualMan);c.age++;c.year++;}assert.ok(c.contract.annualMan<50000);}
});
test('표시 금액이 같으면 연봉 증감을 동결하고 실제 확정액도 이전 금액을 유지한다',()=>{
 assert.equal(money(18500),'1.9억');assert.equal(money(18700),'1.9억');assert.deepEqual(visibleSalaryChange(18500,18700),{old:19000,new:19000,rate:0,kind:'동결'});assert.equal(settleSalary(18500,18700),18500);assert.equal(settleSalary(18500,19499),18500);assert.equal(settleSalary(18500,19500),20000);
 const c=saved(2033);c.phase='prepare';c.salaryPending=true;c.contract.annualMan=34000;const old=c.contract.annualMan,result=negotiateSalary(c,false);if(money(old)===money(result.annualMan))assert.equal(result.annualMan,old);assert.equal(result.annualMan,c.contract.annualMan);assert.equal(restore(c).salaryDecision.annualMan,result.annualMan);
});
test('합성 핵심 선수의 자동 트레이드 확률은 비주전보다 훨씬 낮고 기존 이력은 보존한다',()=>{
 const star=saved(2035),weak=structuredClone(star);weak.player.a.fill(45);weak.history=weak.history.map(r=>({...r,awards:[],stat:emptyPitch()}));assert.ok(automaticTradeChance(star)<.001);assert.ok(automaticTradeChance(star)<automaticTradeChance(weak)/20);
 const fa=structuredClone(star);fa.contract={kind:'fa',left:3};assert.ok(automaticTradeChance(fa)<automaticTradeChance(star)/10);assert.deepEqual(restore(star).transactionHistory,star.transactionHistory);
});
test('합성 대표팀 판단은 2030년의 전년 기록과 서로 다른 추첨이며 나이·연차 경계를 구분한다',()=>{
 const c=saved(2031),source=c.selectionSource;Object.assign(c,{year:2030,age:21,proYears:2,latest:expand(source.league)});c.player={...c.player,a:source.player.a};c.history=c.history.filter(r=>r.year<2030);
 const wbc=nationalSelectionChance(c,'WBC',source.stat),ag=nationalSelectionChance(c,'아시안게임',source.stat);assert.ok(wbc.chance>0&&ag.chance>0);assert.equal(ag.category,'연령·연차 대상');assert.ok(rng(c.seed+2030*997)()<wbc.chance);assert.ok(rng(c.seed+2030*997+61)()>ag.chance);assert.equal(c.nationalDecisions['2030:WBC'],'수락');assert.equal(c.nationalDecisions['2030:아시안게임'],'미선발');
 c.age=30;c.proYears=4;assert.equal(nationalSelectionChance(c,'아시안게임',source.stat).chance,0);c.proYears=3;assert.equal(nationalSelectionChance(c,'아시안게임',source.stat).category,'연령·연차 대상');
 assert.deepEqual(restore(saved(2031)).nationalDecisions,saved(2031).nationalDecisions);
});
