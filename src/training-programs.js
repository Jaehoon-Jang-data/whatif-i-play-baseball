// Program coefficients, fatigue and injury modifiers are game design, not medical prescriptions.
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
export const PROGRAMS={
 bat:[
  {id:'bat-contact',name:'타격 종합',weights:[3.6,1.1,1.3,.2,.3,.1],load:.35,main:'컨택',support:'파워·선구',burden:'기술 반복 피로'},
  {id:'bat-power',name:'장타 타격·웨이트',weights:[.5,4.8,.5,.15,.15,.1],load:.85,main:'파워',support:'컨택 소폭',burden:'근육 부담 · 정확성 조정',cost:[.15,0,0,0,0,0]},
  {id:'bat-approach',name:'선구·상황 타격',weights:[1.2,.3,4.3,.2,.2,.1],load:.25,main:'선구',support:'컨택',burden:'장타 성장 적음'},
  {id:'bat-field',name:'수비·포지션 훈련',weights:[.4,.2,.4,.6,3.5,1.2],load:.5,main:'수비',support:'송구·포지션 적응',burden:'타격 성장 적음'},
  {id:'bat-running',name:'주루·민첩성',weights:[.6,.15,.7,3.3,.9,.2],load:.7,main:'주루',support:'수비·도루 판단',burden:'하체 부하'},
  {id:'bat-condition',name:'종합 컨디셔닝',weights:[.45,.4,.3,.7,.5,.2],load:-.6,main:'회복·내구성',support:'주루·기본 기술 소폭',burden:'기술 성장 느림',recovery:true}
 ],
 pitch:[
  {id:'pitch-power',name:'구속·구위 개발',weights:[3, .35,2.4,.3,.35,.1],load:1,main:'구속·구위',support:'체력 소폭',burden:'팔 부하 큼',cost:[0,.12,0,0,0,0]},
  {id:'pitch-command',name:'제구·투구 설계',weights:[.1,4.5,.8,.2,.9,.5],load:.2,main:'제구',support:'변화구·위기관리',burden:'구속 성장 적음'},
  {id:'pitch-breaking',name:'변화구·구종 개발',weights:[.2,1,.9,.2,3.9,.4],load:.65,main:'변화구',support:'제구·구종 숙련',burden:'새 구종 적응 기간'},
  {id:'pitch-endurance',name:'선발 체력·회복',weights:[.3,.7,.5,4.1,.4,.3],load:-.25,main:'체력·회복',support:'제구',burden:'구속·구위 성장 적음',recovery:true},
  {id:'pitch-bullpen',name:'불펜 실전·구종 조합',weights:[1,1.3,2.5,.15,1.4,.6],load:.7,main:'구위',support:'제구·변화구·위기관리',burden:'선발 체력 성장 적음'},
  {id:'pitch-condition',name:'견제·컨디셔닝',weights:[.15,.8,.25,1.8,.5,.6],load:-.65,main:'회복·견제',support:'체력·제구',burden:'투구 기술 성장 느림',recovery:true}
 ]
};
export const legacyProgramMap={bat:[0,1,2,4,3,3],pitch:[0,1,0,3,2,4]};
export function programSelection(role,selection){
 if(!Array.isArray(selection)||selection.length>2||new Set(selection).size!==selection.length)throw Error('훈련 프로그램은 서로 다른 항목 최대 2개를 선택하세요.');
 const out=selection.map(x=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<6?PROGRAMS[role][legacyProgramMap[role][x]].id:x);
 if(out.some(id=>!PROGRAMS[role].some(p=>p.id===id)))throw Error('선수 역할에 맞는 훈련 프로그램을 선택하세요.');
 return [...new Set(out)];
}
export function selectedPrograms(c,selection=c.trainingPrograms??c.training??[0]){return programSelection(c.player.role,selection);}
export function programProfile(c,selection){
 const ids=selectedPrograms(c,selection),programs=ids.map(id=>PROGRAMS[c.player.role].find(p=>p.id===id)),state=c.trainingState||{},last=c.history?.filter(x=>x.role===c.player.role).at(-1);
 let load=programs.length?programs.reduce((n,p)=>n+p.load,0)/programs.length:0,recovery=programs.some(p=>p.recovery);
 const volume=c.player.role==='bat'?((last?.stat?.pa||0)+(last?.minorStat?.pa||0)*.7)/650:((last?.stat?.outs||0)+(last?.minorStat?.outs||0)*.7)/(c.player.position==='선발'?540:210);
 // Offseason dissipates most carry-over fatigue; annual volume is only a workload proxy.
 const recent=last?.recentWorkload,shortLoad=c.player.role==='bat'?(recent?.pa14||0)/60:(recent?.estimatedPitches7||0)/75;
 const fatigue=limit((state.fatigue||0)*.35+Math.max(0,volume-.8)*12+Math.max(0,shortLoad-1)*8,0,60);
 const active=programs.filter(p=>p.recovery||p.weights.some((w,i)=>w>=.3&&c.player.a[i]<(c.potentialCaps?.[i]??95))),disabled=programs.filter(p=>!active.includes(p)).map(p=>p.id);
 load=active.length?active.reduce((n,p)=>n+p.load,0)/active.length:0;
 const repeat=active.length?active.reduce((n,p)=>n+Math.min(5,state.repeats?.[p.id]||0),0)/active.length:0;
 const efficiency=limit(1-repeat*.095,.52,1)*(1-fatigue/170)*(c.recoveryState?.year===c.year?.8:1);
 return {ids:active.map(p=>p.id),disabled,programs:active,load:active.length?load:0,recovery,repeat,efficiency,fatigue,volume,recentWorkload:recent??null,
  riskAdjustment:load*.028+fatigue*.00065+Math.max(0,volume-1)*.025-(recovery?.018:0),recoveryFactor:recovery?.9:1};
}
export function programOptions(c){return PROGRAMS[c.player.role].map(p=>{const profile=programProfile(c,[p.id]),mainIndices=p.weights.map((w,i)=>({w,i})).filter(x=>x.w>=2).map(x=>x.i),capped=mainIndices.filter(i=>c.player.a[i]>=(c.potentialCaps?.[i]??95));let reason=p.recovery&&(profile.fatigue>=5||c.injuries>0)?'부하·부상 이력 관리':p.id==='bat-field'&&['포수','유격수','중견수'].includes(c.player.position)?'수비 부담이 큰 포지션':p.id==='pitch-endurance'&&c.player.position==='선발'?'선발 이닝 소화 보완':mainIndices.some(i=>c.player.a[i]<55)?'현재 약점 보완':profile.repeat>=2?'반복 적응 · 효율 감소':({'bat-contact':'타석 전반의 안정성','bat-power':'장타 기여 확대','bat-approach':'출루와 타석 판단 보완','bat-field':'포지션 적응 보완','bat-running':'도루·주루 기회 확대','bat-condition':'회복력 유지','pitch-power':'빠른 공 경쟁력 강화','pitch-command':'볼넷 억제 보완','pitch-breaking':'구종 선택지 확장','pitch-endurance':'긴 이닝 소화 보완','pitch-bullpen':'짧은 이닝 집중력','pitch-condition':'견제와 회복력 보완'}[p.id]);if(c.age>=38)reason=p.recovery?'회복과 기량 유지':'기량 유지 중심 · 성장 제한';else if(c.recoveryState?.year===c.year)reason='복귀 단계 · 강도 조절';return {...p,enabled:profile.ids.length>0,capped,reason,efficiency:profile.efficiency};});}
export function programGrowth(c,selection,totalGrowth){
 const profile=programProfile(c,selection),weights=Array(6).fill(.35),cost=Array(6).fill(0),effects=[];
 // Keep absolute program weights; a capped skill never redistributes its budget.
 for(const p of profile.programs){let w=[...p.weights];if(p.id==='bat-field'){if(c.player.position==='포수')w[5]*=1.3;if(c.player.position==='지명타자')w[4]*=.6;}for(let i=0;i<6;i++){weights[i]+=w[i]/Math.max(1,profile.programs.length);cost[i]+=(p.cost?.[i]||0)/Math.max(1,profile.programs.length);}}
 for(let i=0;i<6;i++){const cap=c.potentialCaps?.[i]??95,room=Math.max(0,cap-c.player.a[i]),technical=limit(.55+(cap-c.player.a[i])/25,.55,1.15),gain=totalGrowth*weights[i]/9*profile.efficiency*technical,applied=Math.min(room,gain);effects.push({index:i,planned:gain,applied,blocked:gain-applied,cost:totalGrowth?cost[i]:0});}
 return {...profile,effects};
}
export function completeProgramSeason(c,profile,injury,stat,minorStat={}){
 const state=c.trainingState??={repeats:{},fatigue:0,durability:0,runningJudgment:0,pickoff:0,positionFamiliarity:{}};state.repeats??={};
 for(const p of PROGRAMS[c.player.role])state.repeats[p.id]=profile.ids.includes(p.id)?Math.min(8,(state.repeats[p.id]||0)+1):Math.max(0,(state.repeats[p.id]||0)-2);
 const volume=c.player.role==='bat'?((stat?.pa||0)+(minorStat.pa||0)*.7)/650:((stat?.outs||0)+(minorStat.outs||0)*.7)/(c.player.position==='선발'?540:210);state.workload={year:c.year,volume,pa:stat?.pa||0,outs:stat?.outs||0};
 state.fatigue=limit(profile.fatigue*.3+Math.max(0,profile.load)*18+Math.max(0,volume-1)*12+(injury?8:0)-(profile.recovery?10:0),0,80);
 state.durability=limit((state.durability||0)*.9+(profile.recovery?2.5:0),0,12);
 if(profile.ids.includes('bat-running'))state.runningJudgment=limit((state.runningJudgment||0)+1.2*profile.efficiency,0,8);
 if(profile.ids.includes('pitch-condition'))state.pickoff=limit((state.pickoff||0)+1.3*profile.efficiency,0,8);
 if(profile.ids.includes('bat-field')){state.positionFamiliarity??={};state.positionFamiliarity[c.player.position]=Math.min(100,(state.positionFamiliarity[c.player.position]||0)+25*profile.efficiency);}
 if(profile.ids.includes('pitch-breaking')){state.repertoire??={name:['슬라이더','체인지업','싱커'][Math.abs(c.seed)%3],mastery:0};state.repertoire.mastery=Math.min(100,state.repertoire.mastery+22*profile.efficiency);}
 return state;
}
