const root=process.argv[2]||new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const {simulateSeason,createCareer,offers,emptyBat}=await import(`${root}/src/engine.js`);
let steals=0,attempts=0,registered=0,violations=0,trades=0,rookies=0,retired=0,minor=0,expansion=0,faFloor=0,faTotal=0,faAav=0;
for(let seed=1;seed<=12;seed++){
 let state=null,prior=null;
 for(let year=2030;year<=2032;year++){
  const s=simulateSeason({seed,year,rosterState:state});
  steals+=s.players.filter(x=>x.role==='bat').reduce((n,p)=>n+p.stat.sb,0);
  attempts+=s.players.filter(x=>x.role==='bat').reduce((n,p)=>n+(p.stat.sba||0),0);
  registered+=s.rosterAudit?.length||0;violations+=s.rosterViolations||0;trades+=s.transactions?.length||0;minor+=s.nextRoster?.filter(x=>x.lastMinorGames>0).length||0;expansion+=s.rosterAudit?.filter(x=>x.expanded).length||0;
  if(prior&&s.nextRoster){rookies+=s.nextRoster.filter(x=>!prior.has(x.id)).length;retired+=[...prior].filter(id=>!s.nextRoster.some(x=>x.id===id)).length;}
  state=s.nextRoster;prior=new Set(state?.map(x=>x.id)||[]);
 }
 const c=createCareer({seed,name:'검증',school:'검증고',team:0,role:'bat',position:'우익수',type:'교타형'});c.stage='프로';c.phase='market';c.faDeclared=true;c.year=2030;c.age=29;c.proYears=8;c.contract={kind:'reserved',annualMan:25000};c.history=[{year:2029,stage:'프로',role:'bat',position:'우익수',stat:{...emptyBat(),g:140,pa:600,ab:530,h:175,hr:24,bb:58},awards:[]}];
 for(const o of offers(c)){faTotal++;faAav+=o.annualMan;if(o.annualMan<=25000)faFloor++;}
}
console.log(JSON.stringify({seasons:36,stealsPerTeam:Math.round(steals/360*10)/10,attemptsPerTeam:Math.round(attempts/360*10)/10,registeredAudit:registered,rosterViolations:violations,clubTrades:trades,newPlayers:rookies,retiredPlayers:retired,minorPlayersWithGames:minor,expandedSnapshots:expansion,faOffers:faTotal,faBelowOld:faFloor,faAav:Math.round(faAav/faTotal)},null,2));
