// Simulation WAR v1. These coefficients are game estimates, not fWAR or bWAR.
export const WAR_VERSION=1;
export const POSITION_RUNS={'포수':12.5,'1루수':-12.5,'2루수':2.5,'3루수':2.5,'유격수':7.5,'좌익수':-7.5,'중견수':2.5,'우익수':-7.5,'지명타자':-17.5};
const n=x=>Number.isFinite(x)?x:0;
const sum=(xs,f)=>xs.reduce((a,x)=>a+f(x),0);
const singles=s=>Math.max(0,n(s.h)-n(s.d)-n(s.t)-n(s.hr));
const pa=s=>n(s.pa)||n(s.ab)+n(s.bb)+n(s.hbp)+n(s.sf);
// Relative linear weights. Centering per PA includes the cost of batting outs.
const batting=s=>.47*singles(s)+.78*n(s.d)+1.09*n(s.t)+1.40*n(s.hr)+.33*n(s.bb)+.35*n(s.hbp)-.27*Math.max(0,pa(s)-n(s.h)-n(s.bb)-n(s.hbp));
const fipNumerator=s=>13*n(s.hr)+3*n(s.bb)-2*n(s.k);
const starterShare=(s,position)=>n(s.g)?Math.min(1,n(s.gs)/s.g):position==='선발'?1:0;
const pitchingWeight=(s,position,usage)=>Number.isFinite(usage?.starterOuts)?n(usage.starterOuts)+.7*n(usage.reliefOuts):n(s.outs)*(.7+.3*starterShare(s,position));
function positional(s,position,usage){
 if(usage?.positionOuts&&Object.keys(usage.positionOuts).length)return sum(Object.entries(usage.positionOuts),([p,outs])=>n(outs)/27/162*(POSITION_RUNS[p]??0));
 // Legacy full games overstate cameos. Use PA-derived playing time, never claim real innings.
 return Math.min(n(s.g),pa(s)/4.3)/162*(POSITION_RUNS[position]??0);
}
function park(s,role,usage,team,league){
 const volume=role==='bat'?pa(s):n(s.outs),weighted=role==='bat'?usage?.parkPa:usage?.parkOuts;
 if(volume&&Number.isFinite(weighted))return weighted/volume;
 // Home/away split unavailable in old saves; neutral road half is explicit approximation.
 const home=league?.teams?.find(t=>t.id===team)?.park;
 return Number.isFinite(home)?(1+home)/2:1;
}
export function leagueWarContext(league){
 if(!league?.players?.length||!league.teams?.length)return null;
 const bats=league.players.filter(p=>p.role==='bat'),arms=league.players.filter(p=>p.role==='pitch');
 const battingPa=sum(bats,p=>pa(p.stat)),outs=sum(arms,p=>n(p.stat.outs)),runs=sum(league.teams,t=>n(t.r)),teamGames=sum(league.teams,t=>n(t.g));
 if(!battingPa||!outs||!teamGames)return null;
 const ip=outs/3,ra9=runs*9/ip,runsPerWin=ra9*1.5+3,csCost=2*runs/outs+.075;
 const opportunities=s=>singles(s)+n(s.bb)+n(s.hbp);
 const br=s=>.2*n(s.sb)-csCost*n(s.cs);
 const pool=1000/2430*(teamGames/2);
 return {version:WAR_VERSION,year:league.year,level:league.level,parkFactors:Object.fromEntries(league.teams.map(t=>[t.id,t.park??1])),battingPa,outs,runs,teamGames,ra9,runsPerWin,runsPerPa:runs/battingPa,
  battingPerPa:sum(bats,p=>batting(p.stat))/battingPa,brPerOpportunity:sum(bats,p=>br(p.stat))/Math.max(1,sum(bats,p=>opportunities(p.stat))),csCost,
  positionPerPa:sum(bats,p=>positional(p.stat,p.position,p.warUsage))/battingPa,
  batParkMean:sum(bats,p=>pa(p.stat)*park(p.stat,'bat',p.warUsage,p.team,league))/battingPa,
  pitchParkMean:sum(arms,p=>n(p.stat.outs)*park(p.stat,'pitch',p.warUsage,p.team,league))/outs,
  fipConstant:ra9-sum(arms,p=>fipNumerator(p.stat))/ip,
  pitchingWeight:sum(arms,p=>pitchingWeight(p.stat,p.position,p.warUsage)),batReplacementRuns:pool*.57*runsPerWin,pitchReplacementRuns:pool*.43*runsPerWin,
  estimatedExposure:league.players.some(p=>(p.role==='bat'?pa(p.stat):n(p.stat.outs))&&!p.warUsage),
  missingCs:bats.some(p=>!Number.isFinite(p.stat.cs)),missingHbp:bats.some(p=>!Number.isFinite(p.stat.hbp))};
}
export function seasonWAR(row,{level='major',context=null}={}){
 const minor=level==='minor',s=(minor?row.minorStat:row.stat)||{},league=minor?row.minorLeague:row.league;
 const ctx=context||leagueWarContext(league)||(minor?row.minorWarContext:row.warContext);
 const unavailable=reason=>({version:WAR_VERSION,value:null,reason,notes:[reason]});
 if(row.military)return unavailable('군 복무 시즌 제외');
 if(!ctx||ctx.version!==WAR_VERSION)return unavailable('해당 시즌 리그 자료 없음');
 if(ctx.year!==undefined&&row.year!==undefined&&ctx.year!==row.year)return unavailable('시즌 리그 연도 불일치');
 const role=row.role,usage=league?.players?.find(p=>p.id===(row.playerId??row.id??'user')&&p.role===role)?.warUsage||(minor?row.minorWarUsage:row.warUsage);
 const volume=role==='bat'?pa(s):n(s.outs),parkLeague=league||{teams:Object.entries(ctx.parkFactors||{}).map(([id,park])=>({id:Number(id),park}))};
 const segmentVolume=sum(row.teamSegments||[],x=>role==='bat'?pa(x.stat||{}):n(x.stat?.outs));
 const exactPark=Number.isFinite(role==='bat'?usage?.parkPa:usage?.parkOuts);
 const factor=!minor&&!exactPark&&segmentVolume?sum(row.teamSegments,x=>(role==='bat'?pa(x.stat||{}):n(x.stat?.outs))*park(x.stat||{},role,null,x.team,parkLeague))/segmentVolume:park(s,role,usage,row.team,parkLeague),notes=['시뮬레이션 추정치'];
 if(!usage||ctx.estimatedExposure)notes.push('구장·출장 비중 일부 추정');
 if(ctx.missingCs)notes.push('구 기록 도루 실패 일부 미기록');
 if(ctx.missingHbp)notes.push('구 기록 사구 일부 미기록');
 const components={batting:0,baserunning:0,fielding:0,position:0,league:0,park:0,pitching:0,replacement:0};
 let method,diagnostics;
 if(role==='bat'){
  method='선형 타격 득점·도루 기반';notes.push('수비 득점 중립 · 추가 진루 미반영');
  if(!usage?.positionOuts)notes.push('포지션 출장량 추정');
  components.batting=batting(s)-ctx.battingPerPa*volume;
  components.baserunning=.2*n(s.sb)-ctx.csCost*n(s.cs)-ctx.brPerOpportunity*(singles(s)+n(s.bb)+n(s.hbp));
  components.position=positional(s,row.position,usage);
  components.league=-ctx.positionPerPa*volume;
  components.park=-(factor-ctx.batParkMean)*ctx.runsPerPa*volume;
  components.replacement=ctx.batReplacementRuns*volume/ctx.battingPa;
  diagnostics={pa:volume,parkFactor:factor};
 }else if(role==='pitch'){
  method='FIP 계열 기록 기반';notes.push('피사구 미기록 · 수비·레버리지 별도 미반영');
  const ip=volume/3,fip=ip?fipNumerator(s)/ip+ctx.fipConstant:ctx.ra9;
  components.pitching=(ctx.ra9-fip)*ip/9;
  components.park=(factor-ctx.pitchParkMean)*ctx.ra9*ip/9;
  components.replacement=ctx.pitchReplacementRuns*pitchingWeight(s,row.position,usage)/ctx.pitchingWeight;
  diagnostics={ip,fip,ra9:ip?n(s.r)*9/ip:null,era:ip?n(s.er)*9/ip:null,starterShare:volume&&Number.isFinite(usage?.starterOuts)?usage.starterOuts/volume:starterShare(s,row.position),parkFactor:factor};
 }else return unavailable('선수 역할 미기록');
 // No offensive or defensive exposure means no value.
 if(!volume&&!(role==='bat'&&sum(Object.values(usage?.positionOuts||{}),n)))for(const key of Object.keys(components))components[key]=0;
 const runs=sum(Object.values(components),x=>x),value=runs/ctx.runsPerWin;
 return {version:WAR_VERSION,value,runs,runsPerWin:ctx.runsPerWin,components,diagnostics,method,notes:[...new Set(notes)]};
}
export function warSnapshot(row){
 const snapshot={};
 for(const [level,prefix]of [['major',''],['minor','minor']]){
  const league=level==='major'?row.league:row.minorLeague,ctx=leagueWarContext(league)||(level==='major'?row.warContext:row.minorWarContext),usage=league?.players?.find(p=>p.id===(row.playerId??row.id??'user')&&p.role===row.role)?.warUsage||(level==='major'?row.warUsage:row.minorWarUsage);
  if(ctx)snapshot[prefix?prefix+'WarContext':'warContext']=structuredClone(ctx);
  if(usage)snapshot[prefix?prefix+'WarUsage':'warUsage']=structuredClone(usage);
 }
 return snapshot;
}
export function careerWAR(rows){
 const seasons=rows.filter(x=>x.stage==='프로'&&!x.military&&n(x.stat?.g)>0).map(row=>({row,war:seasonWAR(row)})),known=seasons.filter(x=>x.war.value!==null);
 return {value:sum(known,x=>x.war.value),known:known.length,missing:seasons.length-known.length,seasons};
}
export function bestWarSeasons(rows){
 const entries=careerWAR(rows).seasons.filter(x=>x.war.value!==null).sort((a,b)=>Number(b.war.value.toFixed(1))-Number(a.war.value.toFixed(1))||a.row.year-b.row.year);
 return entries.slice(0,3).map((x,i)=>({...x,rank:entries.findIndex(y=>Number(y.war.value.toFixed(1))===Number(x.war.value.toFixed(1)))+1}));
}
export function teamWarReport(league){
 const ctx=leagueWarContext(league);if(!ctx)return [];
 const values=new Map(league.teams.map(t=>[t.id,0]));
 for(const p of league.players){const result=seasonWAR({year:league.year,role:p.role,position:p.position,team:p.team,stat:p.stat,warUsage:p.warUsage},{context:ctx}),usage=p.warUsage?.teams,total=sum(Object.values(usage||{}),x=>x);
  if(total)for(const [team,volume]of Object.entries(usage))values.set(Number(team),(values.get(Number(team))||0)+result.value*volume/total);
  else values.set(p.team,(values.get(p.team)||0)+result.value);
 }
 const replacementRate=.5-500/2430;
 return league.teams.map(t=>({team:t.id,war:values.get(t.id),wins:t.w+.5*n(t.tie),replacementWins:t.g*replacementRate,estimatedWins:t.g*replacementRate+values.get(t.id),gap:t.w+.5*n(t.tie)-(t.g*replacementRate+values.get(t.id))}));
}
