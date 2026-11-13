import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as current from '../src/engine.js';
import {recoverOffseason} from '../src/health.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/salary-stagnation.json',import.meta.url)));
const baseline=process.argv.find(x=>x.startsWith('--baseline='));
const engines={after:current};if(baseline)engines.before=await import(pathToFileURL(baseline.slice(11)+'/src/engine.js'));
const mean=xs=>xs.reduce((n,x)=>n+x,0)/(xs.length||1);
const make=(E,role='pitch',position=role==='pitch'?'선발':'유격수',seed=17)=>{const c=E.createCareer({seed,name:'고정 시드 감사',school:'가상고',role,position,type:role==='pitch'?'제구형':'교타형',team:0});Object.assign(c,{stage:'프로',year:2030,age:24,proYears:2,served:true,reserved:true,potential:1});c.player.a.fill(65);c.potentialCaps.fill(85);c.contract={kind:'reserved',annualMan:3300,left:0};return c;};
const out={samples:{seeds:[3,17],roles:['유격수','선발','중간계투'],intensities:['recovery','standard','high'],years:4,seasonsPerEngine:72,description:'동일 초기 기량·프로 2년차. 매년 구단 제안 수락. 이적·FA·군복무를 제외한 통제 표본; 각 상태 전이는 회귀 테스트로 별도 확인.'},sourceSha256:fixture.sourceSha256,engines:{}};
for(const [name,E]of Object.entries(engines)){
 const attached=[],c=make(E);c.year=fixture.year;c.age=fixture.age;c.player.a=fixture.a;c.contract=fixture.contract;
 c.history=fixture.history;const currentOffer=E.salaryOffer(c);
 for(const last of fixture.history.filter(r=>!r.military&&r.stat.g)){c.year=last.year+1;c.age=last.age+1;c.history=fixture.history.filter(r=>r.year<=last.year);c.contract={kind:'reserved',annualMan:3300,left:0};attached.push({year:last.year,w:last.stat.w,ip:last.stat.outs/3,era:E.rates(last.stat,'pitch').era,oldMan:3300,offerMan:E.salaryOffer(c),actualPaidMan:last.salaryMan});}
 const careers=[],seasons=[];
 for(const position of ['유격수','선발','중간계투'])for(const intensity of ['recovery','standard','high'])for(const seed of [3,17]){
  const role=position==='유격수'?'bat':'pitch',c=make(E,role,position,seed);c.trainingPrograms=[role==='bat'?'bat-contact':'pitch-command'];c.trainingIntensity=intensity;const rows=[];
  for(let i=0;i<4;i++){
   c.phase='prepare';c.pendingEvent=null;c.eventQueue=[];c.salaryPending=true;c.tradeOffer=null;
   const decision=E.negotiateSalary(c,false),row=E.progress(c);const ps=row.postseason;
   const sample={seed,position,intensity,year:c.year,pa:row.stat.pa||0,outs:row.stat.outs||0,salary:decision.annualMan,raise:decision.annualMan-decision.oldMan,fatigue:row.fatigue??row.developmentState?.fatigue??0,injury:!!row.injury,days:row.injury?.days||0,growth:row.aAfter.map((v,j)=>v-row.aBefore[j]),psSelected:ps.selected,finalState:row.rosterCalendar.at(-1),series:ps.series?.length||0,entryErrors:(ps.series||[]).filter(s=>s.registeredIds.length>30||s.rosterAudit.some(a=>a.registered>30||a.gameEligible>28)).length};
   rows.push(sample);seasons.push(sample);c.year++;c.age++;if(name==='after')recoverOffseason(c);
  }
  careers.push({seed,position,intensity,finalSalary:rows.at(-1).salary,meanFatigue:mean(rows.map(x=>x.fatigue)),growth:Array.from({length:6},(_,i)=>rows.reduce((n,r)=>n+r.growth[i],0)),rows});
 }
 const risk=[];for(const age of [19,27,39])for(const intensity of ['recovery','standard','high']){let injuries=0;for(let seed=1;seed<=1200;seed++){const c=make(E,'pitch','선발',seed);c.age=age;c.trainingPrograms=['pitch-power'];c.trainingIntensity=intensity;injuries+=+!!E.injuryForecast(c);}risk.push({age,intensity,samples:1200,injuries});}
 out.engines[name]={attached,currentOffer,careers,risk,summary:{seasons:seasons.length,injuries:seasons.filter(x=>x.injury).length,meanSalary:mean(seasons.map(x=>x.salary)),raises:seasons.filter(x=>x.raise>0).length,freezes:seasons.filter(x=>x.raise===0).length,cuts:seasons.filter(x=>x.raise<0).length,meanFatigue:mean(seasons.map(x=>x.fatigue)),entryErrors:seasons.reduce((n,x)=>n+x.entryErrors,0),selectedFromMinor:seasons.filter(x=>x.psSelected&&x.finalState==='2군').length}};
}
console.log(JSON.stringify(out,null,2));
