import{createCareer,simulateSeason,emptyBat,emptyPitch,offers,salaryOffer,projectedSalaryValue}from'../src/engine.js';
export function auditFaMarket(){
 const rows=[];
 for(const [role,position]of [['bat','지명타자'],['bat','유격수'],['pitch','선발'],['pitch','중간계투'],['pitch','마무리']])for(let seed=1;seed<=4;seed++){
  const ability=[50,65,80,90][seed-1],c=createCareer({seed:seed*31,name:'시장 감사',school:'가상고',role,position,type:role==='bat'?'교타형':'제구형',team:0});c.player.a.fill(ability);c.history=[];
  for(const year of [2045,2046,2047]){const league=simulateSeason({seed:seed*31,year,player:{...c.player,opportunity:ability>=80?1:.4}}),p=league.players.find(x=>x.id==='user');c.history.push({year,stage:'프로',role,position,team:p.team,stat:p.stat,minorStat:role==='bat'?emptyBat():emptyPitch(),league,awards:[]});c.latest=league;}
  for(const age of [28,34,39,43]){Object.assign(c,{year:2048,age,phase:'fa_choice',proYears:15,faCount:1,contract:{kind:'reserved',annualMan:50000,left:0}});const stay=salaryOffer(c),os=offers(c,true);rows.push({role,position,ability,seed:seed*31,age,stay,value:projectedSalaryValue(c),offers:os.map(o=>({team:o.team,years:o.years,annual:o.annualMan,guaranteedAnnual:o.guaranteedMan/o.years,optionAnnual:o.optionMan/o.years,total:o.totalMan,budgetRoom:o.budget.roomMan+o.budget.playerCostMan,cost:o.budget.annualCostMan}))});}
 }
 const byAbility=Object.fromEntries([50,65,80,90].map(a=>{const cases=rows.filter(x=>x.ability===a),os=cases.flatMap(x=>x.offers),values=os.map(x=>x.guaranteedAnnual).sort((a,b)=>a-b);return [a,{careers:cases.length,offers:os.length,guaranteedAnnual:{min:values[0],median:values[Math.floor(values.length/2)],max:values.at(-1)},aboveReserved:cases.reduce((n,c)=>n+c.offers.filter(o=>o.guaranteedAnnual>c.stay).length,0)}];}));
 return {careers:rows.length,simulatedLeagueSeasons:60,byAbility,budgetViolations:rows.flatMap(x=>x.offers).filter(x=>x.cost>x.budgetRoom+1e-8).length,rows};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify(auditFaMarket(),null,2));
