import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {abilityCandidates,createCareer,draftAssessment,injuryForecast,loadCareer,saveCareer,nationalSelectionChance,overall,releaseAssessment,retirementAdviceEligible,rosterPlan,simulateSeason,visibleSalaryChange,money,awards,rng,progress,skillCaps}=await import(process.env.BASEBALL_AUDIT_ENGINE?pathToFileURL(process.env.BASEBALL_AUDIT_ENGINE):new URL('../src/engine.js',import.meta.url));

const make=(seed,role='pitch',position='선발')=>createCareer({seed,role,position,type:role==='pitch'?'제구형':'교타형',name:'감사 선수',school:'가상고',team:0});
const result={attachments:[],injuries:[],rookies:[],leagues:[],growth:[],national:[]};
if(process.argv[2])for(const year of [2028,2034,2044,2051]){
 const dir=process.argv[2],file=readdirSync(dir).find(x=>x.startsWith(`charari-naega-kiunda-${year}(`)&&x.endsWith('.json'));
 if(!file)throw Error(`${year} 첨부 저장 없음`);
 const raw=readFileSync(`${dir}/${file}`,'utf8'),c=loadCareer({getItem:()=>raw}),entry={year,sha256:createHash('sha256').update(raw).digest('hex'),phase:c.phase,rows:c.history.length};
 let packed;saveCareer(c,{setItem:(_,value)=>packed=value});const restored=loadCareer({getItem:()=>packed}),records=x=>x.history.map(row=>({year:row.year,stat:row.stat,minorStat:row.minorStat,military:row.military,awards:row.awards}));assert.deepEqual(records(restored),records(c));assert.deepEqual(restored.transactionHistory,c.transactionHistory);assert.deepEqual(restored.nationalDecisions,c.nationalDecisions);entry.roundTripSameRecords=true;
 if(year===2028)entry.draft={stored:c.lastDraft.scout.score,current:draftAssessment(c),pick:c.lastDraft.pick};
 if(year===2034){const prior=c.history.find(x=>x.year===2033),before={...c,player:{...c.player,a:prior.aAfter},history:c.history.filter(x=>x.year<2034),latest:prior.league,served:false};entry.national={decisions:c.nationalDecisions,priorStat:prior.stat,evaluations:['WBC','아시안게임'].map(name=>({name,...nationalSelectionChance(before,name,prior.stat)}))};}
 if(year===2044){const league=c.history.at(-1).league;entry.dh={players:league.players.filter(p=>p.position==='지명타자').length,stored:league.awards.find(x=>x.title==='골든글러브 · 지명타자'),recomputed:awards(league).find(x=>x.title==='골든글러브 · 지명타자')};}
 if(year===2051)entry.elder=[2048,2049].map(y=>{const row=c.history.find(x=>x.year===y),before={...c,year:y+1,age:row.age+1,reserved:true,player:{...c.player,a:row.aAfter,position:row.position,team:row.team},contract:{kind:'reserved',annualMan:row.salaryMan,left:0},latest:row.league,history:c.history.filter(x=>x.year<=y)};return {year:y,...releaseAssessment(before),retirementAdvice:retirementAdviceEligible(before)};});
 result.attachments.push(entry);
}
if(process.argv.includes('--saves-only')){console.log(JSON.stringify(result.attachments,null,2));process.exit(0);}
for(const role of ['bat','pitch'])for(const age of [18,22,30,38]){
 const bodies={},sample=10000;let injuries=0;
 for(let seed=1;seed<=sample;seed++){const c=make(seed,role);c.age=age;c.stage=age===18?'고교':age===22?'대학':'프로';const injury=injuryForecast(c);if(injury){injuries++;bodies[injury.body]=(bodies[injury.body]||0)+1;}}
 result.injuries.push({role,age,sample,injuries,bodies});
}
for(const role of ['bat','pitch']){let elite=0,opening=0;const sample=2000,ovrs=[];
 for(let seed=1;seed<=sample;seed++){const c=make(seed,role,role==='bat'?'유격수':'선발'),a=abilityCandidates(role,seed,c.player.position)[0].a;c.player.a=a;c.stage='프로';c.year=2028;c.age=19;c.lastDraft={selected:true,round:1,scout:{score:75}};c.history=[{stage:'고교',role,stat:role==='bat'?{g:25,pa:110,ab:100,h:36,bb:10,hr:5}:{g:10,gs:10,outs:180,er:15,h:45,bb:10}}];const ovr=overall(c.player);ovrs.push(ovr);elite+=Number(ovr>=65);opening+=Number(rosterPlan(c).opening==='1군');}
 result.rookies.push({role,sample,elite,opening,mean:ovrs.reduce((a,b)=>a+b,0)/sample,max:Math.max(...ovrs)});
}
for(const seed of [3,9,17]){let roster;const seasons=[];for(let year=2027;year<=2038;year++){const league=simulateSeason({seed,year,rosterState:roster});seasons.push({year,dhPlayers:league.players.filter(p=>p.position==='지명타자').length,dhCandidates:league.players.filter(p=>p.position==='지명타자'&&p.stat.pa>=297).length,missingBatPositions:league.teams.reduce((n,t)=>n+['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'].filter(pos=>!league.players.some(p=>p.team===t.id&&p.position===pos)).length,0),violations:league.rosterViolations,rookies:league.nextRoster.filter(p=>p.rookieYear===year+1).length,rosterOvr:league.nextRoster.reduce((n,p)=>n+overall(p),0)/league.nextRoster.length});roster=league.nextRoster;}result.leagues.push({seed,seasons});}
const eliteSeeds=[];for(let seed=1;eliteSeeds.length<12;seed++)if(rng(seed+3091)()<.025)eliteSeeds.push(seed);
for(const [index,seed] of [...Array.from({length:12},(_,i)=>i+1),...eliteSeeds].entries()){
 const role=index%2?'pitch':'bat',position=role==='bat'?['포수','유격수','지명타자'][index%3]:['선발','중간계투','마무리'][index%3],c=make(seed,role,position),candidate=abilityCandidates(role,seed,position)[0];c.player.a=candidate.a;c.player.type=candidate.type;c.potentialCaps=skillCaps(c.player.a,c.seed,c.potential,role);
 Object.assign(c,{stage:'프로',year:2028,age:19,reserved:true,served:true});
 const initial=overall(c.player),trajectory=[];
 c.history=[{year:2027,stage:'고교',role,stat:role==='bat'?{g:25,pa:110,ab:100,h:36,bb:10,hr:5}:{g:10,gs:10,outs:180,er:15,h:45,bb:10}}];const scout=draftAssessment(c);c.lastDraft={selected:true,round:scout.roundLow,scout};
 for(let season=0;season<10;season++){c.phase='prepare';c.pendingEvent=null;c.eventQueue=[];c.salaryPending=false;c.contract={kind:'reserved',annualMan:3300,years:1,left:1};const row=progress(c,index%4<2?[role==='bat'?1:0]:[0,1]);trajectory.push({year:c.year,overall:overall(c.player),a:[...c.player.a],g:row.stat.g,pa:row.stat.pa??0,outs:row.stat.outs??0,awards:row.awards,caps:c.player.a.filter((v,i)=>v>=c.potentialCaps[i]).length});c.year++;c.age++;}
 result.growth.push({seed,role,position,cohort:index<12?'ordinary':'rare-profile-seed',training:index%4<2?'single':'two',initial,trajectory});
}
for(const role of ['bat','pitch'])for(const quality of ['weak','strong'])for(const name of ['WBC','아시안게임']){
 let invites=0,meanChance=0;for(let seed=1;seed<=500;seed++){const c=make(seed,role,role==='bat'?'중견수':'선발');Object.assign(c,{stage:'프로',year:2034,age:25,proYears:6});c.player.a.fill(quality==='weak'?60:78);const stat=role==='bat'?{g:120,pa:500,ab:450,h:quality==='weak'?90:165,d:25,t:2,hr:quality==='weak'?5:25,bb:45,hbp:2,sf:3,rbi:70,r:75}:{g:25,gs:25,outs:450,h:quality==='weak'?185:130,bb:45,er:quality==='weak'?85:45,sv:0,hold:0,k:130};const {chance}=nationalSelectionChance(c,name,stat);meanChance+=chance;invites+=Number(rng(seed+2034*997+['WBC','아시안게임','프리미어12'].indexOf(name)*61)()<chance);}result.national.push({role,quality,name,sample:500,invites,meanChance:meanChance/500});
}
result.salary={old:money(53400),next:money(52600),change:visibleSalaryChange(53400,52600)};
result.salaryBoundary={old:money(53500),next:money(52500),change:visibleSalaryChange(53500,52500)};
console.log(JSON.stringify(result,null,2));
