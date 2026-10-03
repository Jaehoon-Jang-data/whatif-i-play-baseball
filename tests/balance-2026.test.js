import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,simulateSeason,emptyBat,emptyPitch,ranking,awards,rosterPlan,percentileReport,qualification,skillCaps,progress,archetype,positionOffer,moveTeam,requestTrade,injuryForecast,offers,negotiateSalary,rates} from '../src/engine.js';
const config=(seed,role='bat',position='유격수')=>({seed,name:'검증',school:'검증고',team:0,role,position,type:role==='bat'?'교타형':'변화구형'});
const pro=(seed=1,role='bat',position='유격수')=>{const c=createCareer(config(seed,role,position));c.stage='프로';c.phase='prepare';c.year=2030;c.age=29;c.proYears=4;c.served=true;c.reserved=true;c.contract={kind:'reserved',annualMan:5000,left:0};return c;};
test('도루 시도·성공·실패는 원기록과 투수 아웃에 일치하고 팀 분포가 KBO 범위에 근접한다',()=>{
 const seasons=Array.from({length:12},(_,i)=>simulateSeason({seed:11+i*19,year:2029}));
 const totals=seasons.map(s=>s.players.filter(p=>p.role==='bat').reduce((a,p)=>{a.sb+=p.stat.sb;a.sba+=p.stat.sba;a.cs+=p.stat.cs;return a;},{sb:0,sba:0,cs:0}));
 assert.ok(totals.every(x=>x.sba===x.sb+x.cs));const perTeam=totals.reduce((n,x)=>n+x.sb,0)/(seasons.length*10);assert.ok(perTeam>75&&perTeam<115,perTeam);assert.ok(seasons.every(s=>Math.max(...s.players.filter(p=>p.role==='bat').map(p=>p.stat.sb))>=20));
 const s=seasons[0],bat=s.players.filter(p=>p.role==='bat').reduce((a,p)=>{for(const key of Object.keys(a))a[key]+=p.stat[key]||0;return a;},emptyBat()),outs=s.players.filter(p=>p.role==='pitch').reduce((n,p)=>n+p.stat.outs,0);assert.equal(bat.ab-bat.h+bat.sf-bat.e+bat.cs,outs);
});
test('동일 리그의 투수·타자는 네 표본 구간 이상을 비교하고 소수 표본도 산출한다',()=>{
 for(const role of ['bat','pitch'])for(const [ratio,label] of [[.25,'25%'],[.5,'50%'],[.75,'75%'],[1,'충족']]){
  const limit=qualification(144,role),volume=Math.ceil(limit*ratio),stat=(v,key)=>role==='bat'?{...emptyBat(),g:70,pa:v,ab:v,h:Math.floor(v*.3)}:{...emptyPitch(),g:40,outs:v,k:v};
  const players=[{id:'user',role,team:0,position:role==='bat'?'유격수':'선발',stat:stat(volume)},{id:'equal',role,team:0,position:role==='bat'?'좌익수':'마무리',stat:stat(volume)},{id:'full',role,team:0,position:role==='bat'?'포수':'중간계투',stat:stat(limit)},{id:'below',role,team:0,position:role==='bat'?'포수':'선발',stat:stat(Math.max(0,volume-1))}];
  const report=percentileReport({games:144,teams:[{id:0,g:144}],players},role);assert.equal(report[0].qualification,label);assert.equal(report[0].count,ratio===.25?4:3);assert.ok(Number.isFinite(report[0].percentile));
 }
});
test('비교 선수 두 명인 규정이닝 집단도 백분위를 그린다',()=>{const players=[0,1].map(i=>({id:i?'peer':'user',role:'pitch',position:i?'마무리':'선발',team:0,stat:{...emptyPitch(),g:30,outs:432,er:30+i}}));const row=percentileReport({games:144,teams:[{id:0,g:144}],players},'pitch')[0];assert.equal(row.count,2);assert.ok(Number.isFinite(row.percentile));});
test('능력별 상한, 선수 유형 전환, 나이별 보직 제안',()=>{
 const c=pro(17);c.potentialCaps=[75,75,75,75,75,75];c.player.a=[74,74,74,74,74,74];progress(c,[1]);assert.ok(c.player.a.every(x=>x<=75));assert.equal(archetype('pitch',[88,54,84,65,60,60],'변화구형'),'파이어볼러');
 const p=pro(8,'pitch','선발');p.age=35;p.player.a=[70,70,70,48,70,70];assert.equal(positionOffer(p).target,'중간계투');assert.match(positionOffer(p).reason,/체력/);
 const b=pro(9);b.age=35;b.player.a=[70,70,70,70,40,70];assert.ok(['1루수','좌익수','우익수','지명타자'].includes(positionOffer(b).target));assert.match(positionOffer(b).reason,/경쟁 전력/);
});
test('구단 전력과 성적은 트레이드 수락률·FA 금액에 영향을 주고 이적 시 신뢰도가 초기화된다',()=>{
 const low=pro(11),star=structuredClone(low);low.player.a.fill(52);star.player.a.fill(86);low.clubTrust=star.clubTrust=90;assert.ok(requestTrade(low).chance>requestTrade(star).chance);moveTeam(star,1);assert.equal(star.clubTrust,70);
 const fa=pro(3);fa.phase='market';fa.faDeclared=true;fa.age=28;fa.history=[{stage:'프로',role:'bat',position:'유격수',stat:{...emptyBat(),g:140,pa:600,ab:530,h:175,hr:25,bb:60},league:{players:[{id:'rival',team:3,role:'bat',position:'유격수',a:[95,95,95,95,95,95]},{id:'weak',team:7,role:'bat',position:'유격수',a:[40,40,40,40,40,40]}]}}];const x=offers(fa);assert.equal(x.length,3);assert.ok(x.some(o=>o.years>=5));assert.ok(x.some(o=>o.optionMan===0));assert.ok(x.some(o=>o.optionMan>0));assert.ok(x.find(o=>o.team===7).need>x.find(o=>o.team===3).need);assert.ok(x.find(o=>o.team===7).annualMan>x.find(o=>o.team===3).annualMan);
});
test('고교 부상은 성인보다 낮고 승률왕은 10승으로 규정이닝 미달도 가능하다',()=>{
 let hs=0,proCount=0;for(let seed=1;seed<=300;seed++){const a=pro(seed);a.stage='고교';a.age=18;hs+=+Boolean(injuryForecast(a));a.stage='프로';a.age=27;proCount+=+Boolean(injuryForecast(a));}assert.ok(hs<proCount);
 const players=[{id:'relief',role:'pitch',position:'마무리',team:0,a:Array(6).fill(60),stat:{...emptyPitch(),g:50,outs:120,w:10,l:1}},{id:'starter',role:'pitch',position:'선발',team:0,a:Array(6).fill(60),stat:{...emptyPitch(),g:30,outs:450,w:15,l:4}}];const league={players,games:144,teams:[{id:0,g:144}]};assert.equal(ranking(league,'pitch','winPct',false)[0].id,'relief');assert.ok(awards(league).find(x=>x.title==='승률왕').winners.includes('relief'));
});
test('v6 저장 키와 도루 원기록·상한 이관',async()=>{
 const {loadCareer,saveCareer}=await import('../src/engine.js');
 const c=pro(21);progress(c);const old=structuredClone(c);old.version=6;delete old.potentialCaps;
 for(const row of old.history){if(row.role==='bat'){delete row.stat.sba;delete row.stat.cs;if(row.minorStat){delete row.minorStat.sba;delete row.minorStat.cs;}}for(const league of [row.league,row.minorLeague])for(const p of league?.players||[])if(p.role==='bat'){delete p.stat.sba;delete p.stat.cs;}}
 const raw=JSON.stringify(old),restored=loadCareer({getItem:key=>key==='charari-naega-kiunda-v6'?raw:null});assert.equal(restored.version,7);assert.equal(restored.history[0].stat.sba,restored.history[0].stat.sb);assert.equal(restored.history[0].stat.cs,0);assert.ok(restored.potentialCaps.every((v,i)=>v>=restored.player.a[i]));let saved;saveCareer(restored,{setItem:(_,value)=>saved=value});assert.equal(JSON.parse(saved).version,7);
});
test('강한 포지션 경쟁자는 준수한 선수를 강등시킬 수 있고 호성적 연봉은 유의미하게 오른다',()=>{
 const c=pro(7);c.player.a.fill(68);c.history=[{stage:'프로',role:'bat',position:'유격수',stat:{...emptyBat(),g:140,pa:600,ab:520,h:175,d:30,hr:25,bb:65,sf:5}}];
 const oldSalary=c.contract.annualMan;c.salaryPending=true;assert.ok(negotiateSalary(c).annualMan>oldSalary+3000);
 const alone=rosterPlan(c);c.latest={year:2029,players:[{id:'rival',team:0,role:'bat',position:'유격수',a:Array(6).fill(92)}]};const crowded=rosterPlan(c);assert.ok(crowded.score<alone.score);assert.ok(crowded.moves.some(x=>x.from==='1군'&&x.to==='2군'&&x.reason.includes('경쟁')));c.player.a.fill(90);assert.ok(!rosterPlan(c).moves.some(x=>x.from==='1군'&&x.to==='2군'));
});
test('실제 FA 이적도 새 구단 신뢰도 70에서 시작한다',async()=>{
 const {sign}=await import('../src/engine.js');const c=pro(44);c.clubTrust=24;c.phase='market';c.faDeclared=true;c.age=28;const away=offers(c).find(x=>x.team!==c.player.team);sign(c,away);assert.equal(c.player.team,away.team);assert.equal(c.clubTrust,70);assert.equal(c.trustHistory.at(-1).reason,'새 구단 신뢰도 초기화');
});
