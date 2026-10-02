export const VERSION=2;
export const TEAMS=['LG 트윈스','롯데 자이언츠','SSG 랜더스','삼성 라이온즈','KIA 타이거즈','한화 이글스','KT 위즈','NC 다이노스','두산 베어스','키움 히어로즈'];
export const KEYS={bat:['컨택','파워','선구','주루','수비','송구'],pitch:['구속','제구','구위','체력','변화구','견제']};
export const TYPES={bat:['거포형','교타형','출루형','수비형'],pitch:['파이어볼러','제구형','변화구형','선발형','마무리형']};
export function rng(seed){let a=Number(seed)>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const clamp=(x,l=0,h=100)=>Math.max(l,Math.min(h,x));
export function abilities(type,role,seed){let r=rng(seed),a=Array.from({length:6},()=>Math.round(35+r()*24));let k=TYPES[role].indexOf(type);let strong=role==='bat'?[1,0,2,4][k]:[0,1,4,3,2][k];a[strong??0]+=21;a[(strong+2)%6]-=8;return a.map(v=>clamp(v));}
export function emptyBat(){return{g:0,pa:0,ab:0,h:0,d:0,t:0,hr:0,rbi:0,r:0,bb:0,k:0,sb:0,sf:0,hbp:0};}
export function emptyPitch(){return{g:0,gs:0,outs:0,w:0,l:0,hold:0,sv:0,k:0,bb:0,h:0,hr:0,r:0,er:0};}
export function rates(s,role){return role==='bat'?{avg:s.ab?s.h/s.ab:0,obp:s.ab+s.bb+s.hbp+s.sf?(s.h+s.bb+s.hbp)/(s.ab+s.bb+s.hbp+s.sf):0,slg:s.ab?(s.h+s.d+2*s.t+3*s.hr)/s.ab:0,ops:(s.ab?(s.h+s.d+2*s.t+3*s.hr)/s.ab:0)+(s.pa?(s.h+s.bb+s.hbp)/s.pa:0)}:{era:s.outs?s.er*27/s.outs:0,whip:s.outs?(s.bb+s.h)*3/s.outs:0};}
export function sumStats(rows,role){let s=role==='bat'?emptyBat():emptyPitch();for(let row of rows)for(let k of Object.keys(s))s[k]+=row[k]||0;return s;}
function person(id,team,role,i,r){const surn=['김','이','박','최','정','강','윤','장','임','한'];const names=['도윤','시우','지호','태준','건우','서진','유찬','하준','민재','도현','우진','현서'];return{id,name:surn[Math.floor(r()*10)]+names[Math.floor(r()*12)],team,role,position:role==='bat'?['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'][i%9]:i<6?'선발':i===11?'마무리':'중간계투',a:Array.from({length:6},()=>Math.round(35+r()*45+(team-4.5))),rookie:r()<.1,stat:role==='bat'?emptyBat():emptyPitch()};}
export function simulateSeason({seed,year,player=null,games=144,environment=1,level='major',strength=0}){
 const random=rng(seed+year*7919),players=[],teams=TEAMS.map((name,id)=>({id,name,w:0,l:0,tie:0,r:0,ra:0,g:0,park:.94+id*.014,bats:[],arms:[]}));
 for(let team of teams){for(let i=0;i<12;i++){let p=person(`${team.id}-b${i}`,team.id,'bat',i,random);p.a=p.a.map(v=>clamp(v+strength));players.push(p);team.bats.push(p);}for(let i=0;i<14;i++){let p=person(`${team.id}-p${i}`,team.id,'pitch',i,random);p.a=p.a.map(v=>clamp(v+strength));players.push(p);team.arms.push(p);}}
 let user;if(player){user={...player,id:'user',stat:player.role==='bat'?emptyBat():emptyPitch()};players.push(user);}
 const active=(day)=>user&&(!player.eligibleDays||player.eligibleDays[day])&&day>=Math.round((player.missed||0)*games/144)&&random()<(player.opportunity??.8);
 function game(at,home,day){let tt=[at,home],scores=[0,0],idx=[0,0],bats=tt.map(t=>{const lineup=t.bats.slice(0,9);for(let i=0;i<3;i++)if(random()<.32)lineup[(day+i*3)%9]=t.bats[9+i];return lineup;}),arms=tt.map(t=>[...t.arms]),used=[new Map(),new Map()],leadWinner=null,loser=null,cameo=null;
 if(active(day)){let side=tt.findIndex(t=>t.id===user.team);if(side>=0){if(user.role==='bat'){let slot=bats[side].findIndex(p=>p.position===user.position);if(player.cameo)cameo={side,slot:slot<0?8:slot};else bats[side][slot<0?8:slot]=user;}else if(user.position==='선발'){if(day%5===0&&random()<clamp(.76+(readiness(user)-50)*.006,.55,.98))arms[side][0]=user;}else arms[side].push(user);}}
 bats.flat().forEach(p=>p.stat.g++);
 const starters=arms.map((a,side)=>a[random() < ((user?.role==='pitch'&&user.position==='선발'&&tt[side].id===user.team) ? .10 : .16) ? 5 : day%5]),current=[...starters],arm=(side)=>current[side];
 const chooseReliever=(side,inning)=>{const lead=scores[side]-scores[1-side],available=arms[side].slice(6).filter(p=>!used[side].has(p.id));let pool=available.filter(p=>day-(p.lastDay??-10)>=1);if(!pool.length)pool=available;if(!pool.length)return starters[side];const wantCloser=inning>=8&&lead>=-1&&lead<=3,wantSetup=inning===7&&lead>0&&lead<=3;if(!wantCloser&&pool.some(p=>p.position!=='마무리'))pool=pool.filter(p=>p.position!=='마무리');pool.sort((a,b)=>{const grade=p=>{let rest=day-(p.lastDay??-10),fatigue=rest===1?-35:rest===2?-8:0,role=p.position==='마무리'?1:0,fit=wantCloser?(role?24:-5):0;return readiness(p)*(wantSetup?.55:.27)+fit+fatigue;};return grade(b)-grade(a)||a.id.localeCompare(b.id);});const top=pool.slice(0,wantCloser||wantSetup?1:Math.min(3,pool.length));return top[Math.floor(random()*top.length)];};
 for(let inn=0;inn<9;inn++)for(let offense=0;offense<2;offense++){
 if(cameo&&inn===6&&offense===cameo.side){bats[cameo.side][cameo.slot]=user;user.stat.g++;}
 let defense=1-offense;if(inn>0){let prior=used[defense].get(current[defense].id),starter=current[defense]===starters[defense],batters=prior?.batters||0,runs=prior?.r||0,stamina=current[defense].a[3];let close=scores[defense]-scores[offense];let pull=starter?(inn>=3&&(batters>17+stamina*.12||runs>=5||inn>=5&&random()<.42+(65-stamina)*.006||inn>=7)):(prior?.outs>=6||prior?.outs>=3&&random()<.53||inn===7&&close>0&&close<=3&&random()<.8||inn===8&&close>=-1&&close<=3&&current[defense].position!=='마무리'&&random()<.8);if(pull)current[defense]=chooseReliever(defense,inn);}
 let p=arm(defense),s=p.stat;let entry=scores[defense]-scores[offense];if(!used[defense].has(p.id)){s.g++;if(inn===0)s.gs++;p.lastDay=day;used[defense].set(p.id,{p,outs:0,r:0,batters:0,entry,exit:entry});}
 let out=0,bases=[null,null,null],counter=0;const charge=()=>{s.r++;s.er++;used[defense].get(p.id).r++;};
 const score=(runner,batter)=>{scores[offense]++;runner.stat.r++;batter.stat.rbi++;charge();if(scores[offense]===scores[defense]+1){leadWinner=arm(offense,Math.max(0,inn-(offense===0?1:0)));loser=p;}};
 while(out<3){let b=bats[offense][idx[offense]++%9],bs=b.stat;bs.pa++;counter++;used[defense].get(p.id).batters++;let [contact,power,eye,speed]=b.a,[velo,control,stuff,stamina,breaking]=p.a;let fatigue=inn>=4?(55-stamina)*.0005:0;let walk=clamp(.096+(eye-control)*.001, .03,.18),strike=clamp(.2+(stuff+velo+breaking-3*contact)*.0005-fatigue,.08,.38),hr=clamp((.027+(power-(stuff+velo)/2)*.00048)*environment*tt[1].park,.003,.08);let defenseSkill=bats[defense].reduce((n,x)=>n+(x.a[4]+x.a[5])/2,0)/9;let hit=clamp((.300+(contact-(stuff+breaking)/2)*.001+(55-defenseSkill)*.0005+fatigue)*environment,.14,.37);let u=random();
 if(u<walk){bs.bb++;s.bb++;if(bases[0]){if(bases[1]){if(bases[2])score(bases[2],b);bases[2]=bases[1];}bases[1]=bases[0];}bases[0]=b;}
 else{bs.ab++;if(u<walk+strike||counter>80){bs.k++;s.k++;out++;s.outs++;used[defense].get(p.id).outs++;}
 else if(u<walk+strike+hr){bs.h++;bs.hr++;s.h++;s.hr++;for(let runner of bases)if(runner)score(runner,b);score(b,b);bases=[null,null,null];}
 else if(u<walk+strike+hr+hit*(1-walk-strike-hr)){bs.h++;s.h++;let extra=random(),n=extra<.045*(speed/65)?3:extra<.25?2:1;if(n===2)bs.d++;if(n===3)bs.t++;for(let k=2;k>=0;k--)if(bases[k]){let runner=bases[k];bases[k]=null;let advance=k+n;if(n===1&&k===1&&random()<.6)advance=3;if(n===1&&k===0&&random()<.3)advance=2;if(n===2&&k===0&&random()<.55)advance=3;if(advance>=3)score(runner,b);else{if(bases[advance])score(bases[advance],b);bases[advance]=runner;}}bases[n-1]=b;if(n===1&&!bases[1]&&random()<speed*.002*(1-p.a[5]/160)){bases[1]=bases[0];bases[0]=null;bs.sb++;}}
 else{out++;s.outs++;used[defense].get(p.id).outs++;if(out<3&&bases[2]&&random()<.22){bs.ab--;bs.sf++;score(bases[2],b);bases[2]=null;}}}
 }
 used[defense].get(p.id).exit=scores[defense]-scores[offense];
 }
 tt.forEach((t,i)=>{t.g++;t.r+=scores[i];t.ra+=scores[1-i];});
 if(scores[0]===scores[1])tt.forEach(t=>t.tie++);else{let win=scores[0]>scores[1]?0:1;tt[win].w++;tt[1-win].l++;let usedWin=[...used[win].values()];let credit=usedWin.find(v=>v.p.id===leadWinner?.id);if(!credit||credit.p===starters[win]&&credit.outs<15)credit=usedWin.filter(v=>v.p!==starters[win]).sort((a,b)=>(a.r-b.r)||(b.outs-a.outs))[0]||usedWin[0];credit.p.stat.w++;if(loser)loser.stat.l++;let finish=usedWin.at(-1);if(finish!==credit&&finish.entry>0&&finish.entry<=3&&finish.exit>0)finish.p.stat.sv++;for(let v of usedWin.slice(1,-1))if(v!==credit&&v.entry>0&&v.entry<=3&&v.exit>0)v.p.stat.hold++;}
 }
 // Circle scheduling: nine rounds repeated sixteen times; every team plays once each day.
 let circle=Array.from({length:10},(_,i)=>i);for(let day=0;day<games;day++){for(let k=0;k<5;k++){let a=circle[k],b=circle[9-k];game(teams[day%2?a:b],teams[day%2?b:a],day);}circle.splice(1,0,circle.pop());}
 const result={year,games,environment,level,players,teams:teams.map(({bats,arms,...t})=>t)};result.awards=level==='major'?awards(result):[];return result;
}
export const TITLES=[['다승','pitch','w',false],['세이브','pitch','sv',false],['홀드','pitch','hold',false],['탈삼진','pitch','k',false],['평균자책','pitch','era',true],['최다안타','bat','h',false],['타율','bat','avg',true],['홈런','bat','hr',false],['타점','bat','rbi',false],['도루','bat','sb',false],['출루율','bat','obp',true],['장타율','bat','slg',true]];
export function ranking(season,role,key,qualified=false){return season.players.filter(p=>p.role===role&&p.stat.g>0&&(!qualified||(role==='bat'?p.stat.pa>=Math.ceil(season.games*3.1):p.stat.outs>=season.games*3))).map(p=>({...p,value:statValue(p.stat,role,key)})).sort((a,b)=>(['era','whip','bb9','kRate'].includes(key)?a.value-b.value:b.value-a.value)||a.id.localeCompare(b.id));}
export function voteScore(p,season){let s=p.stat,r=rates(s,p.role),team=season.teams.find(t=>t.id===p.team);return p.role==='bat'?(r.ops*.7+s.hr*.006+s.rbi*.002)*(s.pa/600)+p.a[4]*s.g/14400+(team?.w||0)*.001:((4.7-r.era)*s.outs/540+s.k*.002+s.sv*.02+s.hold*.012)+(team?.w||0)*.001;}
export function awards(season){if(season.level&&season.level!=='major')return [];let result=TITLES.map(([title,role,key,q])=>{let rows=ranking(season,role,key,q);return{title,winners:rows.length?rows.filter(p=>p.value===rows[0].value).map(p=>p.id):[],value:rows[0]?.value};});const choose=(title,rows)=>{rows=rows.filter(p=>p.stat.g>0).sort((a,b)=>voteScore(b,season)-voteScore(a,season)||a.id.localeCompare(b.id));result.push({title,winners:rows.slice(0,1).map(p=>p.id),candidates:rows.slice(0,3).map(p=>({id:p.id,score:voteScore(p,season)}))});};choose('MVP',season.players);choose('신인왕',season.players.filter(p=>p.rookie));for(let pos of [...new Set(season.players.map(p=>p.position))])choose(`베스트글러브 · ${pos}`,season.players.filter(p=>p.position===pos));return result;}

// All monetary values in version 2 are integers measured in 만원.
export const MIN_SALARY = 3300;
export const LEVELS = ['2군 준주전','2군 주전','1군 백업','1군 준주전','1군 주전'];
export const SAVE_KEY = 'diamond-days-v2';
export function money(man=0) {
  if (!Number.isFinite(man)) return '미기록';
  return Math.abs(man)<10000 ? `${Math.round(man)}만원` : `${Number((man/10000).toFixed(2))}억`;
}
const freshStat = role => role==='bat'?emptyBat():emptyPitch();
const note = (c,text) => c.events.push({year:c.year,text});
export function createCareer(config) {
  return {
    version:VERSION, seed:Number(config.seed), player:{...config,team:Number(config.team),a:abilities(config.type,config.role,config.seed)},
    age:18,year:2027,stage:'고교',phase:'season',history:[],events:[],service:0,served:false,
    proYears:0,collegeSeasons:0,collegeGraduate:false,contract:null,condition:100,gameSense:100,
    adapt:0,injuries:0,retired:false,training:[0],faCount:0,faCycleStart:0,faDeclared:false,
    salaryLedger:[],contractHistory:[],signingIncome:0,allowanceIncome:0,draftAttempts:[],reserved:false
  };
}
export function trainingPlan(selected) {
  if (!Array.isArray(selected)||!selected.length||selected.length>3||new Set(selected).size!==selected.length||selected.some(i=>!Number.isInteger(i)||i<0||i>5)) throw Error('훈련은 서로 다른 능력치 1~3개를 선택하세요.');
  return {selected:[...selected],hoursEach:Math.round(100/selected.length),gainEach:3/selected.length};
}
export function readiness(p) {
  let a=p.a;
  return p.role==='bat'?a[0]*.3+a[1]*.25+a[2]*.2+a[4]*.15+a[3]*.1:a[1]*.3+a[2]*.3+a[4]*.2+a[0]*.1+a[3]*.1;
}
function performance(stat,role) {
  let r=rates(stat,role);
  return role==='bat'?clamp((r.ops-.42)*110,0,100):stat.outs?clamp(100-r.era*11-r.whip*8,0,100):0;
}
export function rosterPlan(c,missed=0) {
  const p=c.player,last=c.history.filter(x=>x.stage==='프로'&&!x.military&&x.role===p.role).at(-1);
  const sample=last?(p.role==='bat'?(last.stat.pa||0)+(last.minorStat?.pa||0):(last.stat.outs||0)+(last.minorStat?.outs||0))/ (p.role==='bat'?350:210):0;
  const recent=last?performance(last.stat.g?last.stat:last.minorStat||freshStat(p.role),p.role):50;
  const form=50+(recent-50)*Math.min(1,sample);
  const depth=(rng(c.seed+c.year*17+p.team*71)()-.5)*5;
  const score=readiness(p)+(form-50)*.08+depth-(c.adapt?8:0)-(100-c.gameSense)*.1+(c.positionOpportunityUntil>=c.year?4:0);
  let tier=score<44?0:score<54?1:score<62?2:score<71?3:4;
  if(c.developmental&&c.proYears===0&&readiness(p)<82)tier=Math.min(tier,1);
  if(c.developmental&&c.proYears===1&&sample<.6)tier=Math.min(tier,2);
  const rosterFraction=[.02,.12,.55,.84,1][tier];
  const r=rng(c.seed+c.year*107),roster=Array(144).fill(false);
  // Roster moves occur in 12-game blocks; days off count toward registration too.
  for(let start=0;start<144;start+=12){const on=r()<rosterFraction;for(let d=start;d<start+12;d++)roster[d]=on;}
  const injured=day=>day>=42&&day<42+missed;
  const majorDays=roster.map((on,d)=>on&&!injured(d));
  const minorDays=Array.from({length:108},(_,d)=>{let calendar=Math.floor(d*144/108);return !roster[calendar]&&!injured(calendar);});
  let registeredDays=0;
  for(let day=0;day<188;day++){let gameDay=Math.min(143,Math.floor(day*144/188));if(majorDays[gameDay])registeredDays++;}
  return {tier,label:LEVELS[tier],score,roster,majorDays,minorDays,registeredDays,majorOpportunity:[.6,.65,.65,.86,.98][tier],minorOpportunity:tier===0?.65:.92,cameo:tier===2};
}
export function injuryForecast(c) {
  const r=rng(c.seed+c.year*31+c.history.length);
  if(c.service||r()>=clamp(.12+c.injuries*.025+(c.recurrenceAdjustment||0),.03,.5))return null;
  const days=14+Math.floor(r()*66);
  return {name:days>50?'근육 손상':'피로성 통증',days};
}
export function faStatus(c) {
  const rows=c.history.filter(x=>x.stage==='프로'&&!x.military&&x.year>=c.faCycleStart);
  const full=rows.filter(x=>(x.registeredDays||0)>=145).length;
  const partial=rows.filter(x=>(x.registeredDays||0)<145).reduce((s,x)=>s+(x.registeredDays||0),0);
  const seasons=full+Math.floor(partial/145),required=c.faCount?4:c.collegeGraduate?7:8;
  const contractBlocked=c.contract?.kind==='fa'&&c.contract.left>0;
  return {seasons,required,partialDays:partial%145,eligible:seasons>=required&&!contractBlocked,contractBlocked};
}
export function draftAssessment(c) {
  const rows=c.history.filter(x=>['고교','대학'].includes(x.stage)&&x.role===c.player.role&&!x.military).slice(-2);
  const stat=sumStats(rows.map(x=>x.stat),c.player.role);
  const sample=c.player.role==='bat'?stat.pa:stat.outs;
  const sampleWeight=clamp(sample/(c.player.role==='bat'?100:90),0,1);
  const statScore=performance(stat,c.player.role);
  const score=clamp(readiness(c.player)*.4+(statScore*sampleWeight+45*(1-sampleWeight))*.6-Math.max(0,c.age-19)*1.1,0,100);
  const probability=clamp(1/(1+Math.exp(-(score-46)/10)),.03,.97);
  const round=clamp(Math.round(14-score*.15),1,11);
  return {score,probability,roundLow:clamp(round-2,1,11),roundHigh:clamp(round+2,1,11),sample,provisional:sampleWeight<1,stat};
}
export function collegeEarlyStatus(c) {
  const scout=draftAssessment(c);
  return {eligible:c.stage==='대학'&&!c.service&&c.collegeSeasons===2&&scout.score>=58&&!c.draftAttempts.some(x=>x.kind==='early'),score:scout.score,threshold:58};
}
export function enterCollege(c) {
  if(c.stage!=='고교'||!['path','draft_result'].includes(c.phase)||c.lastDraft?.selected)throw Error('현재 대학 진학을 선택할 수 없습니다.');
  c.stage='대학';c.collegeSeasons=0;c.phase='prepare';note(c,'대학 진학');
}
function reservedContract(annualMan=MIN_SALARY) {return {kind:'reserved',annualMan,years:1,left:1,totalMan:annualMan,guaranteedMan:annualMan,signingBonusMan:0};}
export function runDraft(c,kind='regular') {
  if(kind==='early'&&!collegeEarlyStatus(c).eligible)throw Error('2학년 성적 우수 선수만 얼리드래프트에 참가할 수 있습니다.');
  if(kind!=='early'&&!['path','draft'].includes(c.phase))throw Error('현재 드래프트 참가 시점이 아닙니다.');
  if(c.draftAttempts.some(x=>x.year===c.year))throw Error('이번 드래프트 결과는 이미 확정되었습니다.');
  const scout=draftAssessment(c),r=rng(c.seed+c.year*401+17),selected=r()<scout.probability;
  const round=scout.roundLow+Math.floor(r()*(scout.roundHigh-scout.roundLow+1)),pick=1+Math.floor(r()*10);
  // Simulated previous standings determine draft order. Preference never enters selection.
  const order=TEAMS.map((_,i)=>i).sort((a,b)=>rng(c.seed+(c.year-1)*19+a*53)()-rng(c.seed+(c.year-1)*19+b*53)());
  const result={year:c.year,kind,selected,round:selected?round:null,pick:selected?(round-1)*10+pick:null,team:selected?order[pick-1]:null,scout};
  c.draftAttempts.push(result);c.lastDraft=result;c.phase='draft_result';
  if(selected){
    c.player.team=result.team;c.stage='프로';c.reserved=true;c.contract=reservedContract();
    const bonus=Math.round((12-round)**2*400+1000);c.signingIncome+=bonus;result.bonusMan=bonus;
    note(c,`${TEAMS[result.team]} ${round}라운드 전체 ${result.pick}순위 지명 · 계약금 ${money(bonus)} · 연봉 ${money(MIN_SALARY)}`);
  } else note(c,`${kind==='early'?'얼리드래프트':'신인 드래프트'} 미지명`);
  return result;
}
export function finishDraft(c) {
  if(c.phase!=='draft_result')throw Error('드래프트 결과 화면이 아닙니다.');
  if(c.lastDraft.selected||c.lastDraft.kind==='early')c.phase='prepare';
  else if(c.stage==='고교')c.phase='path';
  else c.phase='undrafted';
}
export function developmentalTryout(c) {
  if(!['undrafted','draft_result','path'].includes(c.phase)||!c.lastDraft||c.lastDraft.selected)throw Error('미지명 선수만 육성 입단 테스트를 신청할 수 있습니다.');
  const r=rng(c.seed+c.year*701);const team=Math.floor(r()*10);
  // A single recruitment result, not an open FA auction.
  c.player.team=team;c.stage='프로';c.reserved=true;c.contract=reservedContract();c.developmental=true;c.phase='prepare';
  note(c,`${TEAMS[team]} 육성 입단 테스트 통과 · 연봉 ${money(MIN_SALARY)}`);
}
export function declareFA(c) {
  if(c.phase!=='fa_choice'||!faStatus(c).eligible)throw Error('FA 자격을 아직 충족하지 못했습니다.');
  c.faDeclared=true;c.reserved=false;c.phase='market';note(c,'FA 권리 행사 승인 · 타 구단 협상 가능');
}
export function offers(c) {
  if(c.phase!=='market'||!c.faDeclared)return [];
  const r=rng(c.seed+c.year*17),recent=c.history.filter(x=>!x.military&&x.stage==='프로').slice(-3),last=recent.at(-1);
  const seasonValue=row=>{const s=row.stat,v=rates(s,row.role);return row.role==='bat'?clamp((v.ops-.58)/.38,0,1.4)*Math.min(1,s.pa/520):row.position==='선발'?clamp((6.4-v.era)/4.4,0,1.3)*Math.min(1,s.outs/450):clamp((6-v.era)/4.5,0,1.2)*Math.min(1,s.outs/150)+Math.min(.3,(s.sv+s.hold)/100);};
  const value=recent.reduce((n,row,i)=>n+seasonValue(row)*[.2,.3,.5][3-recent.length+i],0);
  const grade=c.age>=35||c.faCount>=2?'C':(c.contract?.annualMan||0)>=50000?'A':(c.contract?.annualMan||0)>=15000?'B':'C';
  return [c.player.team,(c.player.team+3)%10,(c.player.team+7)%10].map((team,i)=>{
    const years=c.age>36?2:c.age>33?3:3+(r()>.4?1:0),ageFactor=c.age>36?.66:c.age>33?.85:1;
    const demand=1+(r()-.5)*.28+(team===c.player.team?.04:0)+(c.player.position==='포수'||c.player.position==='유격수'?.08:0)-(team!==c.player.team?(grade==='A'?.08:grade==='B'?.04:0):0);
    const annualMan=Math.max(MIN_SALARY,Math.round((3500+value*90000)*ageFactor*demand/100)*100);
    const signingBonusMan=Math.round(annualMan*(.55+r()*.45)/100)*100,optionMan=Math.round(annualMan*years*(.08+r()*.12)/100)*100;
    const guaranteedMan=annualMan*years+signingBonusMan,totalMan=guaranteedMan+optionMan;
    const compensation=grade==='A'?'전년도 연봉 200% + 보호 외 선수 1명(20인) 또는 300%':grade==='B'?'전년도 연봉 100% + 보호 외 선수 1명(25인) 또는 200%':'전년도 연봉 150% · 보상선수 없음';
    return {kind:'fa',team,years,left:years,annualMan,totalMan,guaranteedMan,optionMan,signingBonusMan,grade,compensation,role:i===1?'주전 경쟁':'주전 예상',power:Math.round(50+((last?.league?.teams.find(t=>t.id===team)?.w||72)-72)*.8),opportunity:rosterPlan(c).majorOpportunity};
  });
}
export function sign(c,offer) {
  if(c.phase!=='market'||!c.faDeclared||!offer||!offers(c).some(x=>x.team===offer.team&&x.totalMan===offer.totalMan))throw Error('FA 선언 후 유효한 제안만 선택할 수 있습니다.');
  c.player.team=offer.team;c.contract={...offer};c.faCount++;c.faCycleStart=c.year;c.faDeclared=false;c.reserved=true;c.signingIncome+=offer.signingBonusMan;c.phase='prepare';
  (c.contractHistory??=[]).push({year:c.year,...offer});
  note(c,`${TEAMS[offer.team]} FA 계약 · ${offer.years}년 ${money(offer.totalMan)} · 연봉 ${money(offer.annualMan)}`);
}
function renewSalary(c) {
  const last=c.history.filter(x=>x.stage==='프로'&&!x.military).at(-1);
  const old=c.contract?.annualMan||MIN_SALARY;
  const value=last?Math.max(0,voteScore({...c.player,role:last.role,stat:last.stat},last.league||c.latest)):0;
  const target=MIN_SALARY+value*11500;
  const annual=Math.max(MIN_SALARY,Math.round((old*.55+target*.45)/100)*100);
  c.contract=reservedContract(annual);c.reserved=true;
  note(c,`${TEAMS[c.player.team]} 보류 유지 · 연봉 ${money(old)} → ${money(annual)}`);
}
export function deferFA(c) {
  if(c.phase!=='fa_choice')throw Error('현재 FA 선언 시점이 아닙니다.');
  renewSalary(c);c.phase='prepare';note(c,'FA 선언 유보 · 자격 유지');
}
export function salaryOffer(c) {
  const last=c.history.filter(x=>x.stage==='프로'&&!x.military).at(-1),old=c.contract?.annualMan||MIN_SALARY;
  const value=last?Math.max(0,voteScore({...c.player,role:last.role,stat:last.stat},last.league||c.latest)):0;
  return Math.max(MIN_SALARY,Math.round((old*.55+(MIN_SALARY+value*11500)*.45)/100)*100);
}
export function negotiateSalary(c,counter=false) {
  if(c.phase!=='prepare'||c.stage!=='프로'||!c.salaryPending)throw Error('현재 연봉 협상 시점이 아닙니다.');
  const base=salaryOffer(c),accepted=counter&&rng(c.seed+c.year*83+7)()<.48,annual=accepted?Math.round(base*1.13/100)*100:base;
  c.contract=reservedContract(annual);c.reserved=true;c.salaryPending=false;
  (c.contractHistory??=[]).push({year:c.year,kind:'reserved',team:c.player.team,years:1,annualMan:annual,totalMan:annual,guaranteedMan:annual,optionMan:0,signingBonusMan:0});
  note(c,`${TEAMS[c.player.team]} 연봉 협상 · ${counter?(accepted?'인상 요청 수용':'인상 요청 거절 · 기본 제안 수락'):'기본 제안 수락'} · ${money(annual)}`);
  return {accepted,annual};
}
export function requestTrade(c) {
  if(c.phase!=='prepare'||c.stage!=='프로'||c.service||c.proYears<2||c.tradeRequestYear===c.year)throw Error('현재 트레이드를 요청할 수 없습니다.');
  c.tradeRequestYear=c.year;
  const r=rng(c.seed+c.year*619),value=readiness(c.player),contractBlock=c.contract?.kind==='fa'&&c.contract.left>1;
  const accepted=!contractBlock&&r()<clamp(.22+(value-50)*.004,.1,.5);
  if(accepted){const old=c.player.team,team=(old+1+Math.floor(r()*9))%10;c.player.team=team;note(c,`트레이드 요청 수용 · ${TEAMS[old]} → ${TEAMS[team]} · 기존 계약 승계`);}
  else note(c,contractBlock?'트레이드 요청 거절 · 다년 계약과 구단 전력 계획':'트레이드 요청 거절 · 구단 전력과 선수 가치 평가');
  return accepted;
}
export function sangmuRecruitment(c) {
  const slots=c.player.role==='pitch'?8:10;
  const last=c.history.filter(x=>x.stage==='프로'&&!x.military&&x.role===c.player.role).at(-1);
  const form=last?performance(last.stat.g?last.stat:last.minorStat||freshStat(c.player.role),c.player.role):35;
  const probability=clamp(.25+(readiness(c.player)-50)*.009+(form-45)*.004,.08,.76);
  const eligible=c.age<=27&&c.proYears>=1&&!c.served&&!c.service;
  return {slots,probability,eligible,alreadyApplied:c.athleticTried===c.year};
}
export function enlist(c,path) {
  if(c.phase!=='prepare'||c.service||c.served||c.stage==='고교')throw Error('현재 입대할 수 없습니다.');
  if(path==='athletic'){
    const recruitment=sangmuRecruitment(c);
    if(!recruitment.eligible||!recruitment.slots||recruitment.alreadyApplied)throw Error('지원 조건 또는 올해 모집 정원을 확인하세요.');
    c.athleticTried=c.year;
    if(rng(c.seed+c.year*983+19)()>=recruitment.probability){note(c,'상무 선발 탈락 · 현역 입대 또는 다음 해 재지원 가능');return false;}
  }
  c.service=2;c.servicePath=path;c.phase='prepare';note(c,path==='athletic'?'상무 합격 · 입대':'현역 입대');return true;
}
export function positionOffer(c) {
  if(c.stage!=='프로'||c.phase!=='prepare'||c.service||c.adapt||c.proYears<2||c.positionDecisionYear===c.year||c.year%3!==0)return null;
  const p=c.player;
  const target=p.role==='bat'?(p.a[4]<50&&p.position!=='지명타자'?'지명타자':null):(p.position==='선발'&&p.a[3]<60?'중간계투':p.position!=='선발'&&p.a[3]>=72?'선발':null);
  if(!target)return null;
  return {target,benefit:p.role==='bat'?'수비 부담 감소 · 2시즌 출전 평가 +4':'체력에 맞는 보직 · 2시즌 출전 평가 +4',cost:p.role==='bat'?'수비 -2 · 적응 1시즌':'제구 +1 · 적응 1시즌',opportunity:target==='선발'?'로테이션 진입 시 약 29선발':target==='중간계투'?'불펜 경쟁 · 등판 최대 72경기':'지명타자 자리 경쟁'};
}
export function changePosition(c) {
  const offer=positionOffer(c);if(!offer)throw Error('현재 포지션 변경 제안이 없습니다.');
  const previous=c.player.position;c.player.position=offer.target;c.positionDecisionYear=c.year;c.positionOpportunityUntil=c.year+1;c.adapt=1;
  if(c.player.role==='bat')c.player.a[4]=clamp(c.player.a[4]-2);else c.player.a[1]=clamp(c.player.a[1]+1);
  note(c,`코치 제안 수락 · ${previous} → ${offer.target} · 적응 1시즌`);
}
export function conversionOffer(c) {
  if(c.converted||c.conversionDeclined||c.service||c.age<24||c.stage!=='프로')return null;
  const rows=c.history.filter(x=>x.stage==='프로'&&!x.military&&x.role===c.player.role).slice(-3);
  if(rows.length!==3)return null;
  const bad=rows.every(row=>{
    const stat=sumStats([row.stat,row.minorStat||freshStat(row.role)],row.role),r=rates(stat,row.role);
    return row.role==='bat'?stat.pa>=80&&r.ops<.53:stat.outs>=60&&r.era>=7.5&&r.whip>=1.8;
  });
  return bad?{reason:c.player.role==='bat'?'최근 3시즌 모두 80타석 이상·OPS .530 미만':'최근 3시즌 모두 20이닝 이상·ERA 7.50 이상·WHIP 1.80 이상',target:c.player.role==='bat'?'투수':'타자'}:null;
}
export function convert(c) {
  if(!conversionOffer(c))throw Error('지속적인 극심한 부진으로 전향 제안을 받은 경우에만 선택할 수 있습니다.');
  const old=c.player.role,a=c.player.a;c.player.role=old==='bat'?'pitch':'bat';
  c.player.a=(old==='bat'?[a[5],a[2]*.7,a[1]*.65,a[3]*.7,30,40]:[a[1]*.7,a[0]*.65,35,40,a[5]*.7,a[0]]).map(Math.round);
  c.player.position=old==='bat'?'중간계투':'우익수';c.adapt=2;c.converted=true;
  note(c,`${old==='bat'?'타자 → 투수':'투수 → 타자'} 전향 · 2시즌 적응`);
}
export function progress(c,selected=c.training) {
  if(c.retired||!['prepare','season','incident'].includes(c.phase))throw Error('시즌 진행 단계에서만 진행할 수 있습니다.');
  const plan=trainingPlan(selected);c.training=plan.selected;
  const p=c.player,r=rng(c.seed+c.year*31+c.history.length+233),military=c.service>0;
  const report=[],aBefore=[...p.a];let injury=injuryForecast(c),missed=0;
  if(injury){missed=Math.max(7,injury.days+(c.rehabChoice==='safe'?14:c.rehabChoice==='fast'?-10:0));injury={...injury,days:missed};c.injuries++;c.recurrenceAdjustment=c.rehabChoice==='safe'?-.04:c.rehabChoice==='fast'?.06:0;report.push(`${injury.name} · ${missed}경기 결장 · ${c.rehabChoice==='fast'?'조기 복귀':'재활'}`);}
  const roster=rosterPlan(c,missed),environment=.96+(c.year%5)*.025;
  let league=null,minorLeague=null,stat=freshStat(p.role),minorStat=freshStat(p.role),level=c.stage,registeredDays=0;
  const effectiveA=p.a.map(v=>clamp(v-(100-c.gameSense)*.075));
  if(c.stage==='프로'){
    league=simulateSeason({seed:c.seed,year:c.year,environment,level:'major',player:military?null:{...p,a:effectiveA,opportunity:roster.majorOpportunity,eligibleDays:roster.majorDays,cameo:roster.cameo,rookie:c.proYears===0}});
    stat=league.players.find(x=>x.id==='user')?.stat||stat;
    registeredDays=military?0:roster.registeredDays;level=military?(c.servicePath==='athletic'?'상무':'현역'):roster.label;
    if(!military||c.servicePath==='athletic'){
      minorLeague=simulateSeason({seed:c.seed+991,year:c.year,games:108,environment,level:'minor',strength:-12,player:{...p,a:effectiveA,opportunity:military?.85:roster.minorOpportunity,eligibleDays:military?undefined:roster.minorDays}});
      minorStat=minorLeague.players.find(x=>x.id==='user').stat;
      minorLeague.teams.forEach(t=>t.name=military&&t.id===p.team?'상무':`${TEAMS[t.id]} 2군`);
    }
  }else if(!military){
    league=simulateSeason({seed:c.seed,year:c.year,games:36,environment,level:'amateur',strength:c.stage==='고교'?-18:-12,player:{...p,a:effectiveA,opportunity:.94,missed}});
    stat=league.players.find(x=>x.id==='user').stat;
    league.teams.forEach(t=>t.name=t.id===p.team?(c.stage==='고교'?p.school:'대학 야구부'):`${c.stage==='고교'?'고교':'대학'} ${t.id+1}팀`);
  }
  const experience=military?(c.servicePath==='athletic'?.8:.2):clamp((stat.g+minorStat.g)/100,.2,1);
  for(let i=0;i<6;i++){
    const ageGrowth=c.age<25?1.4:c.age<30?.4:c.age<34?-.5:-1.5;
    const practice=plan.selected.includes(i)?plan.gainEach:0;
    const activeTraining=military&&c.servicePath==='regular'?0:military?practice*.6:practice;
    const growth=military&&c.servicePath==='regular'?-.2:ageGrowth*experience;
    const variation=military&&c.servicePath==='regular'?-r()*.6:(r()-.5)*1.2;
    p.a[i]=clamp(Math.round((p.a[i]+growth+activeTraining+(p.team%3-1)*.12+variation-(injury?.5:0))*10)/10);
  }
  if(military){
    if(r()<.42){let i,delta,text;
      if(c.servicePath==='athletic'){i=p.role==='pitch'?1:0;delta=2+Math.floor(r()*3);text=p.role==='pitch'?'상무 코치와 투구 동작 교정':'상무 실전 타격 훈련';}
      else{i=3;delta=1+Math.floor(r()*2);text='현역 복무 중 기초 체력 유지';}
      if(r()<.2){delta=-2;text='복무 중 훈련 공백';}
      p.a[i]=clamp(p.a[i]+delta);report.push(`${text} · ${KEYS[p.role][i]} ${delta>0?'+':''}${delta}`);
    }
    c.gameSense=c.servicePath==='athletic'?92:Math.max(35,c.gameSense-30);c.service--;
    if(!c.service){c.served=true;report.push(`전역 · 경기감각 ${c.gameSense}/100`);}
  }else c.gameSense=clamp(c.gameSense+30);
  if(c.adapt>0&&!military)c.adapt--;
  c.condition=injury?(c.rehabChoice==='safe'?90:72):Math.min(100,c.condition+12);
  let salaryMan=0,allowanceMan=0;
  if(c.stage==='프로'){
    if(military){allowanceMan=Math.min(1200,Math.round((c.contract?.annualMan||MIN_SALARY)*.25));c.allowanceIncome+=allowanceMan;}
    else {salaryMan=c.contract?.annualMan||MIN_SALARY;c.proYears++;if(c.contract)c.contract.left=Math.max(0,c.contract.left-1);}
    c.salaryLedger.push({year:c.year,salaryMan,allowanceMan,team:p.team});
  }
  if(c.stage==='대학'&&!military)c.collegeSeasons++;
  if(c.year%4===0&&c.stage==='프로'&&!military&&stat.g){
    const mine=league.players.find(x=>x.id==='user');
    const pool=league.players.filter(x=>x.position===p.position).sort((a,b)=>voteScore(b,league)+readiness(b)/100-voteScore(a,league)-readiness(a)/100);
    const rank=pool.findIndex(x=>x.id==='user');
    if(rank>=0&&rank<5)report.push(rank<2?`국가대표 최종 선발 · 대회 ${r()<.35?'우승':'4강'}`:'국가대표 예비 후보 · 최종 명단 제외');
  }
  const row={year:c.year,age:c.age,stage:c.stage,team:p.team,role:p.role,position:p.position,stat,minorStat,league,minorLeague,level,military,servicePath:military?c.servicePath:null,registeredDays,salaryMan,allowanceMan,
    awards:league?.level==='major'&&!military?league.awards.filter(x=>x.winners.includes('user')).map(x=>x.title):[],report,injury,aBefore,aAfter:[...p.a],training:[...selected],gameSense:c.gameSense};
  c.history.push(row);report.forEach(text=>note(c,text));c.latest=league;c.phase='result';delete c.rehabChoice;delete c.pendingTraining;
  return row;
}
export function nextYear(c) {
  if(c.phase!=='result')throw Error('시즌 결과 확인 후 다음 시즌으로 진행하세요.');
  c.age++;c.year++;c.phase='prepare';
  if(c.age>=42){retire(c);return;}
  if(c.service)return;
  if(c.stage==='고교')c.phase='path';
  if(c.stage==='대학'){
    if(c.collegeSeasons>=4){c.collegeGraduate=true;c.phase='draft';}
    else if(collegeEarlyStatus(c).eligible)c.phase='college_choice';
  }
  if(c.stage==='프로'){
    if(faStatus(c).eligible)c.phase='fa_choice';
    else if(!c.contract||c.contract.left<=0)c.salaryPending=true;
    // Rare club-initiated transactions. A reserved player cannot shop for clubs.
    const r=rng(c.seed+c.year*811);
    if(c.phase==='prepare'&&c.proYears>=3&&c.contract?.kind!=='fa'&&r()<.045){
      const old=c.player.team,team=(old+1+Math.floor(r()*9))%10;c.player.team=team;note(c,`구단 간 트레이드 · ${TEAMS[old]} → ${TEAMS[team]} · 연봉 승계`);
    }
  }
}
export function retire(c) {c.retired=true;c.phase='retired';note(c,`${c.age}세 은퇴 · 통산 연봉 ${money(totalSalary(c))}`);}
export function totalSalary(c) {return c.salaryLedger.reduce((s,x)=>s+(x.salaryMan||0),0);}

export const COMPARISONS={
  bat:[['타율','avg',false],['안타','h',false],['홈런','hr',false],['출루율','obp',false],['장타율','slg',false],['OPS','ops',false],['볼넷%','bbRate',false],['삼진%','kRate',true],['도루','sb',false]],
  pitch:[['평균자책','era',true],['WHIP','whip',true],['탈삼진/9','k9',false],['볼넷/9','bb9',true],['승','w',false],['세이브','sv',false],['홀드','hold',false],['이닝','outs',false]]
};
export function statValue(stat,role,key) {
  if(key==='bbRate')return stat.pa?stat.bb/stat.pa:0;
  if(key==='kRate')return stat.pa?stat.k/stat.pa:0;
  if(key==='k9')return stat.outs?stat.k*27/stat.outs:0;
  if(key==='bb9')return stat.outs?stat.bb*27/stat.outs:0;
  return rates(stat,role)[key]??stat[key]??0;
}
export function percentile(value,values,lowerBetter=false) {
  if(!values.length)return null;
  if(values.length===1)return 50;
  const worse=values.filter(v=>lowerBetter?v>value:v<value).length;
  const same=values.filter(v=>Math.abs(v-value)<1e-12).length;
  return clamp((worse+(same-1)/2)/(values.length-1)*100);
}
export function percentileReport(league,role) {
  if(!league)return [];
  const mine=league.players.find(p=>p.id==='user'&&p.role===role);
  if(!mine)return [];
  const threshold=role==='bat'?Math.max(60,Math.ceil(league.games*1.5)):Math.max(45,Math.ceil(league.games*.15)*3);
  const enough=p=>(role==='bat'?p.stat.pa:p.stat.outs)>=threshold;
  const sameRole=p=>p.role===role&&(role==='bat'||(p.position==='선발')===(mine.position==='선발'));
  const pool=league.players.filter(p=>sameRole(p)&&enough(p));
  return COMPARISONS[role].map(([label,key,lower])=>{const cumulative=['h','hr','sb','w','sv','hold','outs','k'].includes(key),min=role==='bat'&&cumulative?Math.ceil(league.games*3.1):role==='pitch'&&cumulative&&mine.position==='선발'?Math.ceil(league.games*.55)*3:threshold,group=league.players.filter(p=>sameRole(p)&&(role==='bat'?p.stat.pa:p.stat.outs)>=min);return {label,key,value:statValue(mine.stat,role,key),percentile:(role==='bat'?mine.stat.pa:mine.stat.outs)>=min&&group.length>=10?percentile(statValue(mine.stat,role,key),group.map(p=>statValue(p.stat,role,key)),lower):null,count:group.length,threshold:min,lower,cumulative};});
}

// v1 did not record salary paid; never invent historical earnings during migration.
export function migrateCareer(old) {
  const c=structuredClone(old);
  if(c.version===VERSION){c.contractHistory??=[];return c;}
  if(c.version!==1)throw Error('지원하지 않는 저장 버전입니다.');
  c.version=VERSION;c.training=[0];c.gameSense=100;c.collegeSeasons=c.history.filter(x=>x.stage==='대학'&&!x.military).length;c.collegeGraduate=c.collegeSeasons>=4;
  c.faCount=0;c.faCycleStart=0;c.faDeclared=false;c.reserved=c.stage==='프로';c.salaryLedger=[];c.contractHistory=[];c.signingIncome=0;c.allowanceIncome=0;c.draftAttempts=[];
  c.legacySalaryYears=c.history.filter(x=>x.stage==='프로'&&!x.military).length;
  c.contract=c.stage==='프로'?reservedContract(Math.max(MIN_SALARY,Math.round((old.contract?.total||33)/(old.contract?.years||1)*100))):null;
  c.history.forEach(row=>{
    row.salaryMan=null;row.minorStat=null;row.minorLeague=null;row.registeredDays=row.stage==='프로'&&!row.military?Math.min(188,Math.round((row.role==='bat'?row.stat.g:row.stat.gs?row.stat.gs*5:row.stat.g*2)*188/144)):0;row.registrationEstimated=true;
    if(row.stage!=='프로'||row.military)row.awards=[];
    if(row.league){row.league.level=row.stage==='프로'?'major':'amateur';if(row.stage!=='프로')row.league.awards=[];row.league.teams.forEach(t=>t.name=TEAMS[t.id]);}
  });
  const legacyTeams=['서울 여우','부산 파도','인천 등대','대구 불꽃','광주 별빛','대전 궤도','수원 매','창원 숲','청주 번개','전주 달'];
  c.events.forEach(event=>{legacyTeams.forEach((name,i)=>{event.text=event.text.replaceAll(name,TEAMS[i]);});});
  c.latest=c.history.at(-1)?.league||null;
  if(c.phase==='draft'&&c.stage==='고교')c.phase='path';
  if(c.phase==='market')c.phase='prepare';
  if(c.phase==='incident')c.pendingTraining=[0];
  note(c,'v2 저장 변환 · 과거 등록일은 출장량 추정치, 과거 연봉·2군 기록은 미기록');
  return c;
}
function validateCareer(c) {
  if(!c||!c.player||!['bat','pitch'].includes(c.player.role)||!Array.isArray(c.player.a)||c.player.a.length!==6||c.player.a.some(x=>!Number.isFinite(x)||x<0||x>100)||!Number.isInteger(c.player.team)||c.player.team<0||c.player.team>=10||!Array.isArray(c.history)||!Array.isArray(c.events)||!Number.isFinite(c.seed)||!Number.isInteger(c.year)||!Number.isInteger(c.age)||!['고교','대학','프로'].includes(c.stage))throw Error('저장 데이터가 손상되었습니다.');
  if(c.version===VERSION){trainingPlan(c.training);if(!Array.isArray(c.salaryLedger)||!Array.isArray(c.draftAttempts)||!Number.isFinite(c.gameSense)||!Number.isFinite(c.collegeSeasons)||!Number.isFinite(c.faCount)||!Number.isFinite(c.faCycleStart)||!Number.isFinite(c.signingIncome)||!Number.isFinite(c.allowanceIncome))throw Error('커리어 데이터가 손상되었습니다.');}
  for(const row of c.history){if(!row.stat||!Array.isArray(row.awards)||!['bat','pitch'].includes(row.role)||Object.keys(freshStat(row.role)).some(k=>!Number.isFinite(row.stat[k]))||Object.values(row.stat).some(v=>!Number.isFinite(v))||[row.league,row.minorLeague].some(l=>l&&(!Array.isArray(l.players)||!Array.isArray(l.teams)||!Array.isArray(l.awards))))throw Error('시즌 기록이 손상되었습니다.');}
  return c;
}
export function loadCareer(storage=localStorage) {
  const raw=storage.getItem(SAVE_KEY)||storage.getItem('diamond-days-v1');if(!raw)return null;
  const old=JSON.parse(raw);if(![1,VERSION].includes(old?.version))throw Error('지원하지 않는 저장 버전입니다.');validateCareer(old);return validateCareer(migrateCareer(old));
}
export function saveCareer(c,storage=localStorage) {validateCareer(c);storage.setItem(SAVE_KEY,JSON.stringify(c));}
