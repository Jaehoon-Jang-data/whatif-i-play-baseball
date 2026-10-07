// The game starts in 2027. Its day-to-date schedule is an approximation, not the KBO fixture list.
export function seasonDate(year,gameDay,games=144){
  const start=Date.UTC(year,2,28),end=Date.UTC(year,9,7);
  return new Date(start+Math.round(gameDay*(end-start)/Math.max(1,games-1))).toISOString().slice(0,10);
}
export function tradeWindowOpen(date,postseasonEnd=`${Number(date.slice(0,4))}-11-15`){
  const year=date.slice(0,4),day=date.slice(0,10);
  return day<=`${year}-07-31`||day>postseasonEnd.slice(0,10);
}
export function rosterLimits(year,date){
  const monthDay=date.slice(5);
  if(year===2026){
    if(monthDay>='08-25')return {registered:34,gameEligible:32,expanded:true};
    if(monthDay>='07-16')return {registered:30,gameEligible:28,expanded:false};
    return {registered:29,gameEligible:28,expanded:false};
  }
  // 2027+ repeats the confirmed 2026 opening limit and the usual September expansion.
  return monthDay>='09-01'?{registered:34,gameEligible:32,expanded:true}:{registered:29,gameEligible:28,expanded:false};
}
export function clubStrategy(team,players,remaining){
  const played=team.w+team.l,winRate=played?team.w/played:.5;
  const averageAge=players.length?players.reduce((n,p)=>n+(p.age||27),0)/players.length:27;
  const prospectCount=players.filter(p=>(p.age||27)<=24).length;
  const strength=players.length?players.reduce((n,p)=>n+p.a.reduce((sum,value)=>sum+value,0)/p.a.length,0)/players.length:55;
  const contendScore=winRate+(strength-57)*.006+(averageAge-28)*.002-(prospectCount-13)*.0008;
  const winNow=remaining<=75?contendScore>=.515:contendScore>=.555;
  return {kind:winNow?'윈나우':'리빌딩',winRate,remaining,averageAge,prospectCount,strength,contendScore};
}
export function selectClubRoster(players,limits,strategy){
  const score=p=>p.a.reduce((n,x)=>n+x,0)/p.a.length+(strategy==='리빌딩'?(p.age<=24?5:0):p.age>=29&&p.age<=35?3:0)+(p.stat?.g?Math.min(3,p.stat.g/35):0);
  const bats=players.filter(p=>p.role==='bat').sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  const arms=players.filter(p=>p.role==='pitch').sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  const batCount=limits.registered>=34?19:16,pitchCount=limits.registered-batCount;
  const positions=['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'];
  const selectedBats=positions.map(pos=>bats.find(p=>p.position===pos)).filter(Boolean);
  for(const bat of bats)if(selectedBats.length<batCount&&!selectedBats.includes(bat))selectedBats.push(bat);
  const selectedArms=arms.filter(p=>p.position==='선발').slice(0,5);
  for(const arm of arms)if(selectedArms.length<pitchCount&&!selectedArms.includes(arm))selectedArms.push(arm);
  const registered=[...selectedBats,...selectedArms];
  const eligible=registered.slice(0,limits.gameEligible);
  return {registered,eligible,minor:players.filter(p=>!registered.includes(p))};
}
