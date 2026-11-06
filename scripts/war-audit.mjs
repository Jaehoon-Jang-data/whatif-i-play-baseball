import {execFileSync} from 'node:child_process';
import * as E from '../src/engine.js';
import {seasonWAR,leagueWarContext,teamWarReport} from '../src/war.js';
const baseline=process.argv.find(x=>x.startsWith('--baseline='));let old;
if(baseline){let source=execFileSync('git',['show',`${baseline.slice(11)}:src/engine.js`],{encoding:'utf8'});source=source.replaceAll(/(['"])(\.\/[^'"]+)\1/g,(_,q,path)=>JSON.stringify(new URL('../src/'+path.slice(2),import.meta.url).href));old=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const leagues=[],allTeams=[],profiles=[];let unchanged=0;
for(const seed of [3,17,41])for(const [year,environment]of [[2028,.85],[2030,1],[2033,1.15]]){
 const l=E.simulateSeason({seed,year,environment}),ctx=leagueWarContext(l),teams=teamWarReport(l);allTeams.push(...teams);
 if(old){const before=old.simulateSeason({seed,year,environment});if(JSON.stringify(before.players.map(p=>p.stat))!==JSON.stringify(l.players.map(p=>p.stat)))throw Error('WAR 계측이 원기록을 변경했습니다.');unchanged++;}
 const values=l.players.map(p=>({role:p.role,value:seasonWAR({...p,year,warUsage:p.warUsage},{context:ctx}).value})),worst=[...teams].sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap))[0],team=l.teams.find(t=>t.id===worst.team),pythag=team.g*team.r**1.83/(team.r**1.83+team.ra**1.83);
 const arms=l.players.filter(p=>p.role==='pitch'&&p.team===worst.team),ip=arms.reduce((n,p)=>n+p.stat.outs/3,0),fipRuns=arms.reduce((n,p)=>n+(13*p.stat.hr+3*p.stat.bb-2*p.stat.k+ctx.fipConstant*p.stat.outs/3)/9,0);
 leagues.push({seed,year,environment,ra9:ctx.ra9,runsPerWin:ctx.runsPerWin,totalWar:teams.reduce((n,t)=>n+t.war,0),batRange:[Math.min(...values.filter(p=>p.role==='bat').map(p=>p.value)),Math.max(...values.filter(p=>p.role==='bat').map(p=>p.value))],pitchRange:[Math.min(...values.filter(p=>p.role==='pitch').map(p=>p.value)),Math.max(...values.filter(p=>p.role==='pitch').map(p=>p.value))],worstTeam:{...worst,r:team.r,ra:team.ra,pythagWins:pythag,actualRa9:team.ra*9/ip,fipRuns,fipRa9:fipRuns*9/ip}});
}
for(const [role,position]of [['bat','유격수'],['bat','지명타자'],['bat','포수'],['pitch','선발'],['pitch','중간계투'],['pitch','마무리']])for(const ability of [55,75,90]){
 const l=E.simulateSeason({seed:17,year:2030,player:{name:'WAR 감사',role,position,team:0,a:Array(6).fill(ability),opportunity:1}}),p=l.players.find(x=>x.id==='user'),war=seasonWAR({...p,year:2030,league:l});profiles.push({role,position,ability,stat:p.stat,war});
}
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length,mw=mean(allTeams.map(t=>t.wins)),me=mean(allTeams.map(t=>t.estimatedWins)),cov=allTeams.reduce((n,t)=>n+(t.wins-mw)*(t.estimatedWins-me),0),correlation=cov/Math.sqrt(allTeams.reduce((n,t)=>n+(t.wins-mw)**2,0)*allTeams.reduce((n,t)=>n+(t.estimatedWins-me)**2,0));
console.log(JSON.stringify({samples:{leagueSeasons:leagues.length,teamSeasons:allTeams.length,playerSeasons:profiles.length,unchangedBaselineSeasons:unchanged},teamSummary:{meanAbsoluteGap:mean(allTeams.map(t=>Math.abs(t.gap))),maxAbsoluteGap:Math.max(...allTeams.map(t=>Math.abs(t.gap))),correlation},leagues,profiles},null,2));
