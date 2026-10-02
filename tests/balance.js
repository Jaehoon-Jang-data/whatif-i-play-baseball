import {writeFileSync} from 'node:fs';
import {simulateSeason,rates,progress,createCareer,sumStats,qualification} from '../src/engine.js';

const pitcherUnearned=s=>s.players.filter(p=>p.role==='pitch').reduce((n,p)=>n+p.stat.r-p.stat.er,0);
const mean=rows=>rows.reduce((n,x)=>n+x,0)/rows.length;
const spread=rows=>{const sorted=[...rows].sort((a,b)=>a-b);return {mean:Number(mean(rows).toFixed(3)),p10:sorted[Math.floor((sorted.length-1)*.1)],p90:sorted[Math.floor((sorted.length-1)*.9)]};};
const corr=(rows,a,b)=>{const ma=mean(rows.map(x=>x[a])),mb=mean(rows.map(x=>x[b]));const num=rows.reduce((n,x)=>n+(x[a]-ma)*(x[b]-mb),0),va=rows.reduce((n,x)=>n+(x[a]-ma)**2,0),vb=rows.reduce((n,x)=>n+(x[b]-mb)**2,0);return Number((num/Math.sqrt(va*vb)).toFixed(3));};
const league=[],qualifiedBat=[],fielding=[];
for(let seed=1;seed<=100;seed++){
  const s=simulateSeason({seed,year:2028}),bat=s.players.filter(p=>p.role==='bat'),qualified=bat.filter(p=>p.stat.pa>=qualification(s.games,'bat'));
  fielding.push({errors:bat.reduce((n,p)=>n+p.stat.e,0),chances:bat.reduce((n,p)=>n+p.stat.ch,0),unearned:pitcherUnearned(s)});
  qualifiedBat.push(...qualified.map(p=>({h:p.stat.h,hr:p.stat.hr,pa:p.stat.pa,ops:rates(p.stat,'bat').ops})));
  const total=bat.reduce((acc,p)=>{for(const k of ['pa','ab','h','bb','hbp','sf','d','t','hr'])acc[k]=(acc[k]||0)+p.stat[k];return acc;},{});
  const pitchers=s.players.filter(p=>p.role==='pitch'),pitch=sumStats(pitchers.map(p=>p.stat),'pitch'),starters=s.players.filter(p=>p.position==='선발'),middle=s.players.filter(p=>p.position==='중간계투'),closers=s.players.filter(p=>p.position==='마무리');
  league.push({avg:rates(total,'bat').avg,obp:rates(total,'bat').obp,slg:rates(total,'bat').slg,ops:rates(total,'bat').ops,qualifiedHits:mean(qualified.map(p=>p.stat.h)),hits200:bat.filter(p=>p.stat.h>=200).length,topHits:Math.max(...bat.map(p=>p.stat.h)),topHR:Math.max(...bat.map(p=>p.stat.hr)),era:rates(pitch,'pitch').era,whip:rates(pitch,'pitch').whip,k9:pitch.k*27/pitch.outs,bb9:pitch.bb*27/pitch.outs,starterIP:mean(starters.map(p=>p.stat.outs/3)),topStarterIP:Math.max(...starters.map(p=>p.stat.outs/3)),starterGSRange:Math.max(...starters.map(p=>p.stat.gs))-Math.min(...starters.map(p=>p.stat.gs)),middleG:mean(middle.map(p=>p.stat.g)),topHolds:Math.max(...middle.map(p=>p.stat.hold)),closerG:mean(closers.map(p=>p.stat.g)),topSaves:Math.max(...closers.map(p=>p.stat.sv))});
}
const roles=[['bat','중견수'],['pitch','선발'],['pitch','중간계투'],['pitch','마무리']];
const player=[];
for(const ability of [25,45,65,85])for(const [role,position] of roles){const rows=[];for(let seed=1;seed<=30;seed++){
  const s=simulateSeason({seed,year:2028,player:{name:'검증',role,position,team:0,a:Array(6).fill(ability),opportunity:1}}),stat=s.players.find(p=>p.id==='user').stat;
  rows.push(role==='bat'?{g:stat.g,h:stat.h,hr:stat.hr,ops:rates(stat,role).ops}:{g:stat.g,gs:stat.gs,ip:stat.outs/3,era:rates(stat,role).era,whip:rates(stat,role).whip,sv:stat.sv,hold:stat.hold});
}player.push({ability,role,position,stats:Object.fromEntries(Object.keys(rows[0]).map(k=>[k,spread(rows.map(x=>x[k]))]))});}
const career=[];
for(const ability of [35,55,75])for(const role of ['bat','pitch']){const rows=[];for(let seed=1;seed<=20;seed++){
  const c=createCareer({seed,name:'검증',school:'검증고',role,position:role==='bat'?'중견수':'선발',type:role==='bat'?'교타형':'선발형',team:0});c.stage='프로';c.phase='prepare';c.player.a.fill(ability);c.contract={kind:'reserved',annualMan:3300,left:1};const row=progress(c);rows.push({majorG:row.stat.g,minorG:row.minorStat.g,majorH:row.stat.h||0,minorH:row.minorStat.h||0,majorHitsPerGame:role==='bat'&&row.stat.g?row.stat.h/row.stat.g:0,minorHitsPerGame:role==='bat'&&row.minorStat.g?row.minorStat.h/row.minorStat.g:0,majorAVG:role==='bat'?rates(row.stat,role).avg:0,minorAVG:role==='bat'?rates(row.minorStat,role).avg:0});
}career.push({ability,role,stats:Object.fromEntries(Object.keys(rows[0]).map(k=>[k,spread(rows.map(x=>x[k]))]))});}
const result={generatedAt:'deterministic seeds 1–100 / 1–30 / 1–20',league:Object.fromEntries(Object.keys(league[0]).map(k=>[k,spread(league.map(x=>x[k]))])),qualifiedBat:{count:qualifiedBat.length,hits:spread(qualifiedBat.map(x=>x.h)),homeRuns:spread(qualifiedBat.map(x=>x.hr)),correlation:{hitsPA:corr(qualifiedBat,'h','pa'),hitsOPS:corr(qualifiedBat,'h','ops'),homeRunsOPS:corr(qualifiedBat,'hr','ops')}},fielding:{errors:spread(fielding.map(x=>x.errors)),chances:spread(fielding.map(x=>x.chances)),unearned:spread(fielding.map(x=>x.unearned))},player,career};
writeFileSync(new URL('./balance-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
