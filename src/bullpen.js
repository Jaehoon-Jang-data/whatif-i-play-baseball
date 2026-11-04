// These are game workload policies, not KBO eligibility rules or medical prescriptions.
export function reliefAvailability(history=[],day){
  const recent=history.filter(x=>x.day>=day-6&&x.day<day),last=history.at(-1),weeklyPitches=recent.reduce((n,x)=>n+x.pitches,0);
  let reason=null;
  if(last?.day===day)reason='당일 등판';
  else if(history.some(x=>x.day===day-1)&&history.some(x=>x.day===day-2))reason='3연투 방지';
  else if(last&&day-last.day<=(last.pitches>=45?2:last.pitches>=30?1:0))reason='투구량 회복';
  else if(weeklyPitches>=75||recent.length>=4)reason='주간 누적 부하';
  return {available:!reason,reason,weeklyPitches,restDays:last?day-last.day-1:7};
}
export function assignBullpenRoles(pitchers,score=p=>p.a.reduce((n,x)=>n+x,0)/p.a.length){
  const roles=new Map(),middle=pitchers.filter(p=>p.position!=='마무리').sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  for(const p of pitchers.filter(p=>p.position==='마무리'))roles.set(p.id,'마무리');
  middle.slice(0,2).forEach(p=>roles.set(p.id,'필승조'));
  const remaining=middle.slice(2),long=[...remaining].sort((a,b)=>b.a[3]-a.a[3]||a.id.localeCompare(b.id))[0];
  remaining.forEach(p=>roles.set(p.id,p===long?'롱릴리프':'추격조'));
  return roles;
}
export function chooseBullpenPitcher({pitchers,roles,workloads,usedIds,day,inning,lead,seasonStart,score,random}){
  const pool=pitchers.filter(p=>!usedIds.has(p.id)&&p.stat.g-(p.stat.gs||0)<75&&reliefAvailability(workloads.get(p.id),day).available&&reliefAvailability(workloads.get(p.id),day).weeklyPitches+(roles.get(p.id)==='롱릴리프'||!['필승조','마무리'].includes(roles.get(p.id))&&inning<=6?35:20)<=100);
  if(!pool.length)return null;
  const closer=inning>=8&&lead>=1&&lead<=3,high=inning>=6&&lead>=0&&lead<=3||inning>=7&&lead===-1;
  let preferred,reason;
  if(closer){preferred=pool.filter(p=>roles.get(p.id)==='마무리');reason='세이브 상황';}
  else if(high){preferred=pool.filter(p=>roles.get(p.id)==='필승조');reason='접전';}
  else{preferred=pool.filter(p=>!['필승조','마무리'].includes(roles.get(p.id)));reason=inning<=5?'이른 구원·긴 이닝':'비접전';}
  if(!preferred?.length){
    const maintenance=!high&&!closer&&inning>=7?pool.filter(p=>day-(workloads.get(p.id)?.at(-1)?.day??seasonStart)>=7):[];
    if(maintenance.length){preferred=maintenance;reason='점검 등판';}
    else{preferred=pool.filter(p=>p.position!=='마무리');if(!preferred.length)preferred=pool;reason='가용 투수 대체';}
  }
  const grade=p=>score(p)-Math.max(0,reliefAvailability(workloads.get(p.id),day).weeklyPitches-45)*.15-(workloads.get(p.id)?.at(-1)?.day===day-1?8:0)+(inning<=5&&roles.get(p.id)==='롱릴리프'?18:0);
  preferred.sort((a,b)=>grade(b)-grade(a)||a.id.localeCompare(b.id));
  const top=preferred.slice(0,high||closer?1:Math.min(3,preferred.length));
  return {pitcher:top[Math.floor(random()*top.length)],reason};
}
export function holdEligible(appearance,{winner=false,loser=false}={}){
  return !appearance.started&&!appearance.finished&&!winner&&!loser&&appearance.outs>=1&&!appearance.holdLost&&!appearance.blown&&appearance.entry>0&&(appearance.entry<=2+(appearance.entryRunners||0)||appearance.entry<=3&&appearance.outs>=3||appearance.outs>=9)&&appearance.exit>0;
}
