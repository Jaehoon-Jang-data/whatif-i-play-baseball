import {execFileSync} from 'node:child_process';
import * as after from '../src/engine.js';
import {PROGRAMS} from '../src/training-programs.js';
import {expectedContribution} from '../src/player-value.js';
import {seasonWAR,warSnapshot} from '../src/war.js';
const baseline=process.argv.find(x=>x.startsWith('--baseline=')),engines={after};
if(baseline){const ref=baseline.slice(11),ops='data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show',ref+':src/league-operations.js'],{encoding:'utf8'})).toString('base64');let source=execFileSync('git',['show',ref+':src/engine.js'],{encoding:'utf8'}).replace(/(['"])\.\/league-operations\.js[^'"]*\1/,JSON.stringify(ops));source=source.replace(/(['"])(\.\/[^'"]+)\1/g,(_,q,path)=>JSON.stringify(new URL('../src/'+path.slice(2),import.meta.url).href));engines.before=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const focus={bat:[[0,1],[1],[2,0],[4,5],[3],[]],pitch:[[0,2],[1],[4],[3],[2,4],[3,5]]};
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
function career(E,role,seed){const c=E.createCareer({seed,name:'훈련 감사',school:'가상고',role,position:role==='bat'?'유격수':'선발',type:role==='bat'?'교타형':'제구형',team:0});Object.assign(c,{stage:'프로',year:2030,age:22,proYears:1,served:true,reserved:true,potential:1,phase:'prepare'});c.player.a=seed===77?Array(6).fill(45):seed===41?(role==='bat'?[77,56,62,62,58,57]:[77,58,62,57,59,59]):Array(6).fill(62);c.potentialCaps=E.skillCaps(c.player.a,seed,1,role);return c;}
if(process.argv.includes('--roles')){
 const rows=[];
 for(const [role,position,ids]of [['bat','포수',['bat-field','bat-contact','bat-condition']],['bat','지명타자',['bat-power','bat-contact','bat-condition']],['bat','중견수',['bat-running','bat-field','bat-contact']],['pitch','중간계투',['pitch-bullpen','pitch-command','pitch-condition']],['pitch','마무리',['pitch-bullpen','pitch-command','pitch-condition']]])for(const id of ids)for(const seed of [17,41]){
  const c=career(after,role,seed);c.player.position=position;const seasons=[];
  for(let i=0;i<3;i++){c.phase='prepare';c.pendingEvent=null;c.eventQueue=[];c.salaryPending=false;c.tradeOffer=null;c.contract={kind:'reserved',annualMan:3300,left:1};const row=after.progress(c,[id]);seasons.push({year:row.year,stat:row.stat,minorStat:row.minorStat,war:seasonWAR(row).value,style:c.player.type,delta:row.aAfter.map((v,i)=>v-row.aBefore[i])});Object.assign(row,warSnapshot(row));delete row.league;delete row.minorLeague;c.year++;c.age++;}
  rows.push({role,position,program:id,seed,seasons});
 }
 console.log(JSON.stringify({careers:rows.length,seasons:rows.length*3,rows},null,2));process.exit(0);
}
const result={samples:{seeds:[3,17,41,77],startAge:22,years:10,careersPerEngine:64,seasonCountPerEngine:640,annualContractAndEvents:'경기·성장 감사용 자동 처리; 계약·입대·완주율 감사 아님'},engines:{}};
for(const [name,E]of Object.entries(engines)){
 const cases=[];
 for(const role of ['bat','pitch'])for(let choice=0;choice<8;choice++)for(const seed of [3,17,41,77]){
  const c=career(E,role,seed),start=[...c.player.a],seasons=[];for(let year=0;year<10;year++){
   c.phase='prepare';c.pendingEvent=null;c.eventQueue=[];c.salaryPending=false;c.tradeOffer=null;c.contract={kind:'reserved',annualMan:3300,left:1};
   const index=choice===6?year%6:choice===7?0:choice,selected=choice===7?(name==='after'?(role==='bat'?['bat-contact','bat-field']:['pitch-command','pitch-endurance']):(role==='bat'?[0,4]:[1,3])):name==='after'?[PROGRAMS[role][index].id]:focus[role][index];
   const row=E.progress(c,selected),war=seasonWAR(row);seasons.push({year:row.year,majorG:row.stat.g,minorG:row.minorStat.g,pa:row.stat.pa||0,outs:row.stat.outs||0,hr:row.stat.hr,k:row.stat.k,bb:row.stat.bb,sb:row.stat.sb||0,war:war.value,injuryDays:row.injury?.days||0,efficiency:row.trainingEfficiency??1,style:c.player.type,delta:row.aAfter.map((v,i)=>v-row.aBefore[i]),caps:row.aAfter.filter((v,i)=>v>=c.potentialCaps[i]).length});
   Object.assign(row,warSnapshot(row));delete row.league;delete row.minorLeague;c.year++;c.age++;
  }
  cases.push({role,program:choice===6?'rotation':choice===7?'balancedPair':PROGRAMS[role][choice].id,seed,delta:c.player.a.map((v,i)=>v-start[i]),majorSeasons:seasons.filter(x=>role==='bat'?x.pa>=350:x.outs>=300).length,totalWar:seasons.reduce((n,x)=>n+(x.war||0),0),injuries:seasons.filter(x=>x.injuryDays>0).length,styles:[...new Set(seasons.map(x=>x.style))],startA:start,startOVR:E.overall({...c.player,a:start}),finalProjectedWar:expectedContribution(c.player).projectedWar,seasons});
 }
 const summaries=[];for(const role of ['bat','pitch'])for(const program of [...PROGRAMS[role].map(p=>p.id),'rotation','balancedPair']){const rows=cases.filter(x=>x.role===role&&x.program===program),ss=rows.flatMap(x=>x.seasons);summaries.push({role,program,delta:Array.from({length:6},(_,i)=>mean(rows.map(x=>x.delta[i]))),meanMajorSeasons:mean(rows.map(x=>x.majorSeasons)),meanCareerWar:mean(rows.map(x=>x.totalWar)),meanFinalProjectedWar:mean(rows.map(x=>x.finalProjectedWar)),injurySeasons:ss.filter(x=>x.injuryDays>0).length,meanFinalEfficiency:mean(rows.map(x=>x.seasons.at(-1).efficiency)),meanPa:mean(ss.map(x=>x.pa)),meanOuts:mean(ss.map(x=>x.outs)),meanHr:mean(ss.map(x=>x.hr)),meanSb:mean(ss.map(x=>x.sb)),meanK:mean(ss.map(x=>x.k)),meanBb:mean(ss.map(x=>x.bb)),maxCaps:Math.max(...ss.map(x=>x.caps)),styles:[...new Set(rows.flatMap(x=>x.styles))]});}
 const injury=[];for(const role of ['bat','pitch'])for(const age of [19,27,35])for(const condition of ['heavy','recovery']){let count=0;for(let seed=1;seed<=1200;seed++){const c=career(E,role,seed);c.age=age;if(name==='after')c.trainingPrograms=[role==='bat'?condition==='heavy'?'bat-power':'bat-condition':condition==='heavy'?'pitch-power':'pitch-condition'];count+=+!!E.injuryForecast(c);}injury.push({role,age,condition,injuries:count,samples:1200});}
 result.engines[name]={summaries,injury,cases};
}
console.log(JSON.stringify(result,null,2));
