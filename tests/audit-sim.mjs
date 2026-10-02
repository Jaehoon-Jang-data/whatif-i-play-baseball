import {createCareer,progress,overall,simulateSeason,rates,postseasonResult,secondaryDraftEligible} from '../src/engine.js';

const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const p90=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length*.9)];
const careers=[];
for(let seed=1;seed<=100;seed++){
  const role=seed%2?'bat':'pitch',position=role==='bat'?'중견수':seed%4?'선발':'마무리';
  const c=createCareer({seed,name:'검증',school:'가명고',role,position,type:role==='bat'?'교타형':'제구형',team:seed%10});
  c.stage='프로';c.age=21;c.year=2029;c.player.a.fill(53);c.contract={kind:'reserved',annualMan:3300,left:1};c.reserved=true;c.served=true;
  let starter=false,majorGames=0;
  for(let i=0;i<10;i++){
    c.phase='prepare';c.salaryPending=false;c.contract.left=1;
    const row=progress(c);starter||=row.level==='1군 주전';majorGames+=row.stat.g;
    c.age++;c.year++;c.pendingEvent=null;c.eventQueue=[];
  }
  careers.push({seed,role,position,starter,majorGames,overall:overall(c.player)});
}
const league=[],regularBatRatio=[],benchBatRatio=[],starterRatio=[],reliefRatio=[],closer=[];
for(let seed=1;seed<=100;seed++){
  const s=simulateSeason({seed,year:2029});
  for(const p of s.players){const q=p.stat;if(p.role==='bat'&&q.g>30){if(Number(p.id.split('b')[1])<9)regularBatRatio.push(q.pa/q.g);else benchBatRatio.push(q.pa/q.g);}if(p.position==='선발'&&q.gs>5)starterRatio.push(q.outs/3/q.gs);if(p.position==='중간계투'&&q.g>5)reliefRatio.push(q.outs/3/q.g);if(p.position==='마무리')closer.push({g:q.g,sv:q.sv,bs:q.bs});}
  league.push({qualified:s.players.filter(p=>p.role==='bat'&&p.stat.pa>=Math.floor(144*3.1)).length,era:rates(s.players.filter(p=>p.role==='pitch').reduce((a,p)=>{for(const k of Object.keys(a))a[k]+=p.stat[k]||0;return a;},{outs:0,er:0,bb:0,h:0}),'pitch').era});
}
const postseason=[];
for(let seed=1;seed<=5000;seed++){
  const teams=Array.from({length:10},(_,id)=>({id,w:90-id*3,l:54+id*3,g:144}));
  const league={year:2030,games:144,teams,players:[]};
  const result=postseasonResult(league,{team:0,role:'bat',stat:{g:0}},null,seed);
  postseason.push({champion:result.champion,wildcard:result.rounds[0].winner,ks:result.rounds[3].winner});
}
const report={career:{count:careers.length,starter:careers.filter(x=>x.starter).length,byRole:{bat:careers.filter(x=>x.role==='bat'&&x.starter).length,pitch:careers.filter(x=>x.role==='pitch'&&x.starter).length},ovrMean:mean(careers.map(x=>x.overall)),ovrP90:p90(careers.map(x=>x.overall)),ovrMax:Math.max(...careers.map(x=>x.overall))},playingTime:{regularBatPAperGame:mean(regularBatRatio),benchBatPAperGame:mean(benchBatRatio),starterIPperStart:mean(starterRatio),reliefIPperGame:mean(reliefRatio),closerGames:mean(closer.map(x=>x.g)),closerSaves:mean(closer.map(x=>x.sv)),closerBlown:mean(closer.map(x=>x.bs)),qualifiedBattersPerLeague:mean(league.map(x=>x.qualified)),leagueERA:mean(league.map(x=>x.era))},postseason:{samples:postseason.length,fourthWinsWC:postseason.filter(x=>x.wildcard===3).length/postseason.length,firstWinsKS:postseason.filter(x=>x.ks===0).length/postseason.length}};
console.log(JSON.stringify(report,null,2));
