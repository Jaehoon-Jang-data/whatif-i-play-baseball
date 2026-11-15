import test from'node:test';import assert from'node:assert/strict';
import*as E from'../src/engine.js';import{loadAGFixture}from'./fixtures/ag-final-roster-loader.mjs';
const make=()=>Object.assign(E.createCareer({seed:17,name:'검증',school:'가상고',role:'bat',position:'1루수',team:0}),loadAGFixture().career);
const restore=c=>{let raw;E.saveCareer(c,{setItem:(_,v)=>raw=v});return E.loadCareer({getItem:()=>raw});};
const reset=c=>{delete c.nationalDecisions['2034:아시안게임'];return c;};
test('첨부 선수는 24인 명단에 포함되면 91.81% 난수로 다시 탈락하지 않는다',()=>{
 const c=reset(make()),s=c.history.at(-1).stat,r=E.nationalSelectionChance(c,'아시안게임',s);assert.equal(r.category,'연령·연차 대상');assert.equal(r.roster.complete,true);assert.ok(r.roster.selected.some(p=>p.id==='user'));assert.equal(r.chance,1);assert.ok(Math.abs(E.rng(c.seed+c.year*997+61)()-.9181062320712954)<1e-12);
 const event=E.preSeasonNationalInvitation(c);assert.ok(event);assert.equal(event.name,'아시안게임');assert.equal(c.pendingEvent,event);assert.equal(event.sourceYear,2033);const a=c.nationalAssessments['2034:아시안게임'];assert.equal(a.invited,true);assert.equal(a.model,'final-roster-v2');assert.equal(a.chance,1);assert.equal(a.roll,null);assert.equal(a.roster.selected.length,24);
});
test('골든글러브나 미필 25세만으로 선발하지 않으며 탈락 근거도 저장한다',()=>{
 const c=reset(make());c.player.a.fill(30);c.history.at(-1).stat={...E.emptyBat(),g:100,pa:300,ab:290,h:25,hr:0,bb:10};assert.equal(E.nationalInvitation(c,'아시안게임'),null);assert.equal(c.nationalDecisions['2034:아시안게임'],'미선발');const a=c.nationalAssessments['2034:아시안게임'];assert.equal(a.invited,false);assert.ok(a.reason);assert.deepEqual(restore(c).nationalAssessments,c.nationalAssessments);const outside=reset(make());outside.age=32;assert.equal(E.nationalInvitation(outside,'아시안게임'),null);assert.equal(outside.nationalAssessments['2034:아시안게임'].category,'정책 대상 밖');assert.deepEqual(restore(outside).nationalAssessments,outside.nationalAssessments);
});
test('성인 대회 확률은 기존 수식·난수 경로를 유지한다',()=>{
 for(const name of ['WBC','프리미어12'])for(let seed=1;seed<=40;seed++){const c=make();assert.ok(Math.abs(E.nationalSelectionChance(c,name,c.history.at(-1).stat).chance-.21924151834357472)<1e-12);c.seed=seed;c.year=name==='WBC'?2034:2035;delete c.nationalDecisions[`${c.year}:${name}`];const s=c.history.at(-1).stat,r=E.nationalSelectionChance(c,name,s),roll=E.rng(c.seed+c.year*997+['WBC','아시안게임','프리미어12'].indexOf(name)*61)();assert.equal(!!E.nationalInvitation(c,name),roll<r.chance);}
});
test('초청 수락·거절·저장 왕복에서 진단을 보존하며 과거 미선발은 소급 변경하지 않는다',()=>{
 const past=make(),pastDecision=structuredClone(past.nationalDecisions),loaded=restore(past);assert.deepEqual(loaded.nationalDecisions,pastDecision);assert.equal(loaded.nationalAssessments,undefined);assert.equal(E.nationalInvitation(loaded,'아시안게임'),null);
 for(const accept of [true,false]){const c=reset(make());c.pendingEvent=E.nationalInvitation(c,'아시안게임');E.decideNationalInvitation(c,accept);const a=c.nationalAssessments['2034:아시안게임'];assert.ok(a.roster);assert.equal(a.chance,1);assert.equal(a.sourceYear,2033);const back=restore(c);assert.deepEqual(back.nationalAssessments,c.nationalAssessments);assert.equal(back.nationalDecisions['2034:아시안게임'],accept?'수락':'거절');assert.equal(back.exempt,false);}
});
test('최종 명단 선발과 1/0 초청 판단이 나이·보직·구단을 바꾼 표본에서 일치한다',()=>{
 for(const age of [23,25,28,32])for(const position of ['포수','1루수','2루수','유격수','중견수','지명타자','선발','중간계투','마무리']){const c=make();c.age=age;c.player.position=position;c.player.role=['선발','중간계투','마무리'].includes(position)?'pitch':'bat';c.player.a.fill(75);const s=c.player.role==='bat'?{...E.emptyBat(),g:130,pa:550,ab:490,h:160,hr:25,bb:55}:{...E.emptyPitch(),g:position==='선발'?28:55,gs:position==='선발'?28:0,outs:position==='선발'?480:165,er:position==='선발'?50:18,h:100,bb:30,k:150};const r=E.nationalSelectionChance(c,'아시안게임',s);if(r.roster)assert.equal(r.chance,r.roster.complete&&r.roster.selected.some(p=>p.id==='user')?1:0);}
});
