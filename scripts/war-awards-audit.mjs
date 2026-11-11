import{simulateSeason,awards}from'../src/engine.js';import{leagueWarContext,seasonWAR}from'../src/war.js';
export function auditWarAwards(seeds=8){
 const rows=[];
 for(const [role,position]of [['bat','포수'],['bat','유격수'],['bat','중견수'],['bat','지명타자'],['pitch','선발'],['pitch','중간계투'],['pitch','마무리']])for(let seed=1;seed<=seeds;seed++){
  const ability=[55,70,85][seed%3],league=simulateSeason({seed:seed*41,year:2029,player:{name:'수상 감사',team:0,role,position,age:19,rookie:true,rookieYear:2029,priorPa:0,priorOuts:0,a:Array(6).fill(ability),opportunity:[.4,.75,1][seed%3]}}),ctx=leagueWarContext(league),war=new Map(league.players.map(p=>[p.id,seasonWAR({...p,year:2029},{context:ctx}).value])),result=awards(league),mvp=result.find(x=>x.title==='정규시즌 MVP'),rookie=result.find(x=>x.title==='신인왕'),best=Math.max(...war.values()),winner=mvp.winners[0],glove=result.filter(x=>x.title.startsWith('골든글러브'));
  rows.push({seed:seed*41,role,position,ability,mvp:winner,mvpWar:war.get(winner),maxWar:best,mvpNearTop:best-war.get(winner)<=.1000001,rookie:rookie.winners[0]??null,rookieWar:war.get(rookie.winners[0])??null,gloveWar:glove.flatMap(x=>x.winners.map(id=>war.get(id))),userWar:war.get('user'),userRookie:rookie.winners.includes('user')});
 }
 const mean=a=>a.reduce((n,x)=>n+x,0)/Math.max(1,a.length),rookies=rows.filter(x=>x.rookie),gloves=rows.flatMap(x=>x.gloveWar);
 return{seasons:rows.length,mvpNearTop:rows.filter(x=>x.mvpNearTop).length,mvpMeanWar:mean(rows.map(x=>x.mvpWar)),rookieAwarded:rookies.length,rookieBelowOne:rookies.filter(x=>x.rookieWar<1).length,rookieMeanWar:mean(rookies.map(x=>x.rookieWar)),gloveWinners:gloves.length,gloveMeanWar:mean(gloves),rows};
}
export function auditPersistentAwards(){
 const rows=[];
 for(let seed=1;seed<=4;seed++){let roster;for(let year=2029;year<=2034;year++){
  const league=simulateSeason({seed:seed*53,year,rosterState:roster}),rookie=league.awards.find(x=>x.title==='신인왕');roster=league.nextRoster;
  rows.push({seed:seed*53,year,rookie:rookie.winners[0]??null,war:rookie.candidates.find(x=>x.id===rookie.winners[0])?.war??null,eligibleCandidates:rookie.candidates.filter(x=>x.awardEligible).length});
 }}
 return {seasons:rows.length,awarded:rows.filter(x=>x.rookie).length,noAward:rows.filter(x=>!x.rookie).length,belowOne:rows.filter(x=>x.rookie&&x.war<1).length,rows};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify({...auditWarAwards(),persistent:auditPersistentAwards()},null,2));
