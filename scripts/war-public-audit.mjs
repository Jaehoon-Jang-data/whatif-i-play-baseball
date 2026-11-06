import{readFileSync}from'node:fs';import{execFileSync}from'node:child_process';
import{simulateSeason,rates}from'../src/engine.js';import*as W from'../src/war.js';
export const reference=JSON.parse(readFileSync(new URL('./data/kbo-2024-war-reference.json',import.meta.url),'utf8'));
export function referenceContext(model=W,starterShare=.6){
 const x=reference.league,usage={parkPa:x.pa,positionOuts:Object.fromEntries(Object.keys(model.POSITION_RUNS).map(p=>[p,x.outs]))};
 // Two aggregate holders reconstruct totals, not real individual player rows.
 const league={year:2024,level:'major',teams:Array.from({length:10},(_,id)=>({id,g:144,r:x.r/10,park:1})),players:[{id:'league-bat',role:'bat',position:'지명타자',team:0,stat:{...x,g:1440},warUsage:usage},{id:'league-pitch',role:'pitch',position:'선발',team:0,stat:{...x,g:1440},warUsage:{parkOuts:x.outs,starterOuts:x.outs*starterShare,reliefOuts:x.outs*(1-starterShare)}}]};
 return model.leagueWarContext(league);
}
export function replayReference(p,model=W,context=referenceContext(model),park=1){
 const volume=p.role==='bat'?p.stat.pa:p.stat.outs,warUsage=p.role==='bat'?{...(Object.keys(p.positionOuts||{}).length?{positionOuts:p.positionOuts}:{}),parkPa:volume*park}:{parkOuts:volume*park};
 return model.seasonWAR({...p,team:0,year:2024,warUsage},{context});
}
const avg=a=>a.reduce((n,x)=>n+x,0)/Math.max(1,a.length);
function comparable(p,q,context,referenceCtx){
 const s=p.stat,t=q.stat,r=rates(t,p.role),ip=s.outs/3,tIp=t.outs/3;
 if(p.role==='bat'){
  const dif={leagueRa9:(context.ra9-referenceCtx.ra9)/.6,pa:(t.pa-s.pa)/100,avg:(r.avg-s.h/s.ab)/.04,obp:(r.obp-p.obp)/.04,slg:(r.slg-p.slg)/.08,hr:(t.hr-s.hr)/10,bb:(t.bb-s.bb)/20,sb:(t.sb-s.sb)/15,cs:((t.cs||0)-s.cs)/6};
  const actual=Object.values(p.positionOuts||{}).reduce((a,b)=>a+b,0)/3,sim=Object.values(q.warUsage?.positionOuts||{}).reduce((a,b)=>a+b,0)/3;if(actual)dif.fieldInnings=(sim-actual)/250;
  return {distance:Math.sqrt(avg(Object.values(dif).map(x=>x*x))),accepted:Object.values(dif).every(x=>Math.abs(x)<=1),dif};
 }
 const dif={leagueRa9:(context.ra9-referenceCtx.ra9)/.6,ip:(tIp-ip)/(p.position==='선발'?30:15),g:(t.g-s.g)/(p.position==='선발'?6:20),ra9:(t.r*9/tIp-s.r*9/ip)/1,era:(r.era-s.er*9/ip)/1,k9:(t.k*9/tIp-s.k*9/ip)/2.5,bb9:(t.bb*9/tIp-s.bb*9/ip)/1.2,hr9:(t.hr*9/tIp-s.hr*9/ip)/.45};
 return {distance:Math.sqrt(avg(Object.values(dif).map(x=>x*x))),accepted:Object.values(dif).every(x=>Math.abs(x)<=1),dif};
}
export async function audit({baseline=null,seasons=48}={}){
 let before=W;if(baseline){const source=execFileSync('git',['show',baseline+':src/war.js'],{encoding:'utf8'});before=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
 const ctx=referenceContext(),cases=reference.players.map(p=>{const old=replayReference(p,before),now=replayReference(p),sensitivity=[.95,1.05].map(pf=>replayReference(p,W,ctx,pf).value),roleSensitivity=p.role==='pitch'?[.5,.65].map(x=>replayReference(p,W,referenceContext(W,x)).value):null;
 return {name:p.name,role:p.role,position:p.position,stat:p.stat,publicWar:p.publicWar,publicModel:p.publicModel,before:old.value,after:now.value,difference:now.value-p.publicWar,parkSensitivity:sensitivity,roleSensitivity,positionEstimated:p.positionEstimated,sfrSensitivity:p.role==='bat'?now.value+p.sfr/now.runsPerWin:null,components:now.components,diagnostics:now.diagnostics};});
 const nearest=new Map();
 for(let seed=1;seed<=seasons;seed++){
  const role=seed%2?'bat':'pitch',positions=role==='bat'?['3루수','포수','우익수','지명타자','유격수']:['선발','중간계투','마무리'],position=positions[Math.floor(seed/2)%positions.length],ability=[65,80,92][Math.floor(seed/6)%3],a=Array(6).fill(ability);if(role==='bat')a[3]=seed%3?70:90;
  const league=simulateSeason({seed:seed*17,year:2024,environment:1.08,player:{name:'감사 선수',role,position,team:0,a,opportunity:1}}),context=W.leagueWarContext(league);
  for(const q of league.players){if(!(q.role==='bat'?q.stat.pa>=100:q.stat.outs>=60))continue;for(const p of reference.players.filter(p=>p.role===q.role&&p.position===q.position)){
   const match=comparable(p,q,context,ctx),previous=nearest.get(p.name);if(previous&&(previous.accepted&&!match.accepted||previous.accepted===match.accepted&&previous.distance<=match.distance))continue;
   const war=W.seasonWAR({...q,year:2024,warUsage:q.warUsage},{context});nearest.set(p.name,{...match,seed:seed*17,id:q.id,position:q.position,stat:q.stat,leagueRa9:context.ra9,leagueRpw:context.runsPerWin,war:war.value,publicWar:p.publicWar,difference:war.value-p.publicWar,components:war.components,diagnostics:war.diagnostics});
  }}
 }
 return {season:2024,referenceContext:ctx,assumptions:reference.sourceNotes,cases,matchedSimulationSeasons:seasons,nearest:[...nearest].map(([name,x])=>({name,...x})),meanDifference:{bat:avg(cases.filter(x=>x.role==='bat').map(x=>x.difference)),pitch:avg(cases.filter(x=>x.role==='pitch').map(x=>x.difference))}};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify(await audit({baseline:process.argv.find(x=>x.startsWith('--baseline='))?.slice(11)}),null,2));
