import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {abilityCandidates,amateurAvailability,awards,createCareer,draftAssessment,emptyBat,emptyPitch,finishDraft,injuryForecast,loadCareer,money,nationalSelectionChance,nextYear,overall,progress,prospectProfile,publicReason,releaseAssessment,retirementAdviceEligible,rosterPlan,saveCareer,simulateSeason,visibleSalaryChange,waiverCheck} from '../src/engine.js';
import {awardBadgesHtml,noAppearanceText} from '../src/presentation.js';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/october-feedback.json',import.meta.url)));
const make=(seed=17,role='pitch',position='선발')=>createCareer({seed,role,position,type:role==='pitch'?'제구형':'교타형',name:'회귀 선수',school:'가상고',team:0});
const restore=c=>{let raw;saveCareer(c,{setItem:(_,v)=>raw=v});return loadCareer({getItem:()=>raw});};

test('첨부 2048·2049 세이브왕의 실제 역할 기여는 나이만으로 은퇴·방출되지 않는다',()=>{
 for(const year of [2048,2049]){
  const row=fixture.elder.find(x=>x.year===year),c=make();Object.assign(c,{stage:'프로',year:year+1,age:row.age+1,proYears:22,reserved:true,served:true,history:fixture.elder.filter(x=>x.year<=year),contract:{kind:'reserved',annualMan:row.salaryMan,left:0}});Object.assign(c.player,{a:row.aAfter,position:'마무리'});
  assert.equal(releaseAssessment(c).currentValue,true);assert.equal(releaseAssessment(c).probability,0);assert.equal(retirementAdviceEligible(c),false);
  const loaded=restore(c);assert.equal(retirementAdviceEligible(loaded),false);assert.deepEqual(loaded.history.at(-1).awards,['세이브왕']);
  c.phase='retirement_advice';c.pendingEvent={type:'retirement_advice',year:c.year,reason:'과거 나이 평가'};assert.notEqual(restore(c).phase,'retirement_advice');
 }
 const weak=make();Object.assign(weak,{stage:'프로',year:2049,age:40,proYears:20,reserved:true,contract:{kind:'reserved',left:0}});weak.player.a.fill(40);weak.history=Array.from({length:3},(_,i)=>({year:2046+i,stage:'프로',role:'pitch',position:'선발',stat:{...emptyPitch(),g:8,gs:8,outs:70,er:40,h:50,bb:25},awards:[]}));
 assert.ok(releaseAssessment(weak).probability>0);assert.equal(retirementAdviceEligible(weak),true);
});

test('같은 해 자유계약 영입·테스트 합격 직후에는 개막 웨이버를 다시 적용하지 않는다',()=>{
 for(const type of ['rejoin','tryout']){const c=make(4111213682);Object.assign(c,{year:2050,age:41,stage:'프로',phase:'season',proYears:22,reserved:true,contract:{kind:'reserved',left:1},transactionHistory:[{year:2050,type,success:true,newTeam:0}]});c.player.a.fill(20);assert.equal(waiverCheck(restore(c)),null);}
});

test('첨부 2034 대표팀 결정은 보존하며 부진 표본과 동보직 경쟁을 선발에 반영한다',()=>{
 const c=make(fixture.national.seed);Object.assign(c,{stage:'프로',year:2034,age:25,proYears:6,latest:{players:fixture.national.peers},nationalDecisions:fixture.national.decisions});c.player=fixture.national.player;
 for(const name of ['WBC','아시안게임'])assert.equal(nationalSelectionChance(c,name,fixture.national.stat).chance,0);
 assert.equal(restore(c).nationalDecisions['2034:아시안게임'],'수락');
 const good={...emptyPitch(),g:28,gs:28,outs:510,er:45,h:140,bb:38,k:170};c.player.a.fill(78);
 const open=nationalSelectionChance({...c,latest:null},'아시안게임',good).chance;
 const stars=Array.from({length:20},(_,i)=>({id:'p'+i,role:'pitch',position:'선발',age:24,team:i%10,a:Array(6).fill(90),stat:{...good,er:20}}));
 assert.ok(nationalSelectionChance({...c,latest:{players:stars}},'아시안게임',good).chance<open/3);
 const tiny=stars.map(p=>({...p,stat:{...good,g:1,outs:3,er:0}}));assert.equal(nationalSelectionChance({...c,latest:{players:tiny}},'아시안게임',good).chance,open);
});

test('첨부 고교 37이닝·ERA 4.86도 기량·잠재력과 함께 평가하며 나쁜 성적은 지명 가능성을 낮춘다',()=>{
 const c=make(fixture.draft.seed);c.player=fixture.draft.player;c.potential=fixture.draft.potential;c.age=19;c.year=2028;c.history=[{stage:'고교',role:'pitch',stat:fixture.draft.scout.stat}];
 const assessment=draftAssessment(c);assert.ok(assessment.probability>0&&assessment.probability<.7);assert.ok(assessment.abilityScore>assessment.formScore);assert.ok(assessment.potentialScore>50);
 c.history[0].stat={...fixture.draft.scout.stat,er:5,h:20};assert.ok(draftAssessment(c).probability>assessment.probability);
 c.phase='draft_result';c.lastDraft={selected:true};finishDraft(c);assert.equal(c.phase,'prepare');assert.equal(c.pendingEvent,null);
});

test('첨부 2044 지명타자 골든글러브는 실제 후보·OPS·점수와 일치한다',()=>{
 const league={year:2044,level:'major',games:144,teams:Array.from({length:10},(_,id)=>({id,g:144,w:72})),players:fixture.dh.players};
 const result=awards(league).find(x=>x.title==='골든글러브 · 지명타자');assert.deepEqual(result.winners,['user']);
 assert.equal(result.candidates.length,2);assert.ok(Math.abs(result.candidates[0].score-.6053941992183983)<1e-12);
 assert.deepEqual(result,fixture.dh.award);
});

test('장기 AI 로스터는 은퇴·신인 보충 뒤에도 타격 포지션을 유지한다',()=>{
 let roster;for(let year=2027;year<=2034;year++){const league=simulateSeason({seed:3,year,rosterState:roster});assert.equal(league.rosterViolations,0);for(let team=0;team<10;team++)for(const position of ['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'])assert.ok(league.nextRoster.filter(p=>p.team===team&&p.position===position).length>=2,`${year} ${team} ${position}`);roster=league.nextRoster;}
});

test('역할별 부상은 투수 팔·타자 하체에 치우치되 양쪽 모두 모든 부상이 가능하다',()=>{
 for(const age of [18,22,38]){const distributions=[];for(const role of ['bat','pitch']){const counts={};for(let seed=1;seed<=5000;seed++){const c=make(seed,role);c.age=age;c.stage=age===18?'고교':age===22?'대학':'프로';const injury=injuryForecast(c);if(injury)counts[injury.body]=(counts[injury.body]||0)+1;}assert.equal(Object.keys(counts).length,5);distributions.push(counts);}const [bat,pitch]=distributions;assert.ok(pitch['팔꿈치']>bat['팔꿈치']*3);assert.ok(bat['햄스트링']>pitch['햄스트링']*3);}
});

test('대학 부상 결장은 복무로 표시되지 않고 복귀·졸업 드래프트 및 저장을 유지한다',()=>{
 assert.match(noAppearanceText({stage:'대학',military:false,injury:{body:'무릎'}}),/부상/);assert.doesNotMatch(noAppearanceText({stage:'대학',military:false}),/복무/);
 assert.match(noAppearanceText({military:true,servicePath:'regular'}),/현역 복무/);
 const availability=amateurAvailability({startDay:80,days:60},25);assert.equal(availability[0],true);assert.equal(availability[12],false);assert.equal(availability[24],true);
 const c=make(803);Object.assign(c,{stage:'대학',year:2030,age:21,collegeSeasons:3,collegeTeam:'가상대',rehabChoice:'safe'});
 const row=progress(c);assert.ok(row.injury);assert.equal(row.stat.g,1);assert.equal(row.military,false);assert.equal(row.servicePath,null);assert.equal(c.service,0);assert.equal(row.level,'대학');
 const absence=structuredClone(c);absence.history.at(-1).stat=emptyPitch();absence.history.at(-1).league.players.find(p=>p.id==='user').stat=emptyPitch();assert.match(noAppearanceText(restore(absence).history.at(-1)),/부상/);const loaded=restore(c);assert.equal(loaded.history.at(-1).military,false);while(loaded.pendingEvent){loaded.pendingEvent=null;}nextYear(loaded);assert.equal(loaded.phase,'draft');assert.equal(loaded.stage,'대학');assert.equal(loaded.collegeSeasons,4);
});

test('타이틀은 개별 박스로 표시하고 부문·문자 이스케이프를 보존한다',()=>{
 const html=awardBadgesHtml(['타격왕','골든글러브 · 우익수','<수상>']);assert.equal((html.match(/class="award-badge"/g)||[]).length,3);assert.match(html,/<b>골든글러브·외야수<\/b>/);assert.match(html,/&lt;수상&gt;/);assert.doesNotMatch(html,/ \/ /);
 assert.equal(publicReason('최근 성적 60점 · 대체 전력 70.5 · FA 계약 중'),'최근 성적 60점 · FA 계약 중');
});

test('억원 표시는 소수점 첫째 자리이며 같은 표시 금액은 동결이다',()=>{
 assert.equal(money(53400),'5.3억');assert.equal(money(52600),'5.3억');assert.equal(money(53001),'5.3억');assert.equal(visibleSalaryChange(53400,52600).kind,'동결');assert.equal(visibleSalaryChange(53400,52600).rate,0);assert.equal(visibleSalaryChange(12000,12310).new,12000);
 assert.equal(money(53500),'5.4억');assert.equal(money(52500),'5.3억');assert.equal(visibleSalaryChange(53500,52500).old-visibleSalaryChange(53500,52500).new,1000);
});

test('슈퍼루키는 드물게 생성되고 후보 동률·신인 팀 경쟁·육성선수 제한을 지킨다',()=>{
 let elite=0;for(let seed=1;seed<=2000;seed++){const profile=prospectProfile(seed);elite+=+profile.elite;const choices=abilityCandidates('pitch',seed);assert.equal(new Set(choices.map(x=>overall({role:'pitch',position:'선발',a:x.a}))).size,1);if(profile.elite)assert.ok(profile.potential>=1.2);}
 assert.ok(elite>20&&elite<80);
 const c=make();Object.assign(c,{stage:'프로',year:2028,age:19,proYears:0,lastDraft:{selected:true,round:6,scout:{score:65}},history:[{stage:'고교',stat:{outs:120}}]});c.player.a.fill(72);assert.equal(rosterPlan(c).opening,'1군');
 const proDepth=rosterPlan(c).rival;c.latest={level:'amateur',players:[{id:'school',role:'pitch',position:'선발',team:0,a:Array(6).fill(99)}]};assert.equal(rosterPlan(c).rival,proDepth);
 c.latest={players:[{id:'rival',role:'pitch',position:'선발',team:0,a:Array(6).fill(95)}]};assert.equal(rosterPlan(c).opening,'2군');c.developmental=true;assert.equal(rosterPlan(c).opening,'2군');
});
