import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import * as current from '../src/engine.js';
const engines={after:current},base=process.argv.find(x=>x.startsWith('--baseline='));
if(base){
 const oldOperations='data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show',base.slice(11)+':src/league-operations.js'],{encoding:'utf8'})).toString('base64');
 let source=execFileSync('git',['show',base.slice(11)+':src/engine.js'],{encoding:'utf8'}).replace("'./league-operations.js'",JSON.stringify(oldOperations));
 const originalSource=source;
 // Observation only: no RNG draws or decisions added to the old engine.
 source="import {assignBullpenRoles as auditRoles} from "+JSON.stringify(new URL('../src/bullpen.js',import.meta.url).href)+";\n"+source;
 source=source.replace('rosterState=null,playerTrade=false})','rosterState=null,playerTrade=false,recordPitching=false})').replace('const players=[],teams=','const pitchingLog=[],players=[],teams=');
 source=source.replace('function game(at,home,day,competition=null){let','function game(at,home,day,competition=null){const calendarDay=Math.floor(Date.parse(seasonDate(year,day,games))/86400000);let');
 source=source.replace(' const chooseReliever=(side,inning)=>',' const auditMaps=arms.map(row=>auditRoles(row.slice(5),p=>readiness(p)+(p.stat.g>=12?clamp((4.5-rates(p.stat,\'pitch\').era)*2,-4,4):0))),oldHolds=new Map(arms.flat().map(p=>[p.id,p.stat.hold]));\n const chooseReliever=(side,inning)=>');
 source=source.replace('{p,outs:0,r:0,batters:0,entry,exit:entry}','{p,outs:0,r:0,batters:0,pitches:0,inning:inn,entry,exit:entry}').replace('let u=random();','let u=random();used[defense].get(p.id).pitches+=u<walk+strike?5:3;');
 const marker='\n }\n // Circle scheduling:';
 if(!source.includes(marker))throw Error('지원하지 않는 기준 코드 구조');
 source=source.replace(marker,"\n if(recordPitching)for(const side of [0,1])for(const v of used[side].values())pitchingLog.push({id:v.p.id,team:tt[side].id,day,date:seasonDate(year,day,games),calendarDay,inning:v.inning,role:v.p===starters[side]?'선발':auditMaps[side].get(v.p.id)||'롱릴리프',reason:'legacy',started:v.p===starters[side],entry:v.entry,exit:v.exit,outs:v.outs,pitches:v.pitches,hold:v.p.stat.hold>(oldHolds.get(v.p.id)||0),teamWon:scores[side]>scores[1-side]});"+marker);
 source=source.replace('const result={year,games,environment,level,competitions,players,teams:','const result={year,games,environment,level,competitions,players,...(recordPitching?{pitchingLog}:{}),teams:');
 engines.before=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const plain=await import('data:text/javascript;base64,'+Buffer.from(originalSource).toString('base64'));
 const before=plain.simulateSeason({seed:3,year:2028}),observed=engines.before.simulateSeason({seed:3,year:2028,recordPitching:true});
 if(JSON.stringify(before.players.map(p=>p.stat))!==JSON.stringify(observed.players.map(p=>p.stat)))throw Error('기준 코드 계측이 경기 결과를 바꿨습니다.');
}
function summary(l){
 const hist=new Map(),a={holds:l.players.reduce((n,p)=>n+(p.stat.hold||0),0),maxHolds:Math.max(...l.players.map(p=>p.stat.hold||0)),reliefAppearances:0,threeDays:0,heavyRest:0,weeklyOver100:0,max7DayPitches:0,nonCloseCore:0,coreUses:0,maintenance:0,emergencyCore:0,nonWinningTeamHolds:0,maxReliefGames:Math.max(...l.players.filter(p=>p.role==='pitch'&&!p.stat.gs).map(p=>p.stat.g)),roles:{},teamRoles:{},rosterViolations:l.rosterViolations};
 for(const e of l.pitchingLog){const old=hist.get(e.id)||[],prior=old.at(-1),recent=old.filter(x=>x.calendarDay>=e.calendarDay-6),week=e.pitches+recent.reduce((n,x)=>n+x.pitches,0);
  if(!e.started){a.reliefAppearances++;a.threeDays+=+(old.some(x=>x.calendarDay===e.calendarDay-1)&&old.some(x=>x.calendarDay===e.calendarDay-2));a.heavyRest+=+Boolean(prior&&e.calendarDay-prior.calendarDay<=(prior.pitches>=45?2:prior.pitches>=30?1:0));a.weeklyOver100+=+(week>100);a.max7DayPitches=Math.max(a.max7DayPitches,week);a.roles[e.role]=(a.roles[e.role]||0)+1;const team=a.teamRoles[e.team]??={};team[e.role]=(team[e.role]||0)+1;
   const core=['필승조','마무리'].includes(e.role),tight=e.inning>=6&&e.entry>=0&&e.entry<=3||e.inning>=7&&e.entry===-1;a.coreUses+=+core;if(core&&!tight){a.nonCloseCore++;a.maintenance+=+(e.reason==='점검 등판');a.emergencyCore+=+(e.reason==='가용 투수 대체');}if(e.hold&&e.teamWon===false)a.nonWinningTeamHolds++;
  }recent.push(e);hist.set(e.id,recent);
 }
 return a;
}
const result={samples:{seeds:[3,17,41],years:[2028,2029,2030,2031],leagueSeasonsPerEngine:12,profilesPerEngine:18},engines:{},saves:[]};
for(const [name,E]of Object.entries(engines)){
 const out={leagues:[],profiles:[]};for(const seed of [3,17,41]){let roster;for(let year=2028;year<=2031;year++){const l=E.simulateSeason({seed,year,rosterState:roster,recordPitching:true});out.leagues.push({seed,year,...summary(l)});roster=l.nextRoster;}}
 for(const position of ['중간계투','마무리'])for(const ability of [50,70,85])for(const seed of [3,17,41]){const pos=position,l=E.simulateSeason({seed,year:2034,recordPitching:true,player:{role:'pitch',position:pos,team:0,a:Array(6).fill(ability),opportunity:1,name:'가상 투수'}}),p=l.players.find(p=>p.id==='user');out.profiles.push({position:pos,ability,seed,stat:p.stat,...summary(l)});}
 result.engines[name]=out;
}
for(const arg of process.argv.filter(x=>x.startsWith('--save='))){const raw=readFileSync(arg.slice(7),'utf8'),o={};for(const [name,E]of Object.entries(engines)){const c=E.loadCareer({getItem:()=>raw});o[name]={year:c.year,phase:c.phase,control:c.player.a[1],cap:c.potentialCaps[1]};if(c.phase==='prepare'){c.salaryPending=false;c.pendingEvent=null;c.eventQueue=[];const row=E.progress(c);o[name].nextSeason={g:row.stat.g,ip:row.stat.outs/3,holds:row.stat.hold};}}result.saves.push(o);}
console.log(JSON.stringify(result,null,2));
