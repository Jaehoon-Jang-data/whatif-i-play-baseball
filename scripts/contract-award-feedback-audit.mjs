// Fixed seeds; original user saves are read only when --attachments is provided.
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import * as current from '../src/engine.js';
const baselineArg=process.argv.find(x=>x.startsWith('--baseline='));
const engines={after:current};
if(baselineArg){
 const ref=baselineArg.slice(11);
 if(ref.startsWith('git:')){
  const source=execFileSync('git',['show',ref.slice(4)+':src/engine.js'],{encoding:'utf8'}).replace("'./league-operations.js'",JSON.stringify(new URL('../src/league-operations.js',import.meta.url).href));
  engines.before=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 }else engines.before=await import(ref);
}
const result={attachments:[],samples:{leagues:24,years:'2028–2035',seeds:[3,17,41],offerProfiles:450,salaryCareers:90,salarySeasons:20},engines:{}};
if(process.argv.includes('--attachments')){
 const folder=homedir()+'/Downloads/',files=readdirSync(folder),needles=['2056(','2041(','2035(','2034(솔직히','2033(','2031(WBC','2028(최고의'];
 for(const needle of needles){const file=files.find(x=>x.normalize('NFC').startsWith('charari-naega-kiunda-'+needle));if(!file)continue;const c=JSON.parse(readFileSync(folder+file)),row=c.history.at(-1),out={file:file.normalize('NFC'),year:c.year,age:c.age,stored:row.awards,engines:{}};
  for(const [name,E] of Object.entries(engines)){const computed=E.awards(row.league);out.engines[name]={mvp:computed.find(x=>x.title==='정규시즌 MVP'),rookie:computed.find(x=>x.title==='신인왕'),salary:E.salaryOffer(c),tradeChance:E.automaticTradeChance(c),offers:E.offers(c).map(x=>({years:x.years,total:x.totalMan,annual:x.annualMan,reference:x.reservedReferenceMan}))};}result.attachments.push(out);
 }
}
const make=(E,seed,role,position,quality,age=28)=>{
 const c=E.createCareer({seed,name:'감사',school:'가상고',role,position,team:seed%10,type:role==='bat'?'교타형':'제구형'});Object.assign(c,{stage:'프로',phase:'market',year:2034,age,proYears:8,served:true,faDeclared:true});c.player.a.fill(quality==='star'?85:quality==='regular'?65:48);c.contract={kind:'reserved',annualMan:20000,left:0};
 const s=role==='bat'?{...E.emptyBat(),g:quality==='weak'?40:140,pa:quality==='weak'?120:600,ab:quality==='weak'?110:530,h:quality==='star'?190:quality==='regular'?150:20,d:25,t:2,hr:quality==='star'?35:quality==='regular'?15:2,bb:60,sb:10,cs:3}:position==='선발'?{...E.emptyPitch(),g:28,gs:28,outs:510,er:quality==='star'?43:quality==='regular'?80:140,k:150,h:150,bb:45,w:quality==='star'?18:10,l:7}:{...E.emptyPitch(),g:55,outs:180,er:quality==='star'?15:quality==='regular'?26:50,k:65,h:55,bb:18,sv:position==='마무리'?quality==='star'?35:20:0,hold:position==='중간계투'?20:0,w:3};
 c.history=Array.from({length:3},(_,i)=>({year:2031+i,stage:'프로',role,position,stat:structuredClone(s),awards:quality==='star'?['정규시즌 MVP',role==='bat'?'홈런왕':'평균자책점왕']:[]}));return c;
};
for(const [name,E] of Object.entries(engines)){
 const out={leagues:[],offers:{},salary:[],trades:[],national:[]};let roster;
 for(const seed of result.samples.seeds){roster=null;for(let year=2028;year<=2035;year++){const league=E.simulateSeason({seed,year,rosterState:roster});roster=league.nextRoster;const mvp=league.players.find(p=>p.id===league.awards.find(a=>a.title==='정규시즌 MVP').winners[0]);out.leagues.push({seed,year,mvpRole:mvp.role,mvpPosition:mvp.position,rookieAge:league.players.find(p=>p.id===league.awards.find(a=>a.title==='신인왕').winners[0])?.age,rosterViolations:league.rosterViolations});}}
 for(const age of [27,33,38,42,47]){const values=[],annual=[];let overBudget=0;for(const [role,position] of [['bat','유격수'],['pitch','선발'],['pitch','마무리']])for(const quality of ['star','regular','weak'])for(let seed=1;seed<=10;seed++){const c=make(E,seed,role,position,quality,age);for(const o of E.offers(c)){values.push(o.totalMan);annual.push(o.annualMan);overBudget+=+(o.budget.annualCostMan>o.budget.roomMan+o.budget.playerCostMan);}}values.sort((a,b)=>a-b);annual.sort((a,b)=>a-b);out.offers[age]={n:values.length,min:values[0],median:values[Math.floor(values.length/2)],max:values.at(-1),medianAnnual:annual[Math.floor(annual.length/2)],overBudget};}
 for(const [role,position] of [['bat','유격수'],['pitch','선발'],['pitch','마무리']])for(const quality of ['star','regular','weak'])for(let seed=1;seed<=10;seed++){const c=make(E,seed,role,position,quality);c.phase='prepare';c.contract.annualMan=3300;let max=0;for(let i=0;i<20;i++){c.salaryPending=true;E.negotiateSalary(c,false);max=Math.max(max,c.contract.annualMan);c.year++;c.age++;}out.salary.push({role,position,quality,seed,final:c.contract.annualMan,max});}
 for(const quality of ['star','regular','weak']){let mean=0,faMean=0,trades=0;for(let seed=1;seed<=10000;seed++){const c=make(E,seed,'pitch','선발',quality);const chance=E.automaticTradeChance(c);mean+=chance;trades+=+(E.rng(seed+c.year*991+61)()<chance);c.contract={kind:'fa',left:3};faMean+=E.automaticTradeChance(c);}out.trades.push({quality,n:10000,meanChance:mean/10000,actual:trades,faMean:faMean/10000});}
 for(const age of [21,25,27,30])for(const tournament of ['WBC','아시안게임'])for(const quality of ['star','regular','weak']){let mean=0,invites=0;for(let seed=1;seed<=1000;seed++){const c=make(E,seed,'pitch','선발',quality,age);c.proYears=age-19;const e=E.nationalSelectionChance(c,tournament,c.history.at(-1).stat);mean+=e.chance;invites+=+(E.rng(seed+c.year*997+['WBC','아시안게임'].indexOf(tournament)*61)()<e.chance);}out.national.push({age,tournament,quality,n:1000,mean:mean/1000,invites});}
 result.engines[name]=out;
}
console.log(JSON.stringify(result,null,2));
