export const VERSION=6;
export const TEAMS=['트윈스','자이언츠','랜더스','라이온즈','타이거즈','이글스','위즈','다이노스','베어스','히어로즈'];
export const KEYS={bat:['컨택','파워','선구','주루','수비','송구'],pitch:['구속','제구','구위','체력','변화구','위기관리']};
export const TYPES={bat:['거포형','교타형','출루형','호타준족형','수비형'],pitch:['파이어볼러','제구형','변화구형','완급형','위기관리형']};
export function rng(seed){let a=Number(seed)>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const clamp=(x,l=0,h=100)=>Math.max(l,Math.min(h,x));
export function abilities(type,role,seed){let r=rng(seed),a=Array.from({length:6},()=>Math.round(43+r()*15));let k=TYPES[role].indexOf(type);let strong=role==='bat'?[[1],[0],[2],[0,3],[4,5]][k]:[[0,2],[1],[4,2],[1,4],[5,2]][k];for(const i of strong||[0])a[i]+=13;for(let i=0;i<6;i++)if(!(strong||[]).includes(i))a[i]+=Math.round((r()-.5)*9);return a.map(v=>clamp(v));}
export function abilityCandidates(role,seed){const types=[...TYPES[role]],r=rng(seed+157);for(let i=types.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[types[i],types[j]]=[types[j],types[i]];}return types.slice(0,3).map((type,i)=>({type,a:abilities(type,role,seed+7919*i)}));}
export function emptyBat(){return{g:0,pa:0,ab:0,h:0,d:0,t:0,hr:0,rbi:0,r:0,bb:0,k:0,sb:0,sf:0,hbp:0,e:0,ch:0};}
export function emptyPitch(){return{g:0,gs:0,outs:0,w:0,l:0,hold:0,sv:0,bs:0,k:0,bb:0,h:0,hr:0,r:0,er:0};}
export function rates(s,role){if(role==='bat'){const avg=s.ab?s.h/s.ab:0,obp=s.ab+s.bb+s.hbp+s.sf?(s.h+s.bb+s.hbp)/(s.ab+s.bb+s.hbp+s.sf):0,slg=s.ab?(s.h+s.d+2*s.t+3*s.hr)/s.ab:0;return {avg,obp,slg,ops:obp+slg};}return {era:s.outs?s.er*27/s.outs:0,whip:s.outs?(s.bb+s.h)*3/s.outs:0};}
export function sumStats(rows,role){let s=role==='bat'?emptyBat():emptyPitch();for(let row of rows)for(let k of Object.keys(s))s[k]+=row[k]||0;return s;}
export const HIGH_SCHOOLS=['경문고','부강고','광주이고','대구상민고','장흥고','덕진고','유민고','충남고','서원고','야림고','휘성고','북이고','세명고','마산양마고'];
export const COLLEGES=['고원대','연한대','동명대','성균문대','중명대','건명대','한림대','경원대','단명대','원명대','동원대','경명대','영림대'];
export function randomName(seed){const r=rng(seed),surn=['김','이','박','최','정','강','윤','장','임','한','조','오','서','신','권','황','안','송','류','백','남'];const names=['도윤','시우','지호','태준','건우','서진','유찬','하준','민재','도현','우진','현서','태성','준혁','민철','강민','태건','준서','승현','현우','지민','하영','서윤','다은','지안','유진','세영','은재'];return surn[Math.floor(r()*surn.length)]+names[Math.floor(r()*names.length)];}
function person(id,team,role,i,r,teamStrength){return{id,name:randomName(Math.floor(r()*4294967295)),team,role,position:role==='bat'?['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'][i%9]:i<6?'선발':i===11?'마무리':'중간계투',a:Array.from({length:6},()=>Math.round(35+r()*45+teamStrength)),rookie:r()<.1,stat:role==='bat'?emptyBat():emptyPitch()};}
export function simulateSeason({seed,year,player=null,games=144,environment=1,level='major',strength=0,competitions=null}){
 const random=rng(seed+year*7919),teamStrengths=Array.from({length:10},(_,i)=>i-4.5);
 for(let i=teamStrengths.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[teamStrengths[i],teamStrengths[j]]=[teamStrengths[j],teamStrengths[i]];}
 const players=[],teams=TEAMS.map((name,id)=>({id,name,w:0,l:0,tie:0,r:0,ra:0,g:0,park:1+teamStrengths[id]*.014,bats:[],arms:[],competitions:{}}));
 for(let team of teams){for(let i=0;i<20;i++){let p=person(`${team.id}-b${i}`,team.id,'bat',i,random,teamStrengths[team.id]);p.a=p.a.map(v=>clamp(v+strength));players.push(p);team.bats.push(p);}for(let i=0;i<14;i++){let p=person(`${team.id}-p${i}`,team.id,'pitch',i,random,teamStrengths[team.id]);p.a=p.a.map(v=>clamp(v+strength));players.push(p);team.arms.push(p);}}
 let user;if(player){user={...player,id:'user',stat:player.role==='bat'?emptyBat():emptyPitch()};players.push(user);}
 const active=(day)=>user&&(!player.eligibleDays||player.eligibleDays[day])&&day>=Math.round((player.missed||0)*games/144)&&random()<(player.opportunity??.8);
 function game(at,home,day,competition=null){let tt=[at,home],scores=[0,0],idx=[0,0],bats=tt.map(t=>{const lineup=t.bats.slice(0,9);if(level==='major'){const slots=[2+(day+t.id*2)%7,2+(day*4+t.id*3+1)%7,2+(day*5+t.id+2)%7];const used=new Set();for(let n=0;n<2+(random()<.5?1:0);n++){const slot=slots[n];if(used.has(slot))continue;used.add(slot);lineup[slot]=t.bats[9+(day+n+t.id)%7];}if((day+t.id*3)%9===0)lineup[0]=t.bats[17+(day+t.id)%3];if((day*2+t.id)%9===0)lineup[1]=t.bats[17+(day+t.id+1)%3];}return lineup;}),arms=tt.map(t=>[...t.arms]),used=[new Map(),new Map()],leadWinner=null,loser=null,cameo=null;
 if(active(day)){let side=tt.findIndex(t=>t.id===user.team);if(side>=0){if(user.role==='bat'){let slot=tt[side].bats.slice(0,9).findIndex(p=>p.position===user.position);if(player.cameo)cameo={side,slot:slot<0?8:slot};else bats[side][slot<0?8:slot]=user;}else if(user.position==='선발'){if(tt[side].g%(level==='amateur'?3:5)===0&&random()<clamp(.90+(readiness(user)-50)*.004,.75,.99))arms[side][0]=user;}else if(user.position==='마무리')arms[side]=arms[side].filter(p=>p.position!=='마무리').concat(user);else arms[side].push(user);}}
 bats.flat().forEach(p=>p.stat.g++);
 const starters=arms.map((a,side)=>a[random() < ((user?.role==='pitch'&&user.position==='선발'&&tt[side].id===user.team) ? .02 : .16) ? 5 : tt[side].g%(level==='amateur'?3:5)]),current=[...starters],arm=(side)=>current[side];
 const chooseReliever=(side,inning)=>{const lead=scores[side]-scores[1-side],available=arms[side].slice(6).filter(p=>!used[side].has(p.id));let pool=available.filter(p=>day-(p.lastDay??-10)>=1);if(!pool.length)pool=available;if(!pool.length)return starters[side];const wantCloser=inning>=8&&lead>=-1&&lead<=3,wantSetup=inning===7&&lead>0&&lead<=3;if(!wantCloser&&pool.some(p=>p.position!=='마무리'))pool=pool.filter(p=>p.position!=='마무리');pool.sort((a,b)=>{const grade=p=>{let rest=day-(p.lastDay??-10),fatigue=rest===1?-35:rest===2?-8:0,role=p.position==='마무리'?1:0,fit=wantCloser?(role?24:-5):0;return readiness(p)*(wantSetup?.55:.27)+fit+fatigue;};return grade(b)-grade(a)||a.id.localeCompare(b.id);});const top=pool.slice(0,wantCloser||wantSetup?1:Math.min(3,pool.length));return top[Math.floor(random()*top.length)];};
 for(let inn=0;inn<12;inn++){
 if(inn>=9&&scores[0]!==scores[1])break;
 for(let offense=0;offense<2;offense++){
 if(inn>=8&&offense===1&&scores[1]>scores[0])break;
 if(inn===6){for(let i=0;i<3;i++){const slot=(day+i*3)%9,bench=tt[offense].bats[16+i];if(bats[offense][slot]!==user&&random()<.32){bats[offense][slot]=bench;bench.stat.g++;}}if(cameo&&offense===cameo.side){bats[cameo.side][cameo.slot]=user;user.stat.g++;}}
 let defense=1-offense;if(inn>0){let prior=used[defense].get(current[defense].id),starter=current[defense]===starters[defense],batters=prior?.batters||0,runs=prior?.r||0,stamina=current[defense].a[3];let close=scores[defense]-scores[offense];let pull=starter?(inn>=3&&(batters>17+stamina*.12||runs>=5||inn>=5&&random()<.42+(65-stamina)*.006||inn>=7)):(prior?.outs>=6||prior?.outs>=3&&random()<.53||inn===7&&close>0&&close<=3&&random()<.8||inn===8&&close>=-1&&close<=3&&current[defense].position!=='마무리'&&random()<.8);if(pull)current[defense]=chooseReliever(defense,inn);}
 let p=arm(defense),s=p.stat;let entry=scores[defense]-scores[offense];if(!used[defense].has(p.id)){s.g++;if(inn===0)s.gs++;p.lastDay=day;used[defense].set(p.id,{p,outs:0,r:0,batters:0,entry,exit:entry});}
 let out=0,bases=[null,null,null],counter=0;const charge=(earned=true)=>{s.r++;if(earned)s.er++;used[defense].get(p.id).r++;};
 const score=(runner,batter,noRbi=false)=>{scores[offense]++;(runner.player||runner).stat.r++;if(runner.earned!==false&&!noRbi)batter.stat.rbi++;charge(runner.earned!==false);if(scores[offense]===scores[defense]+1){leadWinner=arm(offense,Math.max(0,inn-(offense===0?1:0)));loser=p;}};
 while(out<3){let b=bats[offense][idx[offense]++%9],bs=b.stat;bs.pa++;counter++;used[defense].get(p.id).batters++;let [contact,power,eye,speed]=b.a,[velo,control,stuff,stamina,breaking,crisis]=p.a;let fatigue=inn>=4?(55-stamina)*.0005:0,pressure=(bases.some(Boolean)||inn>=7&&Math.abs(scores[offense]-scores[defense])<=2)?(55-crisis)*.00035:0;let walk=clamp(.080+(eye-control)*.001+pressure, .03,.18),strike=clamp(.2+(stuff+velo+breaking-3*contact)*.0005-fatigue-pressure,.08,.38),hr=clamp((.027+(power-(stuff+velo)/2)*.00048)*environment*tt[1].park,.003,.08);let defenseSkill=bats[defense].reduce((n,x)=>n+(x.a[4]+x.a[5])/2,0)/9;let hit=clamp((.319+(contact-(stuff+breaking)/2)*.001+(55-defenseSkill)*.0005+fatigue+pressure)*environment,.14,.38);let u=random();
 if(u<walk){bs.bb++;s.bb++;if(bases[0]){if(bases[1]){if(bases[2])score(bases[2],b);bases[2]=bases[1];}bases[1]=bases[0];}bases[0]={player:b,earned:true};}
 else{bs.ab++;if(u<walk+strike||counter>80){bs.k++;s.k++;out++;s.outs++;used[defense].get(p.id).outs++;}
 else if(u<walk+strike+hr){bs.h++;bs.hr++;s.h++;s.hr++;for(let runner of bases)if(runner)score(runner,b);score({player:b,earned:true},b);bases=[null,null,null];}
 else if(u<walk+strike+hr+hit*(1-walk-strike-hr)){bs.h++;s.h++;let extra=random(),n=extra<.045*(speed/65)?3:extra<.25?2:1;if(n===2)bs.d++;if(n===3)bs.t++;for(let k=2;k>=0;k--)if(bases[k]){let runner=bases[k];bases[k]=null;let advance=k+n;if(n===1&&k===1&&random()<.6)advance=3;if(n===1&&k===0&&random()<.3)advance=2;if(n===2&&k===0&&random()<.55)advance=3;if(advance>=3)score(runner,b);else{if(bases[advance])score(bases[advance],b);bases[advance]=runner;}}bases[n-1]={player:b,earned:true};if(n===1&&!bases[1]&&random()<speed*.002*(1-p.a[5]/160)){bases[1]=bases[0];bases[0]=null;bs.sb++;}}
 else{const fielders=bats[defense].filter(x=>x.position!=='지명타자'),fielder=fielders[Math.floor(random()*fielders.length)],positionRisk={'포수':.55,'1루수':.6,'2루수':1.15,'3루수':1.35,'유격수':1.3,'좌익수':.65,'중견수':.7,'우익수':.7}[fielder.position]||1;fielder.stat.ch=(fielder.stat.ch||0)+1;
 const errorChance=clamp((.022+(55-fielder.a[4])*.00055+(55-fielder.a[5])*.00022)*positionRisk,.003,.09);
 if(random()<errorChance){fielder.stat.e=(fielder.stat.e||0)+1;for(const runner of bases)if(runner)runner.earned=false;if(bases[0]){if(bases[1]){if(bases[2])score(bases[2],b,true);bases[2]=bases[1];}bases[1]=bases[0];}bases[0]={player:b,earned:false};}
 else{out++;s.outs++;used[defense].get(p.id).outs++;if(out<3&&bases[2]&&random()<.22){bs.ab--;bs.sf++;score(bases[2],b);bases[2]=null;}}}}
 if(inn>=8&&offense===1&&scores[1]>scores[0])break;
 }
 used[defense].get(p.id).exit=scores[defense]-scores[offense];
 }
 }
 tt.forEach((t,i)=>{t.g++;t.r+=scores[i];t.ra+=scores[1-i];if(competition){const entry=t.competitions[competition]??={g:0,w:0,l:0,tie:0};entry.g++;if(scores[i]>scores[1-i])entry.w++;else if(scores[i]<scores[1-i])entry.l++;else entry.tie++;}});
 for(const side of [0,1])for(const v of used[side].values())if(v.p!==starters[side]&&v.entry>0&&v.entry<=3&&v.exit<=0)v.p.stat.bs++;
 if(scores[0]===scores[1])tt.forEach(t=>t.tie++);else{let win=scores[0]>scores[1]?0:1;tt[win].w++;tt[1-win].l++;let usedWin=[...used[win].values()];let credit=usedWin.find(v=>v.p.id===leadWinner?.id);if(!credit||credit.p===starters[win]&&credit.outs<15)credit=usedWin.filter(v=>v.p!==starters[win]).sort((a,b)=>(a.r-b.r)||(b.outs-a.outs))[0]||usedWin[0];credit.p.stat.w++;if(loser)loser.stat.l++;let finish=usedWin.at(-1);if(finish!==credit&&finish.entry>0&&finish.entry<=3&&finish.exit>0&&finish.outs>=3)finish.p.stat.sv++;for(let v of usedWin.slice(1,-1))if(v!==credit&&v.entry>0&&v.entry<=3&&v.exit>0&&v.outs>=3)v.p.stat.hold++;}
 }
 // Circle scheduling: nine rounds repeated sixteen times; every team plays once each day.
 let circle=Array.from({length:10},(_,i)=>i),qualifiers=new Map();for(let day=0;day<games;day++){for(let k=0;k<5;k++){let a=circle[k],b=circle[9-k];const competition=competitions?.find(x=>day>=x.start&&day<x.start+x.games);const ta=teams[day%2?a:b],tb=teams[day%2?b:a];if(competition?.cup&&!qualifiers.has(competition.name))qualifiers.set(competition.name,new Set([...teams].sort((x,y)=>y.w/(y.w+y.l||1)-x.w/(x.w+x.l||1)||x.id-y.id).slice(0,8).map(x=>x.id)));const qualified=!competition?.cup||(qualifiers.get(competition.name).has(ta.id)&&qualifiers.get(competition.name).has(tb.id));const alive=!competition?.cup||((ta.competitions[competition.name]?.l||0)<2&&(tb.competitions[competition.name]?.l||0)<2);if(qualified&&alive)game(ta,tb,day,competition?.name);}circle.splice(1,0,circle.pop());}
 const result={year,games,environment,level,competitions,players,teams:teams.map(({bats,arms,...t})=>t)};result.awards=level==='major'?awards(result):[];return result;
}
export const TITLES=[['다승','pitch','w',false],['평균자책','pitch','era',true],['탈삼진','pitch','k',false],['세이브','pitch','sv',false],['홀드','pitch','hold',false],['승률','pitch','winPct',false],['타율','bat','avg',true],['출루율','bat','obp',true],['타점','bat','rbi',false],['홈런','bat','hr',false],['도루','bat','sb',false],['최다안타','bat','h',false],['득점','bat','r',false],['장타율','bat','slg',true]];

export function amateurCompetitions(stage){return stage==='고교'?[{name:'주말리그 전반기',start:0,games:7},{name:'황금사자기',start:7,games:6,cup:true},{name:'주말리그 후반기',start:13,games:7},{name:'청룡기',start:20,games:6,cup:true},{name:'대통령배',start:26,games:4,cup:true},{name:'봉황대기',start:30,games:4,cup:true}]:[{name:'대학야구 U-리그',start:0,games:9},{name:'대통령기 전국대학야구대회',start:9,games:6,cup:true},{name:'전국대학야구선수권대회',start:15,games:5,cup:true},{name:'U-리그 왕중왕전',start:20,games:5,cup:true}];}
export function standings(league){const teams=[...(league?.teams||[])];return teams.sort((a,b)=>b.w/(b.w+b.l||1)-a.w/(a.w+a.l||1)||b.w-a.w||b.r-b.ra-(a.r-a.ra)||a.id-b.id).map(t=>({...t,pct:t.w/(t.w+t.l||1),rank:1+teams.filter(x=>x.w/(x.w+x.l||1)>t.w/(t.w+t.l||1)).length}));}
export function visibleSalaryChange(oldMan,newMan){const shown=x=>Math.abs(x)<10000?Math.round(x):Math.round(x/1000)*1000,old=shown(oldMan),next=shown(newMan),rate=old?Math.abs((next-old)/old*100):0;return {old,new:next,rate:Math.round(rate*10)/10,kind:next>old?'인상':next<old?'삭감':'동결'};}
export function changeTrust(c,delta,reason){c.clubTrust=clamp((c.clubTrust??70)+delta);(c.trustHistory??=[]).push({year:c.year,delta,reason,value:c.clubTrust});note(c,`구단 신뢰도 ${delta>0?'+':''}${delta} · ${reason} · ${c.clubTrust}/100`);}
export function qualification(games,role){return role==='bat'?Math.floor(games*3.1):games*3;}
export function ranking(season,role,key,qualified=false){return season.players.filter(p=>p.role===role&&p.stat.g>0&&(key!=='e'||!season.defenseUnrecorded&&p.stat.ch>0)&&(key!=='winPct'||p.stat.w>=10)&&(!qualified||(role==='bat'?p.stat.pa>=qualification(season.teams?.find(t=>t.id===p.team)?.g??season.games,'bat'):p.stat.outs>=qualification(season.teams?.find(t=>t.id===p.team)?.g??season.games,'pitch')))).map(p=>({...p,value:statValue(p.stat,role,key)})).sort((a,b)=>(['era','whip','bb9','kRate'].includes(key)?a.value-b.value:b.value-a.value)||a.id.localeCompare(b.id));}
export function voteScore(p,season){let s=p.stat,r=rates(s,p.role),team=season.teams.find(t=>t.id===p.team);return p.role==='bat'?(r.ops*.7+s.hr*.006+s.rbi*.002)*(s.pa/600)+p.a[4]*s.g/14400+(team?.w||0)*.001:((4.7-r.era)*s.outs/540+s.k*.002+s.sv*.02+s.hold*.012)+(team?.w||0)*.001;}
export function awards(season){if(season.level&&season.level!=='major')return [];let result=TITLES.map(([title,role,key,q])=>{let rows=ranking(season,role,key,q);return{title,winners:rows.length?rows.filter(p=>p.value===rows[0].value).map(p=>p.id):[],value:rows[0]?.value};});const choose=(title,rows,score=voteScore)=>{rows=rows.filter(p=>p.stat.g>0).sort((a,b)=>score(b,season)-score(a,season)||a.id.localeCompare(b.id));result.push({title,winners:rows.slice(0,1).map(p=>p.id),candidates:rows.slice(0,3).map(p=>({id:p.id,score:score(p,season)}))});};
 const titleCandidates=new Set(TITLES.flatMap(([,role,key,q])=>ranking(season,role,key,q).slice(0,10).map(p=>p.id))),titleWinners=new Set(result.flatMap(x=>x.winners));
 choose('MVP',season.players.filter(p=>titleCandidates.has(p.id)||(p.role==='bat'?p.stat.pa>=qualification(season.games,'bat'):p.stat.outs>=qualification(season.games,'pitch'))));
 choose('신인왕',season.players.filter(p=>p.rookie));
 const defenseScore=p=>p.role==='bat'&&p.stat.ch>=80?(1-p.stat.e/p.stat.ch)*60+(p.a[4]+p.a[5])*.175+Math.min(5,p.stat.ch/100):0;
 for(const pos of [...new Set(season.players.map(p=>p.position))]){
   const group=season.players.filter(p=>p.position===pos);
   // Fielding innings are not tracked; 100 games is a conservative proxy for 720 innings.
   const defensive=group.filter(p=>p.role==='bat'&&p.stat.g>=(pos==='포수'?72:100)&&p.stat.ch>=80);
   if(pos!=='지명타자'&&defensive.length)choose(`수비상 · ${pos}`,defensive,defenseScore);
   const glove=group.filter(p=>titleWinners.has(p.id)||(p.role==='bat'?(pos==='지명타자'?p.stat.pa>=297:p.stat.g>=100&&p.stat.ch>=50):(p.stat.outs>=qualification(season.games,'pitch')||p.stat.w>=10||p.stat.sv>=30||p.stat.hold>=30)));
   choose(`골든글러브 · ${pos}`,glove,p=>p.role==='bat'?rates(p.stat,'bat').ops*.65+Math.min(1.5,p.stat.hr/30)*.12+Math.min(1.5,p.stat.rbi/100)*.08+defenseScore(p)/100*.1+Math.min(1,p.stat.pa/600)*.05:voteScore(p,season)*.85+defenseScore(p)/100*.15);
 }
 return result;}

// All monetary values in version 2 are integers measured in 만원.
export const MIN_SALARY = 3300;
export function minimumSalary(year){return year<=2027?MIN_SALARY:Math.round(MIN_SALARY*1.03**(year-2027)/100)*100;}
export function teamBudget(year,team,c=null){const capMan=year<=2025?1371165:year===2026?1439723:year===2027?1511709:year===2028?1587294:Math.round(1587294*1.04**(year-2028)),basePayrollMan=Math.round(capMan*(.78+(team%5)*.035));const contract=c?.player.team===team?c.contract:null,paid=c?.salaryLedger?.find(x=>x.year===year&&x.team===team),optionCostMan=paid?.optionPaidMan??(contract?.options||[]).reduce((n,x)=>n+x.amountMan,0),playerCostMan=contract?(contract.annualMan||0)+(contract.signingBonusMan||0)/Math.max(1,contract.years||1)+optionCostMan:0,payrollMan=Math.round(basePayrollMan+playerCostMan);return {capMan,payrollMan,roomMan:capMan-payrollMan,playerCostMan};}
export const LEVELS = ['2군','1군 백업','1군 준주전','1군 주전'];
export const SAVE_KEY = 'charari-naega-kiunda-v6';
export const LEGACY_SAVE_KEYS = ['charari-naega-kiunda-v5','charari-naega-kiunda-v4','diamond-days-v2', 'diamond-days-v1'];
export function money(man=0) {
  if (!Number.isFinite(man)) return '미기록';
  return Math.abs(man)<10000 ? `${Math.round(man)}만원` : `${(man/10000).toFixed(1)}억`;
}
const freshStat = role => role==='bat'?emptyBat():emptyPitch();
const note = (c,text) => c.events.push({year:c.year,text});
export function createCareer(config) {
  return {
    version:VERSION, seed:Number(config.seed), player:{...config,team:Number(config.team),a:abilities(config.type,config.role,config.seed)},
    age:18,year:2027,stage:'고교',phase:'prepare',history:[],events:[],service:0,served:false,
    proYears:0,collegeSeasons:0,collegeGraduate:false,contract:null,clubTrust:70,trustHistory:[],
    adapt:0,injuries:0,retired:false,training:[0],faCount:0,faCycleStart:0,faDeclared:false,
    salaryLedger:[],contractHistory:[],signingIncome:0,allowanceIncome:0,draftAttempts:[],reserved:false,
    nationalHistory:[],nationalDecisions:{},transactionHistory:[],pendingEvent:null,exempt:false,playerStatus:'amateur',potential:0.85+rng(Number(config.seed)+71)()*.35,
    playback:null,retirementReason:null,lastContract:null,eventQueue:[]
  };
}
export function trainingPlan(selected) {
  if (!Array.isArray(selected)||!selected.length||selected.length>2||new Set(selected).size!==selected.length||selected.some(i=>!Number.isInteger(i)||i<0||i>5)) throw Error('훈련은 서로 다른 능력치 1~2개를 선택하세요.');
  return {selected:[...selected],hoursEach:Math.round(100/selected.length)};
}
export function overall(p) {
  const a=p.a;
  let w=p.role==='bat'?[.27,.22,.18,.1,.16,.07]:p.position==='선발'?[.1,.25,.22,.23,.16,.04]:p.position==='마무리'?[.17,.27,.28,.08,.16,.04]:[.13,.27,.25,.12,.19,.04];
  if(p.role==='bat'&&['포수','유격수','중견수'].includes(p.position))w=[.24,.17,.16,.08,.24,.11];
  return Math.round(a.reduce((sum,v,i)=>sum+v*w[i],0)*10)/10;
}
export const readiness=overall;
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
  const score=readiness(p)+(form-50)*.08+depth-(c.adapt?8:0)+((c.clubTrust??70)-70)*.14+(c.positionOpportunityUntil>=c.year?4:0);
  let tier=score<53?0:score<59?1:score<64?2:3;
  if(c.developmental&&c.proYears===0)tier=c.developmentalElite?Math.min(tier,1):0;
  const calendarDays=188,r=rng(c.seed+c.year*107),roster=Array(calendarDays).fill(tier===0?'2군':'1군');
  // Decisions are sparse and persist for a substantial part of a season.
  for(const day of [46,94,145]){
    const previous=roster[day-1];
    const callup=previous==='2군'&&!(c.developmental&&c.proYears===0&&!c.developmentalElite)&&score>=50&&r()<clamp(.36+(score-55)*.018,.18,.82),demotion=false;
    roster.fill(callup?'1군':demotion?'2군':previous,day);
  }
  // Two seasons of service: the first is absent, the second returns in August.
  if(c.service>0){roster.fill('복무');if(c.service===1){roster.fill('2군',119,138);if(tier>0)roster.fill('1군',138);}}
  const injury=typeof missed==='object'?missed:null,days=typeof missed==='number'?missed:injury?.days||0;
  if(days){const start=clamp(injury?.startDay??56,0,calendarDays-1),end=Math.min(calendarDays,start+days),minorEnd=Math.min(calendarDays,end+Math.max(12,Math.round(days*.3)));
    roster.fill('재활군',start,end);roster.fill('2군',end,minorEnd);
    if(minorEnd<calendarDays&&tier>0&&score>=58&&(!c.service||c.service===1))roster.fill('1군',c.service===1?Math.max(138,minorEnd):minorEnd);
  }
  if(c.nationalDecisions?.[nationalKey(c.year,'아시안게임')]==='수락'&&!c.service)roster.fill('대표팀',170,188);
  const moves=[];for(let day=1;day<calendarDays;day++)if(roster[day]!==roster[day-1])moves.push({day:day+1,gameDay:Math.floor(day*144/calendarDays)+1,from:roster[day-1],to:roster[day],reason:roster[day]==='재활군'?'부상 재활':roster[day-1]==='재활군'?'재활 복귀':roster[day]==='1군'?'콜업':'선수단 운용'});
  const majorDays=Array.from({length:144},(_,d)=>roster[Math.floor(d*calendarDays/144)]==='1군');
  const minorDays=Array.from({length:108},(_,d)=>roster[Math.floor(d*calendarDays/108)]==='2군');
  return {tier,label:LEVELS[tier],score,roster,calendar:roster,opening:roster[0],majorDays,minorDays,moves,registeredDays:roster.filter(x=>x==='1군').length,majorOpportunity:[.18,.68,.85,.98][tier],minorOpportunity:.9,cameo:tier===1};
}
export function injuryForecast(c) {
  const r=rng(c.seed+c.year*31+c.history.length);
  if(c.service===2||r()>=clamp(.18+c.injuries*.025+(c.recurrenceAdjustment||0),.03,.5))return null;
  const days=14+Math.floor(r()*66),startDay=c.service===1?119+Math.floor(r()*50):Math.floor(r()*150),body=['어깨','팔꿈치','허리','햄스트링','무릎'][Math.floor(r()*5)];
  return {name:days>50?'근육 손상':'피로성 통증',body,severity:days>50?'중증':days>28?'중등도':'경증',days,startDay};
}
export function seasonLevel(row){if(row.stage!=='프로')return row.stage;const s=row.stat;if(!s?.g)return '2군';const fraction=row.role==='bat'?Math.max(s.g/144,s.pa/620):row.position==='선발'?Math.max(s.gs/28,s.outs/510):Math.max(s.g/55,s.outs/165);return fraction>=.8?'1군 주전':fraction>=.36?'1군 준주전':'1군 백업';}
export function rookieEligible(c){const seasons=c.history.filter(x=>x.stage==='프로'),prior=seasons.filter(x=>!x.military);if(!seasons.length)return true;if(c.year-seasons[0].year>5||prior.some(x=>(x.awards||[]).includes('신인왕')))return false;return prior.reduce((n,x)=>n+(x.role==='bat'?x.stat?.pa||0:x.stat?.outs||0),0)<=(c.player.role==='bat'?60:90);}
export function postseasonResult(league,row,player,seed){const ranked=standings(league),regular=ranked.find(x=>x.id===row.team)?.rank||10,r=rng(seed+league.year*987);let challenger=ranked[4].id;const rounds=[[ranked[3].id,2],[ranked[2].id,5],[ranked[1].id,5],[ranked[0].id,7]],results=[];for(let round=0;round<rounds.length;round++){const [opponent,maxGames]=rounds[round],a=ranked.find(x=>x.id===challenger),b=ranked.find(x=>x.id===opponent);const higherWin=clamp((round===0?.70:round===3?.66:.56)+(b.w-a.w)*.002,.52,.78),challengerWin=1-higherWin;let aw=0,bw=0;if(round===0){for(let g=0;g<2&&aw<2&&bw<1;g++){if(r()<challengerWin)aw++;else bw++;}}else while(aw<Math.ceil(maxGames/2)&&bw<Math.ceil(maxGames/2)){if(r()<challengerWin)aw++;else bw++;}results.push({winner:aw>bw?challenger:opponent,loser:aw>bw?opponent:challenger,games:aw+bw,round:round===0?'와일드카드':round===3?'한국시리즈':round===1?'준플레이오프':'플레이오프'});challenger=results.at(-1).winner;}const champion=challenger,elimination=results.findIndex(x=>x.loser===row.team),finalRank=champion===row.team?1:regular===1?2:elimination>=0?5-elimination:regular;
  const qualified=regular<=5&&row.stat.g>0&&(row.role==='bat'?row.stat.pa>=60:row.stat.outs>=24),games=qualified?results.filter(x=>x.winner===row.team||x.loser===row.team).reduce((n,x)=>n+x.games,0):0;
  const mini=games?simulateSeason({seed:seed+581,year:league.year,games,level:'postseason',player:{...player,opportunity:.8}}):null;
  const stat=mini?.players.find(x=>x.id==='user')?.stat||freshStat(row.role);
  return {regularRank:regular,finalRank,champion,selected:qualified,games,stat,ring:qualified&&champion===row.team&&stat.g>0&&results.at(-1)?.winner===row.team,rounds:results};}
export const hasChampionshipRing=row=>Boolean(row?.postseason?.ring??(row?.postseason?.selected&&row.postseason?.champion===row.team&&row.postseason?.stat?.g>0));
export function faStatus(c) {
  const rows=c.history.filter(x=>x.stage==='프로'&&!x.military&&x.year>=c.faCycleStart);
  const full=rows.filter(x=>(x.registeredDays||0)>=145).length;
  const partial=rows.filter(x=>(x.registeredDays||0)<145).reduce((s,x)=>s+(x.registeredDays||0),0);
  const seasons=full+Math.floor(partial/145),required=c.faCount?4:c.collegeGraduate?7:8;
  const contractBlocked=c.contract?.kind==='fa'&&c.contract.left>0;
  return {seasons,required,partialDays:partial%145,eligible:seasons>=required&&!contractBlocked,contractBlocked};
}
export function faContractTerm(c) {
  if(c.contract?.kind!=='fa')return null;
  const years=Math.max(1,Math.trunc(c.contract.years||1));
  const remaining=clamp(Math.trunc(c.contract.left??years),0,years);
  return {years,elapsed:years-remaining,remaining,active:remaining>0};
}
export function draftAssessment(c) {
  const rows=c.history.filter(x=>['고교','대학'].includes(x.stage)&&x.role===c.player.role&&!x.military).slice(-2);
  const stat=sumStats(rows.map(x=>x.stat),c.player.role);
  const sample=c.player.role==='bat'?stat.pa:stat.outs;
  const sampleWeight=clamp(sample/(c.player.role==='bat'?100:90),0,1);
  const statScore=performance(stat,c.player.role);
  const score=clamp(readiness(c.player)*.4+(statScore*sampleWeight+45*(1-sampleWeight))*.6-Math.max(0,c.age-19)*1.1,0,100);
  const probability=clamp(.16+.72/(1+Math.exp(-(score-47)/11)),.08,.9);
  const round=clamp(Math.round(14-score*.15),1,11);
  return {score,probability,roundLow:clamp(round-2,1,11),roundHigh:clamp(round+2,1,11),sample,provisional:sampleWeight<1,stat};
}
export function collegeEarlyStatus(c) {
  const scout=draftAssessment(c);
  return {eligible:c.stage==='대학'&&!c.service&&c.collegeSeasons===2&&!c.draftAttempts.some(x=>x.kind==='early'),score:scout.score};
}
export function enterCollege(c) {
  if(c.stage!=='고교'||!['path','draft_result'].includes(c.phase)||c.lastDraft?.selected)throw Error('현재 대학 진학을 선택할 수 없습니다.');
  c.stage='대학';c.collegeSeasons=0;c.collegeTeam=COLLEGES[c.seed%COLLEGES.length];c.phase='prepare';note(c,`${c.collegeTeam} 진학`);
}
function reservedContract(annualMan=MIN_SALARY) {return {kind:'reserved',annualMan,years:1,left:1,totalMan:annualMan,guaranteedMan:annualMan,signingBonusMan:0};}
export function runDraft(c,kind='regular') {
  if(kind==='early'&&!collegeEarlyStatus(c).eligible)throw Error('대학 2학년 시즌을 마친 선수만 얼리드래프트에 참가할 수 있습니다.');
  if(kind!=='early'&&!['path','draft'].includes(c.phase))throw Error('현재 드래프트 참가 시점이 아닙니다.');
  if(c.draftAttempts.some(x=>x.year===c.year))throw Error('이번 드래프트 결과는 이미 확정되었습니다.');
  const scout=draftAssessment(c),r=rng(c.seed+c.year*401+17),selected=r()<scout.probability;
  const round=scout.roundLow+Math.floor(r()*(scout.roundHigh-scout.roundLow+1)),pick=1+Math.floor(r()*10);
  // Simulated previous standings determine draft order. Preference never enters selection.
  const order=TEAMS.map((_,i)=>i).sort((a,b)=>rng(c.seed+(c.year-1)*19+a*53)()-rng(c.seed+(c.year-1)*19+b*53)());
  const result={year:c.year,kind,selected,round:selected?round:null,pick:selected?(round-1)*10+pick:null,team:selected?order[pick-1]:null,scout};
  c.draftAttempts.push(result);c.lastDraft=result;c.phase='draft_result';
  if(selected){
    c.player.team=result.team;c.stage='프로';c.reserved=true;c.playerStatus='reserved';c.contract=reservedContract(minimumSalary(c.year));
    const bonus=Math.round((12-round)**2*400+1000);c.signingIncome+=bonus;result.bonusMan=bonus;
    note(c,`${TEAMS[result.team]} ${round}라운드 전체 ${result.pick}순위 지명 · 계약금 ${money(bonus)} · 연봉 ${money(c.contract.annualMan)}`);
  } else note(c,`${kind==='early'?'얼리드래프트':'신인 드래프트'} 미지명`);
  return result;
}
export function finishDraft(c) {
  if(c.phase!=='draft_result')throw Error('드래프트 결과 화면이 아닙니다.');
  if(c.lastDraft.selected||c.lastDraft.kind==='early')c.phase='prepare';
  else if(c.stage==='고교')c.phase='path';
  else c.phase='undrafted';
}
export function beginDraft(c,kind='regular') {
  if(kind==='early'&&!collegeEarlyStatus(c).eligible)throw Error('얼리드래프트 참가 대상이 아닙니다.');
  if(kind!=='early'&&!['path','draft'].includes(c.phase))throw Error('드래프트 참가 단계가 아닙니다.');
  if(c.draftAttempts.some(x=>x.year===c.year))throw Error('이번 드래프트는 이미 진행했습니다.');
  c.draftKind=kind;c.phase='draft_motion';
}
export function revealDraft(c) {
  if(c.phase!=='draft_motion')throw Error('드래프트 진행 화면이 아닙니다.');
  const kind=c.draftKind||'regular';
  c.phase=kind==='early'?'college_choice':c.stage==='고교'?'path':'draft';
  delete c.draftKind;
  return runDraft(c,kind);
}
export function developmentalTryout(c) {
  if(!['undrafted','draft_result','path'].includes(c.phase)||!c.lastDraft||c.lastDraft.selected)throw Error('미지명 선수만 육성 입단 테스트를 신청할 수 있습니다.');
  const r=rng(c.seed+c.year*701);const team=Math.floor(r()*10);
  const scout=draftAssessment(c),last=c.history.filter(x=>['고교','대학'].includes(x.stage)).at(-1);
  c.developmentalElite=scout.score>=76&&(c.player.role==='bat'?last?.stat?.pa>=100:last?.stat?.outs>=80);
  // A single recruitment result, not an open FA auction.
  c.player.team=team;c.stage='프로';c.reserved=true;c.playerStatus='reserved';c.contract=reservedContract(minimumSalary(c.year));c.developmental=true;c.phase='prepare';
  note(c,`${TEAMS[team]} 육성 입단 테스트 통과 · 연봉 ${money(c.contract.annualMan)}`);
}
export function springEvaluation(c) {
  if(c.stage!=='프로'||!c.developmental||c.proYears!==0||!c.developmentalElite||c.springEvaluated||rosterPlan(c).opening!=='1군')return null;
  c.springEvaluated=true;
  const event={type:'spring_evaluation',year:c.year,text:'아마추어 성적과 스프링캠프 평가를 바탕으로 개막 1군 백업 기회를 얻었습니다.'};
  note(c,event.text);
  return event;
}
export function declareFA(c) {
  if(c.phase!=='fa_choice'||!faStatus(c).eligible)throw Error('FA 자격을 아직 충족하지 못했습니다.');
  c.faDeclared=true;c.reserved=false;c.playerStatus='fa';c.phase='market';note(c,'FA 권리 행사 승인 · 타 구단 협상 가능');
}
// KBO grade bands use both club and league salary ranks over three seasons.
// NPC salaries are not simulated, so their ranks are estimated from ability.
export function faGrade(c){
  if(c.age>=35||c.faCount>=2)return 'C';
  const mine=c.salaryLedger.filter(x=>x.salaryMan>0).slice(-3),annual=mine.length?mine.reduce((n,x)=>n+x.salaryMan+(x.optionPaidMan||0),0)/mine.length:c.contract?.annualMan||MIN_SALARY;
  const peers=(c.latest?.players||[]).filter(p=>p.id!=='user').map(p=>({team:p.team,salary:Math.max(MIN_SALARY,Math.round((overall(p)-35)*1900))}));
  const club=1+peers.filter(p=>p.team===c.player.team&&p.salary>annual).length,league=1+peers.filter(p=>p.salary>annual).length;
  const clubBand=club<=3?0:club<=10?1:2,leagueBand=league<=30?0:league<=60?1:2;
  return ['A','B','C'][Math.min(2,Math.ceil((clubBand+leagueBand)/2))];
}
export function optionRule(role,position,amount){
  return role==='bat'?{key:'g',target:100,amountMan:amount,label:'정규시즌 100경기 이상 출장'}:position==='선발'?{key:'w',target:10,minStarts:10,amountMan:amount,label:'정규시즌 선발 10승 이상'}:position==='마무리'?{key:'sv',target:20,amountMan:amount,label:'정규시즌 20세이브 이상'}:{key:'hold',target:15,amountMan:amount,label:'정규시즌 15홀드 이상'};
}
export function settleOptions(contract,stat){return (contract?.options||[]).map(rule=>{const actual=stat?.[rule.key]||0,earned=actual>=rule.target&&(!rule.minStarts||stat?.gs>=rule.minStarts);return {...rule,actual,earned,paidMan:earned?rule.amountMan:0};});}
export function offers(c,preview=false) {
  if(!((c.phase==='market'&&c.faDeclared)||(preview&&c.phase==='fa_choice')))return [];
  const r=rng(c.seed+c.year*17),recent=c.history.filter(x=>!x.military&&x.stage==='프로').slice(-3),last=recent.at(-1);
  const seasonValue=row=>{const s=row.stat,v=rates(s,row.role);return row.role==='bat'?clamp((v.ops-.58)/.38,0,1.4)*Math.min(1,s.pa/520):row.position==='선발'?clamp((6.4-v.era)/4.4,0,1.3)*Math.min(1,s.outs/450):clamp((6-v.era)/4.5,0,1.2)*Math.min(1,s.outs/150)+Math.min(.3,(s.sv+s.hold)/100);};
  const value=recent.reduce((n,row,i)=>n+seasonValue(row)*[.2,.3,.5][3-recent.length+i],0);
  const grade=faGrade(c);
  return [c.player.team,(c.player.team+3)%10,(c.player.team+7)%10].map((team,i)=>{
    const years=c.age>36?2:c.age>33?3:3+(r()>.4?1:0),ageFactor=c.age>36?.66:c.age>33?.85:1;
    const budget=teamBudget(c.year,team,c),demand=1+(r()-.5)*.22+(team===c.player.team?.04:0)+(c.player.position==='포수'||c.player.position==='유격수'?.08:0)-(team!==c.player.team?(grade==='A'?.08:grade==='B'?.04:0):0)+clamp((budget.roomMan-200000)/2000000,-.08,.06);
    const floor=Math.max(minimumSalary(c.year)*1.5,Math.min(12000,(c.contract?.annualMan||minimumSalary(c.year))*.9));
    const honors=last?.awards||[],majorTitles=honors.filter(x=>TITLES.some(t=>t[0]===x)).length,starBonus=(honors.includes('MVP')?.7:0)+Math.min(3,majorTitles)*.14+(honors.some(x=>x.startsWith('골든글러브'))?.1:0);
    const proposed=(floor+value*105000+starBonus*75000)*ageFactor*demand,affordability=clamp((budget.roomMan-proposed*1.2)/250000,-.12,.04),annualMan=Math.max(Math.round(floor/100)*100,Math.round(proposed*(1+affordability)/100)*100);
    const signingBonusMan=Math.round(annualMan*(.55+r()*.45)/100)*100,optionMan=Math.round(annualMan*years*(.08+r()*.12)/100)*100;
    const guaranteedMan=annualMan*years+signingBonusMan,totalMan=guaranteedMan+optionMan;
    const compensation=grade==='A'?'전년도 연봉 200% + 보호 외 선수 1명(20인) 또는 300%':grade==='B'?'전년도 연봉 100% + 보호 외 선수 1명(25인) 또는 200%':'전년도 연봉 150% · 보상선수 없음';
    const options=[optionRule(c.player.role,c.player.position,optionMan/years)];
    return {kind:'fa',team,years,left:years,annualMan,totalMan,guaranteedMan,optionMan,options,signingBonusMan,grade,compensation,budget:{...budget,annualCostMan:annualMan+optionMan/years+signingBonusMan/years},role:i===1?'주전 경쟁':'주전 예상',power:Math.round(50+((last?.league?.teams.find(t=>t.id===team)?.w||72)-72)*.8),opportunity:rosterPlan(c).majorOpportunity};
  });
}
export function sign(c,offer) {
  if(c.phase!=='market'||!c.faDeclared||!offer||!offers(c).some(x=>x.team===offer.team&&x.totalMan===offer.totalMan))throw Error('FA 선언 후 유효한 제안만 선택할 수 있습니다.');
  const oldTeam=c.player.team;
  c.player.team=offer.team;c.contract={...offer};c.lastContract={year:c.year,oldTeam,...offer};c.faCount++;c.faCycleStart=c.year;c.faDeclared=false;c.reserved=true;c.playerStatus='reserved';c.salaryPending=false;c.salaryDecision=null;c.signingIncome+=offer.signingBonusMan;c.phase='contract_result';
  (c.contractHistory??=[]).push({year:c.year,...offer});
  note(c,`${TEAMS[offer.team]} FA 계약 · ${offer.years}년 최대 ${money(offer.totalMan)} · 보장 ${money(offer.guaranteedMan)} · 연봉 ${money(offer.annualMan)}`);
}
function renewSalary(c) {
  const old=c.contract?.annualMan||MIN_SALARY;
  const annual=salaryOffer(c);
  c.contract=reservedContract(annual);c.reserved=true;c.playerStatus='reserved';
  note(c,`${TEAMS[c.player.team]} 보류 유지 · 연봉 ${money(old)} → ${money(annual)}`);
}
export function deferFA(c) {
  if(c.phase!=='fa_choice')throw Error('현재 FA 선언 시점이 아닙니다.');
  c.faDeclared=false;c.phase='prepare';c.salaryPending=!c.contract||c.contract.left<=0;note(c,'FA 선언 유보 · 자격 유지');
}
export function salaryOffer(c) {
  const rows=c.history.filter(x=>x.stage==='프로'&&!x.military).slice(-3),old=c.contract?.annualMan||MIN_SALARY;
  if(!rows.length)return old;
  const weights=rows.map((_,i)=>i+1),weightTotal=weights.reduce((a,b)=>a+b,0);
  const score=rows.reduce((sum,row,i)=>{const volume=row.role==='bat'?row.stat.pa/440:row.position==='선발'?row.stat.outs/420:row.stat.outs/180;
    const observed=performance(row.stat.g?row.stat:row.minorStat||freshStat(row.role),row.role),adjusted=50+(observed-50)*clamp(volume,0,1);
    return sum+adjusted*weights[i];},0)/weightTotal;
  const playing=rows.at(-1).role==='bat'?rows.at(-1).stat.g/110:rows.at(-1).stat.g/55;
  const postseason=rows.at(-1).postseason?.stat,postBonus=postseason?.g?clamp((performance(postseason,c.player.role)-50)*.0003+postseason.g*.0005,-.01,.015):0;
  const budget=teamBudget(c.year,c.player.team,c),budgetFactor=clamp((budget.roomMan-200000)/1500000,-.05,.05);
  const latest=rows.at(-1),latestRate=rates(latest.stat,latest.role),veryPoor=latest.role==='bat'?latest.stat.pa>=80&&latestRate.avg<.18:latest.stat.outs>=45&&latestRate.era>7;
  const honors=latest.awards||[],titles=honors.filter(x=>TITLES.some(t=>t[0]===x)).length,full=latest.role==='bat'?latest.stat.pa>=400:latest.position==='선발'?latest.stat.outs>=360:latest.stat.outs>=120;
  const distinction=(honors.includes('MVP')?(old<20000?Math.max(20000,old*1.5):old*.4):0)+(honors.includes('신인왕')?(old<20000?6000:old*.12):0)+Math.min(3,titles)*(old<20000?4000:old*.08)+(honors.some(x=>x.startsWith('골든글러브'))?(old<20000?2000:old*.04):0);
  const signal=clamp((score-51)*.006+(clamp(playing,0,1)-.5)*.09+postBonus+budgetFactor,-.15,.35);
  const change=signal<0&&old<10000?Math.max(signal,-.025):signal;
  const merit=full?distinction:0;
  return Math.max(minimumSalary(c.year),Math.round((old*(1+(veryPoor?Math.min(change,-.02):change))+merit)/100)*100);
}
export function negotiateSalary(c,counter=false) {
  if(c.phase!=='prepare'||c.stage!=='프로'||!c.salaryPending||c.tradeOffer||c.contract?.kind==='fa'&&c.contract.left>0)throw Error('현재 연봉 협상 시점이 아닙니다.');
  const old=c.contract?.annualMan||MIN_SALARY,base=salaryOffer(c),last=c.history.filter(x=>x.stage==='프로'&&!x.military).at(-1);
  const form=last?performance(last.stat.g?last.stat:last.minorStat||freshStat(c.player.role),c.player.role):50;
  const teamWins=last?.league?.teams.find(t=>t.id===c.player.team)?.w||72;
  const expectation=base/old-1;
  const budget=teamBudget(c.year,c.player.team,c),honors=last?.awards||[],honorChance=(honors.includes('MVP')?.08:0)+Math.min(2,honors.filter(x=>TITLES.some(t=>t[0]===x)).length)*.04,chance=clamp(.24+honorChance+(form-50)*.003+(teamWins-72)*.001+(c.clubTrust-70)*.0015-Math.max(0,expectation)*.12-Math.max(0,old-30000)/250000+(budget.roomMan<12000?-.08:0),.08,.65);
  const accepted=counter&&rng(c.seed+c.year*83+7)()<chance,annual=counter&&accepted?Math.round((base+Math.max(300,Math.min(5000,(base-old)*.18)))/100)*100:base;
  c.contract=reservedContract(annual);c.reserved=true;c.playerStatus='reserved';c.salaryPending=false;
  const change=visibleSalaryChange(old,annual),result={year:c.year,kind:'reserved',team:c.player.team,years:1,oldMan:old,baseMan:base,annualMan:annual,totalMan:annual,guaranteedMan:annual,optionMan:0,signingBonusMan:0,renegotiated:counter,accepted,successChance:chance,raisePercent:change.kind==='삭감'?-change.rate:change.rate};
  (c.contractHistory??=[]).push(result);c.salaryDecision=result;
  if(counter&&!accepted)changeTrust(c,-3,'연봉 재협상 결렬');
  note(c,`${TEAMS[c.player.team]} ${counter?'재협상':'제안 수락'} · ${accepted?'성공':counter?'실패':'확정'} · ${money(old)} → ${money(annual)} (${change.kind==='동결'?'동결':`${change.rate}% ${change.kind}`})`);
  return result;
}
export function requestTrade(c) {
  if(c.phase!=='prepare'||c.stage!=='프로'||c.service||c.proYears<2||c.tradeRequestYear===c.year)throw Error('현재 트레이드를 요청할 수 없습니다.');
  c.tradeRequestYear=c.year;
  const r=rng(c.seed+c.year*619),value=readiness(c.player),contractBlock=c.contract?.kind==='fa'&&c.contract.left>1;
  const chance=clamp(.22+(value-50)*.004-(contractBlock?.11:0)+(c.player.position==='포수'?.04:0),.08,.53),roll=r();
  const outcome=roll<chance?'수락':roll<chance+.25?'보류':'거절',old=c.player.team,team=outcome==='수락'?(old+1+Math.floor(r()*9))%10:old;
  const offerMan=outcome==='수락'?c.contract?.annualMan??MIN_SALARY:null;
  const result={year:c.year,type:'trade',outcome,oldTeam:old,newTeam:team,offerMan,reason:contractBlock?'다년 계약과 전력 계획 검토':'선수 가치와 포지션 수요 검토',contractCarried:outcome==='수락',contractOutcome:outcome==='수락'?'자동 이적':'해당 없음'};
  (c.transactionHistory??=[]).push(result);c.tradeDecision=result;
  if(outcome==='수락'){c.player.team=team;if(c.contract)c.contract.team=team;}else changeTrust(c,-6,`트레이드 요청 ${outcome}`);
  if(outcome==='수락')c.pendingEvent=result;
  note(c,`트레이드 요청 ${outcome} · ${TEAMS[old]}${outcome==='수락'?` → ${TEAMS[team]} · 기존 계약 승계`:''}`);
  return result;
}
export function decideTradeOffer(c,accept){
  const offer=c.tradeOffer;if(!offer||c.phase!=='prepare')throw Error('확인할 트레이드 연봉 제안이 없습니다.');
  offer.contractOutcome=accept?'수락':'거절';c.tradeOffer=null;
  if(accept){const old=c.contract?.annualMan||MIN_SALARY;c.player.team=offer.newTeam;c.contract=reservedContract(offer.offerMan);c.contract.team=offer.newTeam;c.salaryPending=false;c.salaryDecision={year:c.year,kind:'trade',team:offer.newTeam,oldMan:old,annualMan:offer.offerMan};c.contractHistory.push({...c.salaryDecision,years:1,totalMan:offer.offerMan,guaranteedMan:offer.offerMan,optionMan:0,signingBonusMan:0});changeTrust(c,4,'새 구단 계약');}
  else {changeTrust(c,-3,'트레이드 제안 거절');if(!c.salaryPending&&c.contract?.left<=0)c.salaryPending=true;}
  note(c,`트레이드 연봉 제안 ${accept?'수락':'거절'} · ${TEAMS[offer.newTeam]} ${money(offer.offerMan)}`);return offer;
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
    const roll=rng(c.seed+c.year*983+19)(),accepted=roll<recruitment.probability,rank=accepted?1+Math.floor(roll/recruitment.probability*recruitment.slots):recruitment.slots+1+Math.floor((roll-recruitment.probability)/(1-recruitment.probability)*(20-recruitment.slots));
    c.lastSangmuResult={year:c.year,rank,total:20,accepted};
    if(!accepted){note(c,`상무 선발 탈락 · ${rank}/20위 · 현역 입대 또는 다음 해 재지원 가능`);return false;}
  }
  c.service=2;c.servicePath=path;c.phase='prepare';note(c,path==='athletic'?'상무 합격 · 입대':'현역 입대');return true;
}
export const nationalTournamentYear=(year,name)=>name==='프리미어12'?year>=2027&&(year-2027)%4===0:year>=2030&&(year-2030)%4===0;
const nationalKey=(year,name)=>`${year}:${name}`;
export function nationalInvitation(c,name,stat=null){
  if(c.stage!=='프로'||c.service||!nationalTournamentYear(c.year,name))return null;
  const key=nationalKey(c.year,name);
  if(c.nationalDecisions?.[key])return null;
  const last=stat||c.history.filter(x=>x.stage==='프로'&&!x.military&&x.role===c.player.role).at(-1)?.stat;
  if(!last?.g)return null;
  const volume=c.player.role==='bat'?last.pa/400:c.player.position==='선발'?last.outs/300:last.outs/90;
  const sample=clamp(volume,0,1),score=overall(c.player)*.6+(performance(last,c.player.role)*sample+50*(1-sample))*.4;
  const chance=clamp((score-52)/45,.03,.75)*(.35+.65*sample);
  const invited=rng(c.seed+c.year*997+['WBC','아시안게임','프리미어12'].indexOf(name)*61)()<chance;
  if(!invited){(c.nationalDecisions??={})[key]='미선발';return null;}
  return {type:'national_invitation',year:c.year,name,score:Math.round(score),month:name==='WBC'?'3월':name==='아시안게임'?'9월':'11월'};
}
export function preSeasonNationalInvitation(c){
  for(const name of ['WBC','아시안게임']){const invitation=nationalInvitation(c,name);if(invitation){c.pendingEvent=invitation;return invitation;}}
  return null;
}
function nationalOutcome(c,name,accepted){
  const won=accepted&&rng(c.seed+c.year*1231+['WBC','아시안게임','프리미어12'].indexOf(name)*109)()<(name==='아시안게임'?.43:.09);
  const event={year:c.year,name,selected:accepted,declined:!accepted,result:accepted?(won?'우승':'탈락'):'출전 거절',exemption:won&&name==='아시안게임'};
  if(event.exemption){c.exempt=true;c.served=true;}
  c.nationalHistory.push(event);note(c,`${name} ${accepted?`국가대표 출전 · ${event.result}`:'국가대표 출전 거절'}${event.exemption?' · 병역특례':''}`);
  return event;
}
export function decideNationalInvitation(c,accept){
  const invitation=c.pendingEvent;if(invitation?.type!=='national_invitation')throw Error('대표팀 선발 제안이 없습니다.');
  (c.nationalDecisions??={})[nationalKey(c.year,invitation.name)]=accept?'수락':'거절';
  c.pendingEvent=(c.eventQueue||[]).shift()||null;
  if(!accept||invitation.name!=='아시안게임'){
    const event=nationalOutcome(c,invitation.name,accept);
    if(accept&&invitation.name==='프리미어12'){const row=c.history.at(-1);if(row?.year===c.year)(row.international??=[]).push(event);queueEvent(c,{type:'national',year:c.year,items:[event]});}
    if(accept&&invitation.name==='WBC')queueEvent(c,{type:'national',year:c.year,items:[event]});
  }
}
export function nationalEvents(c,league,stat){
  if(c.stage!=='프로'||c.service)return [];
  const prior=c.nationalHistory.filter(x=>x.year===c.year&&x.name==='WBC'&&x.selected);
  if(c.nationalDecisions?.[nationalKey(c.year,'아시안게임')]==='수락'){
    const event=nationalOutcome(c,'아시안게임',true);
    return [...prior,event];
  }
  return prior;
}
export function positionOffer(c) {
  if(c.stage!=='프로'||c.phase!=='prepare'||c.service||(!c.served&&c.age>27)||c.adapt||c.proYears<2||c.positionDecisionYear===c.year||c.year%3!==0)return null;
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
export function experienceScore(stat,minorStat,role,position,stage='프로'){
  const scale=stage==='프로'?1:stage==='고교'?.28:.32;
  const combined=role==='bat'?{g:stat.g+minorStat.g*.55,pa:stat.pa+minorStat.pa*.55}:{g:stat.g+minorStat.g*.55,gs:stat.gs+minorStat.gs*.55,outs:stat.outs+minorStat.outs*.55};
  if(role==='bat')return clamp((combined.pa/(480*scale))*.75+(combined.g/(125*scale))*.25,0,1.2);
  if(position==='선발')return clamp((combined.gs/(25*scale))*.42+(combined.outs/(480*scale))*.58,0,1.2);
  return clamp((combined.g/(58*scale))*.55+(combined.outs/(160*scale))*.45,0,1.2);
}
export function coachRecommendation(c){const league=c.latest,peers=(league?.players||[]).filter(x=>x.team===c.player.team&&x.id!=='user'&&x.role===c.player.role),keys=KEYS[c.player.role];if(!peers.length)return {index:c.player.a.indexOf(Math.min(...c.player.a)),reason:'현재 선수단에서 부족한 능력을 보완할 훈련입니다.'};const averages=keys.map((_,i)=>peers.reduce((n,p)=>n+p.a[i],0)/peers.length),index=averages.indexOf(Math.min(...averages));return {index,reason:`팀의 ${keys[index]} 평균이 낮아 ${keys[index]} 훈련을 추천합니다.`};}
export function coachChallenge(c){
  if(c.stage!=='프로'||c.service||c.proYears<1||c.coachChallenge?.year===c.year)return null;
  if(rng(c.seed+c.year*1103+29)()>=.055)return null;
  const index=coachRecommendation(c).index,target=Math.min(95,Math.round((c.player.a[index]+1.5)*10)/10);
  c.coachChallenge={year:c.year,index,target};
  return c.coachChallenge;
}
export function progress(c,selected=c.training) {
  if(c.retired||!['prepare','season','incident'].includes(c.phase))throw Error('시즌 진행 단계에서만 진행할 수 있습니다.');
  if(c.pendingEvent)throw Error('주요 이벤트를 먼저 확인하세요.');
  if(c.tradeOffer)throw Error('새 구단의 연봉 제안을 먼저 결정하세요.');
  if(faContractTerm(c)?.active)c.salaryPending=false;
  if(c.salaryPending)throw Error('연봉 협상을 먼저 마치세요.');
  if(c.stage==='프로'&&!c.served&&!c.service&&c.age>27)throw Error('상무 지원 연령을 넘겼습니다. 현역 입대를 먼저 결정하세요.');
  const plan=trainingPlan(selected);c.training=plan.selected;
  const p=c.player,r=rng(c.seed+c.year*31+c.history.length+233),military=c.service>0,returning=c.service===1;
  const report=[],aBefore=[...p.a];let injury=injuryForecast(c),missed=0;
  if(injury){missed=Math.max(7,injury.days+(c.rehabChoice==='safe'?14:c.rehabChoice==='fast'?-10:0));injury={...injury,days:missed};c.injuries++;c.recurrenceAdjustment=c.rehabChoice==='safe'?-.04:c.rehabChoice==='fast'?.06:0;report.push(`${injury.body} ${injury.name} · ${missed}일 재활`);}
  const roster=rosterPlan(c,injury),environment=.985+(c.year%5)*.0125;
  let league=null,minorLeague=null,stat=freshStat(p.role),minorStat=freshStat(p.role),level=c.stage,registeredDays=0;
  const effectiveA=[...p.a];
  if(c.stage==='프로'){
    league=simulateSeason({seed:c.seed,year:c.year,environment,level:'major',player:military&&!returning?null:{...p,a:effectiveA,opportunity:roster.majorOpportunity,eligibleDays:roster.majorDays,cameo:roster.cameo,rookie:rookieEligible(c)}});
    stat=league.players.find(x=>x.id==='user')?.stat||stat;
    registeredDays=roster.registeredDays;level=military&&!returning?(c.servicePath==='athletic'?'상무':'현역'):roster.label;
    if(roster.minorDays.some(Boolean)||(military&&c.servicePath==='athletic')){
      minorLeague=simulateSeason({seed:c.seed+991,year:c.year,games:108,environment,level:'minor',strength:-12,player:{...p,a:effectiveA,opportunity:roster.minorOpportunity,eligibleDays:military&&!returning&&c.servicePath==='athletic'?undefined:roster.minorDays}});
      minorStat=minorLeague.players.find(x=>x.id==='user').stat;
      minorLeague.teams.forEach(t=>t.name=military&&t.id===p.team?'상무':`${TEAMS[t.id]} 2군`);
    }
  }else if(!military){
    league=simulateSeason({seed:c.seed,year:c.year,games:c.stage==='고교'?34:25,competitions:amateurCompetitions(c.stage),environment,level:'amateur',strength:c.stage==='고교'?-18:-12,player:{...p,a:effectiveA,opportunity:.94,missed}});
    stat=league.players.find(x=>x.id==='user').stat;
    league.teams.forEach(t=>t.name=t.id===p.team?(c.stage==='고교'?p.school:c.collegeTeam||COLLEGES[0]):(c.stage==='고교'?HIGH_SCHOOLS:COLLEGES).filter(name=>name!==(c.stage==='고교'?p.school:c.collegeTeam))[t.id%12]);
  }
  const experience=military&&!returning?(c.servicePath==='athletic'?.45:.08):experienceScore(stat,minorStat,p.role,p.position,c.stage);
  const potential=c.potential??1,injuryFactor=injury?clamp(1-missed/188*(c.rehabChoice==='fast'?1.15:.75),.45,1):1;
  const ageFactor=c.age<23?1.25:c.age<29?1:c.age<34?.75:c.age<38?.35:0;
  const totalGrowth=(military&&!returning&&c.servicePath==='regular'?0:(2.3+experience*8)*potential*ageFactor*injuryFactor);
  const weights=Array.from({length:6},(_,i)=>plan.selected.includes(i)?2.5:1),weightTotal=weights.reduce((n,x)=>n+x,0);
  for(let i=0;i<6;i++){const decline=c.age>=40?2.5+(c.age-40)*.9:c.age>33?(c.age-33)*.17:0,variation=military&&!returning&&c.servicePath==='regular'?-r()*.4:(r()-.5)*.65,delta=totalGrowth*weights[i]/weightTotal-decline+variation-(injury&&c.rehabChoice==='fast'?.2:0);p.a[i]=clamp(Math.round((p.a[i]+delta)*10)/10,0,95);}
  if(!military&&c.stage==='프로'&&c.coachChallenge?.year===c.year){const challenge=c.coachChallenge;if(p.a[challenge.index]>=challenge.target){c.positionOpportunityUntil=c.year+1;changeTrust(c,3,'코치 과제 달성 · 다음 시즌 출전 기회');report.push(`${KEYS[p.role][challenge.index]} 목표 달성 · 다음 시즌 출전 기회 확대`);}delete c.coachChallenge;}
  if(military){
    if(r()<.42){let i,delta,text;
      if(c.servicePath==='athletic'){i=p.role==='pitch'?1:0;delta=2+Math.floor(r()*3);text=p.role==='pitch'?'상무 코치와 투구 동작 교정':'상무 실전 타격 훈련';}
      else{i=3;delta=1+Math.floor(r()*2);text='현역 복무 중 기초 체력 유지';}
      if(r()<.2){delta=-2;text='복무 중 훈련 공백';}
      p.a[i]=clamp(p.a[i]+delta);report.push(`${text} · ${KEYS[p.role][i]} ${delta>0?'+':''}${delta}`);
    }
    c.service--;
    if(!c.service){c.served=true;report.push('전역');}
  }
  if(c.adapt>0&&!military)c.adapt--;

  let salaryMan=0,allowanceMan=0;
  if(c.stage==='프로'){
    if(military){allowanceMan=Math.min(1200,Math.round((c.contract?.annualMan||MIN_SALARY)*.25));c.allowanceIncome+=allowanceMan;if(returning){salaryMan=Math.round((c.contract?.annualMan||MIN_SALARY)*69/188);c.proYears++;if(c.contract)c.contract.left=Math.max(0,c.contract.left-1);}}
    else {salaryMan=c.contract?.annualMan||MIN_SALARY;c.proYears++;if(c.contract)c.contract.left=Math.max(0,c.contract.left-1);}
    const optionResults=military&&!returning?[]:settleOptions(c.contract,stat),optionPaidMan=optionResults.reduce((n,x)=>n+x.paidMan,0);
    c.salaryLedger.push({year:c.year,salaryMan,allowanceMan,optionPaidMan,optionResults,team:p.team});
    if(optionResults.length)report.push(...optionResults.map(x=>`${x.label} · ${x.earned?'달성':'미달'} · 지급 ${money(x.paidMan)}`));
  }
  if(c.stage==='대학'&&!military)c.collegeSeasons++;
  const international=military?[]:nationalEvents(c,league,stat);
  if(international.some(x=>x.selected&&x.name!=='WBC'))queueEvent(c,{type:'national',year:c.year,items:international.filter(x=>x.selected&&x.name!=='WBC')});
  const row={year:c.year,age:c.age,stage:c.stage,collegeTeam:c.stage==='대학'?c.collegeTeam:null,team:p.team,role:p.role,position:p.position,stat,minorStat,league,minorLeague,level,military:military&&!returning,servicePath:military?c.servicePath:null,registeredDays,salaryMan,allowanceMan,experience,totalGrowth,
    awards:league?.level==='major'?league.awards.filter(x=>x.winners.includes('user')).map(x=>x.title):[],report,injury,aBefore,aAfter:[...p.a],training:[...selected],trust:c.clubTrust,trustChanges:(c.trustHistory||[]).filter(x=>x.year===c.year),overallBefore:overall({...p,a:aBefore}),overall:overall(p),rosterMoves:c.stage!=='프로'?[]:roster.moves,rosterCalendar:c.stage==='프로'?roster.calendar:null,international,optionResults:c.salaryLedger.at(-1)?.optionResults||[]};
  if(c.stage==='프로'&&(!military||returning))row.level=seasonLevel(row);
  if(c.stage==='프로'&&league){row.postseason=postseasonResult(league,row,p,c.seed);const form=performance(stat,p.role),volume=p.role==='bat'?stat.pa/480:p.position==='선발'?stat.outs/480:stat.outs/180;if(!military||returning)changeTrust(c,clamp(Math.round((form-50)*.08+(volume-.5)*3),-4,4),'시즌 성적과 출장 평가');row.trust=c.clubTrust;row.trustChanges=(c.trustHistory||[]).filter(x=>x.year===c.year);for(const title of row.awards)note(c,`${title} 수상`);if(row.awards.length)queueEvent(c,{type:'award',year:c.year,titles:row.awards});if(row.postseason.regularRank<=5)queueEvent(c,{type:'postseason',year:c.year,regularRank:row.postseason.regularRank,finalRank:row.postseason.finalRank,champion:row.postseason.champion,team:row.team,selected:row.postseason.selected,ring:hasChampionshipRing(row)});}
  if(returning&&!c.service)queueEvent(c,{type:'discharge',year:c.year,path:c.servicePath});
  c.history.push(row);report.forEach(text=>note(c,text));c.latest=league;c.phase='result';delete c.rehabChoice;delete c.pendingTraining;
  if(c.stage==='프로'&&!military&&nationalTournamentYear(c.year,'프리미어12')){const invitation=nationalInvitation(c,'프리미어12',stat);if(invitation)queueEvent(c,invitation);}
  return row;
}
export function nextYear(c) {
  if(c.phase!=='result')throw Error('시즌 결과 확인 후 다음 시즌으로 진행하세요.');
  if(c.pendingEvent)throw Error('주요 이벤트를 먼저 확인하세요.');
  c.age++;c.year++;c.phase='prepare';
  if(c.service){return;}
  if(c.stage==='고교')c.phase='path';
  if(c.stage==='대학'){
    if(c.collegeSeasons>=4){c.collegeGraduate=true;c.phase='draft';}
    else if(collegeEarlyStatus(c).eligible)c.phase='college_choice';
  }
  if(c.stage==='프로'){
    if(faStatus(c).eligible){c.phase='fa_choice';return;}
    if(secondaryDraftEligible(c)){c.phase='secondary_wait';secondaryDraft(c);if(c.pendingEvent)return;}
    const evaluation=releaseAssessment(c);
    if(c.contract?.kind!=='fa'&&c.proYears>=2&&rng(c.seed+c.year*743+19)()<evaluation.probability){excludeFromReserve(c,evaluation.reason);return;}
    if(c.age>=36&&evaluation.score<(c.age>=42?68:c.age>=40?58:48)&&c.contract?.kind!=='fa'){c.phase='retirement_advice';c.pendingEvent={type:'retirement_advice',year:c.year,reason:evaluation.reason};return;}
    c.salaryPending=!c.contract||c.contract.left<=0;
    // Rare club-initiated transactions. A reserved player cannot shop for clubs.
    const r=rng(c.seed+c.year*811);
    if(c.phase==='prepare'&&c.proYears>=3&&c.contract?.kind!=='fa'&&r()<.045){
      const old=c.player.team,team=(old+1+Math.floor(r()*9))%10;c.player.team=team;if(c.contract)c.contract.team=team;const event={year:c.year,type:'trade',outcome:'구단 간 트레이드',oldTeam:old,newTeam:team,reason:'구단 간 전력 보강',contractCarried:true};c.transactionHistory.push(event);c.pendingEvent=event;note(c,`구단 간 트레이드 · ${TEAMS[old]} → ${TEAMS[team]} · 연봉 승계`);
    }
  }
}
function queueEvent(c,event){if(c.pendingEvent)(c.eventQueue??=[]).push(event);else c.pendingEvent=event;}
export function acknowledgeEvent(c){if(!c.pendingEvent)throw Error('확인할 이벤트가 없습니다.');c.pendingEvent=(c.eventQueue||[]).shift()||null;}
export function releaseAssessment(c){
  const rows=c.history.filter(x=>x.stage==='프로'&&!x.military&&x.role===c.player.role).slice(-3);
  const form=rows.length?rows.reduce((n,x,i)=>n+performance(x.stat.g?x.stat:x.minorStat||freshStat(x.role),x.role)*(i+1),0)/rows.reduce((n,_,i)=>n+i+1,0):50;
  const games=rows.length?rows.reduce((n,x)=>n+(x.stat.g||0),0)/rows.length:0;
  const score=overall(c.player)*.48+form*.25+Math.min(100,games)*.15-(c.age>33?(c.age-33)*1.8:0)-(c.contract?.kind==='fa'?12:0)+(c.player.position==='포수'?3:0);
  return {score,form,games,probability:clamp((45-score)/120,0,.32),reason:`최근 ${rows.length}시즌 성적·출장, ${c.age}세, ${c.player.position} 경쟁과 계약 평가`};
}
export function secondaryDraftAssessment(c){
  const peers=(c.latest?.players||[]).filter(p=>p.team===c.player.team&&p.id!=='user').map(overall),r=rng(c.seed+c.year*41+c.player.team*23);
  while(peers.length<67)peers.push(35+r()*34);
  const form=releaseAssessment(c).form,score=overall(c.player)*.8+form*.2-(c.age>32?(c.age-32)*.7:0)-(c.contract?.kind==='fa'&&c.contract.annualMan>30000?4:0);
  const rank=1+peers.filter(x=>x>score).length;
  return {protectedCount:35,rank,protected:rank<=35,score};
}
export function secondaryDraftEligible(c){const enteringYear=c.history.filter(x=>x.stage==='프로').length+1,armyHold=c.history.some(x=>x.servicePath&&x.stage==='프로');return c.stage==='프로'&&c.reserved&&!c.service&&!c.faDeclared&&!faStatus(c).eligible&&enteringYear>3&&!(enteringYear===4&&armyHold)&&c.year>=2028&&c.year%2===0&&!secondaryDraftAssessment(c).protected;}
export function secondaryDraft(c){
  if(c.phase!=='secondary_wait'||!secondaryDraftEligible(c))throw Error('2차 드래프트 지명 대상이 아닙니다.');
  const old=c.player.team,roll=rng(c.seed+c.year*229+31)(),selected=roll<clamp((overall(c.player)-37)/110,.06,.3);
  const standings=[...(c.latest?.teams||TEAMS.map((_,id)=>({id,w:72,l:72})))].sort((a,b)=>a.w/(a.w+a.l||1)-b.w/(b.w+b.l||1)||a.id-b.id).map(x=>x.id),order=standings.filter(id=>id!==old);
  const team=selected?order[Math.floor(roll*997)%order.length]:old,orderRank=selected?standings.indexOf(team):null,maxRounds=orderRank!==null&&orderRank<3?5:3,round=selected?1+Math.floor(rng(c.seed+c.year*331+team)()*maxRounds):null;
  if(selected){c.player.team=team;if(c.contract)c.contract.team=team;}
  const event={year:c.year-1,type:'secondary',selected,oldTeam:old,newTeam:team,round,protectedCount:35,clubPickLimit:maxRounds,sourceClubLossLimit:4,reason:'35인 보호 명단 밖 소속 선수에 대한 구단 지명',contractCarried:selected};
  c.transactionHistory.push(event);c.pendingEvent=selected?event:null;c.phase='prepare';c.events.push({year:event.year,text:selected?`2차 드래프트 지명 · ${TEAMS[old]} → ${TEAMS[team]}`:'2차 드래프트 미지명 · 원 소속 보류 유지'});return event;
}
export function excludeFromReserve(c,reason='보류선수 명단 제외'){
  if(c.stage!=='프로'||!c.reserved||c.contract?.kind==='fa'&&c.contract.left>0)throw Error('보류 관계를 종료할 수 없는 상태입니다.');
  const event={year:c.year-1,type:'release',procedure:'postseason_exclusion',reason,oldTeam:c.player.team,status:'자유계약 선수',salaryMan:c.contract?.annualMan||0,contractTreatment:'기존 단년 계약 종료 · 미래 연봉 미보장'};
  c.transactionHistory.push(event);c.pendingEvent=event;c.playerStatus='free_agent';c.reserved=false;c.salaryPending=false;c.contract=null;c.phase='release_choice';c.events.push({year:event.year,text:`${TEAMS[event.oldTeam]} 보류선수 명단 제외 · 자유계약 선수`});return event;
}
export function releasedSecondaryDraft(c){if(c.phase!=='release_choice'||c.playerStatus!=='free_agent')throw Error('현재 2차 드래프트 참가 대상이 아닙니다.');const old=c.player.team,r=rng(c.seed+c.year*251+71),selected=r()<clamp((overall(c.player)-35)/120,.04,.35);if(!selected){c.phase='free_tryout_choice';note(c,'2차 드래프트 미지명');return {selected:false};}const team=(old+1+Math.floor(r()*9))%10;c.player.team=team;c.contract=reservedContract(minimumSalary(c.year));c.reserved=true;c.playerStatus='reserved';c.phase='prepare';const event={year:c.year,type:'secondary',selected:true,oldTeam:old,newTeam:team};c.transactionHistory.push(event);c.pendingEvent=event;note(c,`2차 드래프트 지명 · ${TEAMS[old]} → ${TEAMS[team]}`);return event;}
export function waiverCheck(c){
  if(c.phase!=='season'||c.stage!=='프로'||!c.reserved||c.service||c.proYears<4||c.contract?.kind==='fa'||c.waiverCheckedYear===c.year)return null;
  c.waiverCheckedYear=c.year;
  const evaln=releaseAssessment(c),roll=rng(c.seed+c.year*371+53)();if(roll>=evaln.probability*.22)return null;
  const old=c.player.team,claimed=rng(c.seed+c.year*337+17)()<clamp((overall(c.player)-40)/100,.05,.45),team=claimed?(old+1+Math.floor(roll*103)%9)%10:old;
  if(claimed){c.player.team=team;if(c.contract)c.contract.team=team;}
  const event={year:c.year,gameDay:1,type:'waiver',procedure:'inseason_waiver',claimed,oldTeam:old,newTeam:team,reason:evaln.reason,status:claimed?'새 구단 소속':'자유계약 선수',contractTreatment:claimed?'기존 단년 계약 승계':'기존 단년 계약 종료 · 당해 연도 KBO 구단 계약 불가'};
  c.transactionHistory.push(event);c.pendingEvent=event;c.playerStatus=claimed?'reserved':'free_agent';c.reserved=claimed;c.phase=claimed?'season':'waiver_wait';if(!claimed){c.contract=null;c.freeAgentEligibleYear=c.year+1;}note(c,`정규시즌 첫 경기 전 웨이버 공시 · ${claimed?`${TEAMS[team]} 영입`:'미영입 · 다음 해 계약 가능'}`);return event;
}
export function advanceWaiverYear(c){if(c.phase!=='waiver_wait'||c.pendingEvent)throw Error('웨이버 후 대기 단계가 아닙니다.');c.year++;c.age++;c.phase='free_agent';note(c,'웨이버 미영입 뒤 다음 연도 자유계약 협상 가능');}
export function freeAgentOffers(c){
  if(c.phase!=='free_agent'||c.playerStatus!=='free_agent')return [];
  const score=releaseAssessment(c).score,offers=[];for(let i=1;i<=3;i++){const team=(c.player.team+i*3)%10,roll=rng(c.seed+c.year*773+i*23)();if(roll<clamp((score-32)/120,.03,.56))offers.push({team,annualMan:Math.max(minimumSalary(c.year),Math.round((minimumSalary(c.year)+(score-30)*380)/100)*100),kind:'reserved',years:1,left:1});}return offers;
}
export function signFreeAgent(c,offer){
  if(c.phase!=='free_agent'||!freeAgentOffers(c).some(x=>x.team===offer?.team&&x.annualMan===offer.annualMan))throw Error('유효한 자유계약 제안을 선택하세요.');
  const old=c.player.team;c.player.team=offer.team;c.contract=reservedContract(offer.annualMan);c.reserved=true;c.playerStatus='reserved';c.phase='prepare';c.contractHistory.push({year:c.year,team:offer.team,...c.contract});const event={year:c.year,type:'rejoin',oldTeam:old,newTeam:offer.team,reason:'자유계약 영입',annualMan:offer.annualMan};c.transactionHistory.push(event);c.pendingEvent=event;note(c,`${TEAMS[offer.team]} 자유계약 입단 · ${money(offer.annualMan)}`);return event;
}
export function freeAgentTryout(c){
  if(!['free_agent','free_tryout_choice'].includes(c.phase)||c.playerStatus!=='free_agent'||c.tryoutYear===c.year)throw Error('올해 입단 테스트에 참가할 수 없습니다.');
  c.tryoutYear=c.year;const roll=rng(c.seed+c.year*461+41)(),success=roll<clamp((overall(c.player)-35)/110,.03,.48),old=c.player.team,team=success?(old+2+Math.floor(roll*37)%8)%10:old;
  const event={year:c.year,type:'tryout',success,oldTeam:old,newTeam:team,reason:'게임 내 입단 테스트',annualMan:success?minimumSalary(c.year):0};
  if(success){c.player.team=team;c.contract=reservedContract(minimumSalary(c.year));c.reserved=true;c.playerStatus='reserved';c.phase='prepare';c.contractHistory.push({year:c.year,team,...c.contract});}else if(c.phase==='free_tryout_choice'||!freeAgentOffers(c).length)retire(c,'재취업 시장 실패');c.transactionHistory.push(event);c.pendingEvent=event;note(c,success?`${TEAMS[team]} 입단 테스트 합격`:'입단 테스트 불합격');return event;
}
export function careerScore(c){const rows=c.history.filter(x=>x.stage==='프로'&&!x.military),seasons=Math.max(1,rows.length),s=sumStats(rows.map(x=>x.stat),c.player.role),post=sumStats(rows.map(x=>x.postseason?.stat).filter(Boolean),c.player.role),awards=rows.reduce((n,x)=>n+x.awards.length,0),titles=rows.reduce((n,x)=>n+x.awards.filter(a=>['MVP','신인왕'].includes(a)).length,0),wins=rows.filter(hasChampionshipRing).length;const production=c.player.role==='bat'?Math.min(350,(s.pa/seasons)*.28+(s.h/seasons)*.6):Math.min(350,(s.outs/seasons)*.21+(s.k/seasons)*.65+(s.sv+Math.round(s.hold*.5))/seasons*.9);const participation=Math.min(250,rows.reduce((n,x)=>n+(x.level==='1군 주전'?28:x.level==='1군 준주전'?19:x.level==='1군 백업'?10:2),0));return Math.round(production+participation+awards*12+titles*45+wins*22+post.g*3);}
export function retire(c,reason='본인 선택') {c.retired=true;c.phase='retired';c.playback=null;c.retirementReason=reason;c.careerScore=careerScore(c);note(c,`${c.age}세 은퇴 · ${reason} · 통산 연봉 ${money(totalSalary(c))}`);}
export function decideRetirementAdvice(c,accept){if(c.phase!=='retirement_advice')throw Error('은퇴 권고 단계가 아닙니다.');c.pendingEvent=null;if(accept){retire(c,'은퇴 권고 수락');return;}excludeFromReserve(c,'은퇴 권고 거부 · 다른 구단 제안 대기');c.phase='free_agent';}
export function totalSalary(c) {return c.salaryLedger.reduce((s,x)=>s+(x.salaryMan||0),0);}

export const COMPARISONS={
  bat:[['타율','avg',false],['안타','h',false],['홈런','hr',false],['출루율','obp',false],['장타율','slg',false],['OPS','ops',false],['볼넷%','bbRate',false],['삼진%','kRate',true],['도루','sb',false]],
  pitch:[['평균자책','era',true],['WHIP','whip',true],['K/9','k9',false],['BB/9','bb9',true],['승','w',false],['세이브','sv',false],['홀드','hold',false],['이닝','outs',false]]
};
export function statValue(stat,role,key) {
  if(key==='winPct')return stat.w+stat.l?stat.w/(stat.w+stat.l):0;
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
  const games=p=>league.teams.find(t=>t.id===p.team)?.g??league.games;
  const sameRole=p=>p.role===role&&(role==='bat'||(p.position==='선발')===(mine.position==='선발'));
  return COMPARISONS[role].map(([label,key,lower])=>{const cumulative=['h','hr','sb','w','sv','hold','outs','k'].includes(key),actual=role==='bat'?mine.stat.pa:mine.stat.outs,full=qualification(games(mine),role),band=actual>=full?1:actual>=full*.75?.75:actual>=full*.5?.5:actual>=full*.25?.25:0,flag=band===1?'충족':band?Math.round(band*100)+'%':'미달',min=Math.ceil(full*band),group=band?league.players.filter(p=>sameRole(p)&&(role==='bat'?p.stat.pa:p.stat.outs)>=Math.ceil(qualification(games(p),role)*band)):[];return {label,key,value:statValue(mine.stat,role,key),percentile:band&&group.length>=10?percentile(statValue(mine.stat,role,key),group.map(p=>statValue(p.stat,role,key)),lower):null,count:group.length,threshold:min,qualification:flag,lower,cumulative};});
}

// v1 did not record salary paid; never invent historical earnings during migration.
export function migrateCareer(old) {
  const c=structuredClone(old);
  c.eventQueue??=[];
  if([VERSION,5,4,3,2].includes(c.version)){const historicalDefense=c.version<4;c.version=VERSION;c.playback??=null;c.retirementReason??=c.retired?'기존 기록':null;c.lastContract??=null;c.clubTrust??=70;c.potential??=1;c.trustHistory??=[];c.nationalDecisions??={};c.training=c.training?.slice(0,2)||[0];if(c.pendingTraining)c.pendingTraining=c.pendingTraining.slice(0,2);if(c.contract?.kind==='fa'&&c.contract.left>0)c.salaryPending=false;delete c.condition;delete c.gameSense;delete c.popularity;c.contractHistory??=[];c.nationalHistory??=[];c.transactionHistory??=[];c.pendingEvent??=null;if(c.pendingEvent?.type==='coach_challenge'){c.coachChallenge={year:c.pendingEvent.year,index:c.pendingEvent.index,target:c.pendingEvent.target};c.pendingEvent=null;}c.eventQueue=c.eventQueue.filter(x=>x.type!=='coach_challenge');c.exempt??=false;c.playerStatus??=(c.faDeclared?'fa':c.stage==='프로'?'reserved':'amateur');if(c.player.role==='pitch'&&['선발형','마무리형'].includes(c.player.type))c.player.type=c.player.type==='선발형'?'완급형':'위기관리형';if(c.tradeOffer){c.player.team=c.tradeOffer.newTeam;if(c.contract)c.contract.team=c.player.team;c.pendingEvent={...c.tradeOffer,contractOutcome:'자동 이적'};c.tradeOffer=null;}if(c.player.type==='땅볼 유도형')c.player.type='완급형';if(c.stage==='대학')c.collegeTeam??='대학 야구부';if(['salary','position_result'].includes(c.pendingEvent?.type)){if(c.pendingEvent.type==='salary')c.salaryDecision=c.pendingEvent;c.pendingEvent=null;}for(const row of c.history){if(historicalDefense){row.defenseUnrecorded=true;for(const league of [row.league,row.minorLeague])if(league)league.defenseUnrecorded=true;}delete row.gameSense;delete row.condition;delete row.popularity;if(row.role==='bat'){row.stat.e??=0;row.stat.ch??=0;row.minorStat&&(row.minorStat.e??=0,row.minorStat.ch??=0);}for(const league of [row.league,row.minorLeague])for(const player of league?.players||[])if(player.role==='bat'){player.stat.e??=0;player.stat.ch??=0;}}if(c.phase==='secondary_wait'){if(secondaryDraftEligible(c))secondaryDraft(c);else c.phase='prepare';}return c;}
  if(c.version!==1)throw Error('지원하지 않는 저장 버전입니다.');
  c.version=VERSION;c.training=[0];c.clubTrust=70;c.potential=1;c.trustHistory=[];c.nationalDecisions={};delete c.condition;delete c.gameSense;delete c.popularity;c.collegeSeasons=c.history.filter(x=>x.stage==='대학'&&!x.military).length;c.collegeGraduate=c.collegeSeasons>=4;
  c.faCount=0;c.faCycleStart=0;c.faDeclared=false;c.reserved=c.stage==='프로';c.salaryLedger=[];c.contractHistory=[];c.signingIncome=0;c.allowanceIncome=0;c.draftAttempts=[];c.nationalHistory=[];c.transactionHistory=[];c.pendingEvent=null;c.exempt=false;c.playerStatus=c.stage==='프로'?'reserved':'amateur';
  if(c.stage==='대학')c.collegeTeam='대학 야구부';c.legacySalaryYears=c.history.filter(x=>x.stage==='프로'&&!x.military).length;
  c.contract=c.stage==='프로'?reservedContract(Math.max(MIN_SALARY,Math.round((old.contract?.total||33)/(old.contract?.years||1)*100))):null;
  c.history.forEach(row=>{
    delete row.gameSense;delete row.condition;delete row.popularity;row.defenseUnrecorded=true;if(row.league)row.league.defenseUnrecorded=true;if(row.role==='bat'){row.stat.e??=0;row.stat.ch??=0;}row.salaryMan=null;row.minorStat=null;row.minorLeague=null;row.registeredDays=row.stage==='프로'&&!row.military?Math.min(188,Math.round((row.role==='bat'?row.stat.g:row.stat.gs?row.stat.gs*5:row.stat.g*2)*188/144)):0;row.registrationEstimated=true;
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
  if(c.version===VERSION){trainingPlan(c.training);if(!Array.isArray(c.salaryLedger)||!Array.isArray(c.draftAttempts)||!Array.isArray(c.nationalHistory)||!Array.isArray(c.transactionHistory)||!Number.isFinite(c.clubTrust)||!Array.isArray(c.trustHistory)||!Number.isFinite(c.collegeSeasons)||!Number.isFinite(c.faCount)||!Number.isFinite(c.faCycleStart)||!Number.isFinite(c.signingIncome)||!Number.isFinite(c.allowanceIncome))throw Error('커리어 데이터가 손상되었습니다.');}
  for(const row of c.history){if(!row.stat||!Array.isArray(row.awards)||!['bat','pitch'].includes(row.role)||Object.keys(freshStat(row.role)).filter(k=>c.version===VERSION||!['e','ch'].includes(k)).some(k=>!Number.isFinite(row.stat[k]))||Object.values(row.stat).some(v=>!Number.isFinite(v))||[row.league,row.minorLeague].some(l=>l&&(!Array.isArray(l.players)||!Array.isArray(l.teams)||!Array.isArray(l.awards))))throw Error('시즌 기록이 손상되었습니다.');}
  return c;
}
export function loadCareer(storage=localStorage) {
  const raw=storage.getItem(SAVE_KEY)||LEGACY_SAVE_KEYS.map(key=>storage.getItem(key)).find(Boolean);if(!raw)return null;
  const old=JSON.parse(raw);if(![1,2,3,4,5,VERSION].includes(old?.version))throw Error('지원하지 않는 저장 버전입니다.');validateCareer(old);return validateCareer(migrateCareer(old));
}
export function saveCareer(c,storage=localStorage) {validateCareer(c);storage.setItem(SAVE_KEY,JSON.stringify(c));}
