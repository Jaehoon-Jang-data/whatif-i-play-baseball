import {createCareer,emptyBat,emptyPitch,enlist,nationalInvitation,progress,releaseAssessment,sangmuRecruitment,simulateSeason} from '../src/engine.js';

const make=(seed,year,role='bat',age=25)=>{const c=createCareer({seed,name:'감사 선수',school:'가상고',role,position:role==='bat'?'유격수':'마무리',type:role==='bat'?'교타형':'파이어볼러형',team:0});c.stage='프로';c.phase='prepare';c.year=year;c.age=age;c.proYears=5;c.served=false;c.contract={kind:'reserved',annualMan:7000,left:1};c.player.a.fill(75);return c;};

const saveRows=[];
for(const seed of [3,9,17]){let roster;for(let year=2027;year<=2041;year++){
  const season=simulateSeason({seed,year,rosterState:roster}),pitchers=season.players.filter(p=>p.role==='pitch'),saves=pitchers.map(p=>p.stat.sv).sort((a,b)=>b-a);
  saveRows.push({seed,year,first:saves[0],second:saves[1],closers:pitchers.filter(p=>p.position==='마무리'&&p.stat.g>0).length,title:season.awards.find(x=>x.title==='세이브왕').winners.length});roster=season.nextRoster;
}}
const national=[];for(const year of [2030,2034,2038])for(const role of ['bat','pitch'])for(const age of [25,28,30]){
  let selected=0;for(let seed=1;seed<=30;seed++){const c=make(seed,year,role,age),stat=role==='bat'?{...emptyBat(),g:130,pa:540,ab:480,h:170,hr:24,bb:55}:{...emptyPitch(),g:55,outs:175,k:80,sv:27};selected+=Number(Boolean(nationalInvitation(c,'아시안게임',stat)));}
  national.push({year,role,age,eligible:age<=29,selected,sample:30});
}
const sangmu=[];for(const year of [2030,2034,2038])for(const age of [23,27,28])for(const role of ['bat','pitch']){
  let eligible=0,accepted=0;for(let seed=1;seed<=30;seed++){const c=make(seed,year,role,age);c.proYears=age===23?1:5;c.history=[{year:year-1,stage:'프로',role,stat:role==='bat'?{...emptyBat(),g:100,pa:400,ab:350,h:110}:{...emptyPitch(),g:50,outs:150,k:65},minorStat:role==='bat'?emptyBat():emptyPitch()}];const decision=sangmuRecruitment(c);eligible+=Number(decision.eligible);if(decision.eligible)accepted+=Number(enlist(c,'athletic'));}
  sangmu.push({year,role,age,eligible,accepted,sample:30});
}
const postseason=[];for(const year of [2030,2034,2038])for(let seed=1;seed<=12;seed++){
  const c=make(seed,year,'bat',23);c.proYears=2;c.player.a.fill([56,60,64,73][seed%4]);const row=progress(c),old=row.postseason.regularRank<=5&&row.stat.g>0&&row.stat.pa>=60,now=row.postseason.selected;
  postseason.push({year,seed,old,now,last:row.rosterCalendar.filter(x=>x!=='대표팀').at(-1),reason:row.postseason.selectionReason});
}
const rookie=make(7,2030,'bat',23);rookie.proYears=2;rookie.player.a.fill(48);rookie.history=[{year:2028,stage:'프로',role:'bat',stat:{...emptyBat(),g:120,pa:490,ab:440,h:140},awards:['신인왕']},{year:2029,stage:'프로',role:'bat',stat:{...emptyBat(),g:24,pa:70,ab:64,h:8},awards:[]}];const assessment=releaseAssessment(rookie),oldProbability=Math.max(0,Math.min(.32,(45-(48*.48+assessment.form*.25+Math.min(100,assessment.games)*.15))/120));
console.log(JSON.stringify({saves:{seasons:saveRows.length,minSecond:Math.min(...saveRows.map(x=>x.second)),late:saveRows.filter(x=>x.seed===9&&x.year>=2039),zeroTitles:saveRows.filter(x=>x.first===0&&x.title>0).length},national,sangmu,postseason:{cases:postseason.length,oldSelected:postseason.filter(x=>x.old).length,newSelected:postseason.filter(x=>x.now).length,removed:postseason.filter(x=>x.old&&!x.now).slice(0,5)},rookie:{oldProbability,newProbability:assessment.probability,reason:assessment.reason}},null,2));
