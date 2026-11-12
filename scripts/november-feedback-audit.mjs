import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as current from '../src/engine.js';
const baseline=process.argv.find(x=>x.startsWith('--baseline='))?.slice(11);
const engines={current};
if(baseline){
 let source=execFileSync('git',['show',`${baseline}:src/engine.js`],{encoding:'utf8'});
 source=source.replace(/(['"])(\.\/[^'"]+)\1/g,(_,quote,path)=>JSON.stringify(new URL('../src/'+path.slice(2),import.meta.url).href));
 engines.baseline=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const result={};
for(const [name,E] of Object.entries(engines)){
 const seasons=[];
 for(const seed of [11,83,313]){
  let roster=null;
  for(let i=0;i<15;i++){
   const league=E.simulateSeason({seed:seed+i,year:2030+i,rosterState:roster}),bats=league.players.filter(p=>p.role==='bat'),stat=E.sumStats(bats.map(p=>p.stat),'bat');
   seasons.push({seed,year:league.year,h200:bats.filter(p=>p.stat.h>=200).length,maxHits:Math.max(...bats.map(p=>p.stat.h)),maxPa:Math.max(...bats.map(p=>p.stat.pa)),avg:E.rates(stat,'bat').avg,decisionErrors:league.teams.filter(t=>{const pitchers=league.players.filter(p=>p.role==='pitch'&&p.team===t.id);return pitchers.reduce((n,p)=>n+p.stat.w,0)!==t.w||pitchers.reduce((n,p)=>n+p.stat.l,0)!==t.l;}).length});
   roster=league.nextRoster;
  }
 }
 result[name]={seasons:seasons.length,teamSeasons:seasons.length*10,h200:seasons.reduce((n,s)=>n+s.h200,0),meanAverage:seasons.reduce((n,s)=>n+s.avg,0)/seasons.length,maxHits:Math.max(...seasons.map(s=>s.maxHits)),meanMaxPa:seasons.reduce((n,s)=>n+s.maxPa,0)/seasons.length,decisionErrors:seasons.reduce((n,s)=>n+s.decisionErrors,0),details:seasons};
}
assert.equal(result.current.decisionErrors,0);
assert.ok(result.current.h200/result.current.seasons<=.3,'200안타 빈도 회귀');
assert.ok(result.current.meanAverage>=.25&&result.current.meanAverage<=.29,'리그 타율 범위');
console.log(JSON.stringify(result,null,2));
