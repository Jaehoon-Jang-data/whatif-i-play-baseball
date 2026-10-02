import {createCareer,progress,overall} from '../src/engine.js';
const profiles=[];
for(const position of ['중견수','포수','선발','마무리'])for(const initial of [45,65])for(const age of [21,29])for(const potential of [.85,1.2])for(const training of [[0,1],[4,5]])for(const seed of [11,37]){
  const role=['선발','마무리'].includes(position)?'pitch':'bat';
  const c=createCareer({seed,name:'검증',school:'가명고',role,position,type:role==='bat'?'교타형':'제구형',team:seed%10});
  c.stage='프로';c.phase='prepare';c.age=age;c.year=2029;c.player.a.fill(initial);c.potential=potential;c.contract={kind:'reserved',annualMan:3300,left:1};c.reserved=true;c.served=true;
  let firstStarter=null,topSeason=null,capSeason=null,lowYears=0,totalMajor=0,totalMinor=0;
  for(let season=1;season<=10;season++){
    c.phase='prepare';c.salaryPending=false;c.contract.left=1;c.pendingEvent=null;c.eventQueue=[];
    if(seed===37&&potential===.85&&season===4){c.service=2;c.servicePath='regular';c.served=false;}
    const row=progress(c,training);
    if(firstStarter===null&&row.level==='1군 주전')firstStarter=season;
    if(topSeason===null&&overall(c.player)>=80)topSeason=season;
    if(capSeason===null&&c.player.a.some(v=>v>=95))capSeason=season;
    if(row.stat.g<15)lowYears++;
    totalMajor+=row.stat.g;totalMinor+=row.minorStat.g;
    c.age++;c.year++;
  }
  profiles.push({position,role,initial,age,potential,training,seed,firstStarter,topSeason,capSeason,lowYears,totalMajor,totalMinor,overall:overall(c.player),delta:c.player.a.map(v=>+(v-initial).toFixed(1))});
}
const mean=a=>+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2);
const summary=rows=>({n:rows.length,starter:rows.filter(x=>x.firstStarter!==null).length,starterMedian:(()=>{const x=rows.map(r=>r.firstStarter).filter(Boolean).sort((a,b)=>a-b);return x.length?x[Math.floor(x.length/2)]:null})(),top80:rows.filter(x=>x.topSeason!==null).length,cap95:rows.filter(x=>x.capSeason!==null).length,overall:mean(rows.map(x=>x.overall)),majorGames:mean(rows.map(x=>x.totalMajor)),minorGames:mean(rows.map(x=>x.totalMinor)),lowYears:mean(rows.map(x=>x.lowYears)),skillDelta:Array.from({length:6},(_,i)=>mean(rows.map(x=>x.delta[i])))});
console.log(JSON.stringify({sample:'128 fixed-seed ten-season trajectories',all:summary(profiles),byPosition:Object.fromEntries([...new Set(profiles.map(x=>x.position))].map(k=>[k,summary(profiles.filter(x=>x.position===k))])),byInitial:Object.fromEntries([45,65].map(k=>[k,summary(profiles.filter(x=>x.initial===k))])),byPotential:Object.fromEntries([.85,1.2].map(k=>[k,summary(profiles.filter(x=>x.potential===k))])),lowParticipation:summary(profiles.filter(x=>x.lowYears>=5)),trainingProfiles:Object.fromEntries(['0,1','4,5'].map(k=>[k,summary(profiles.filter(x=>x.training.join(',')===k))]))},null,2));
