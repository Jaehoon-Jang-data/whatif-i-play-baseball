import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,rookieSigningBonus,minimumSalary,emptyBat,emptyPitch,salaryOffer,simulateSeason,positionOffer,progress,nextYear,resolvePositionOffer,acknowledgeEvent,awards,awardLine,careerRecordMarker,militaryOpportunities,nationalTournamentYear,tournamentResult,decideNationalInvitation,nationalEvents,saveCareer,loadCareer} from '../src/engine.js';

const make=(seed,role='bat',position=role==='bat'?'우익수':'선발')=>{const c=createCareer({seed,name:'검증',school:'검증고',team:0,role,position,type:role==='bat'?'교타형':'변화구형'});c.stage='프로';c.phase='prepare';c.year=2030;c.age=25;c.proYears=4;c.served=true;c.contract={kind:'reserved',annualMan:5000,left:0};return c;};

test('신인 계약금은 라운드별로 감소하고 7라운드는 1억원 미만이다',()=>{
 const first=Array.from({length:11},(_,i)=>rookieSigningBonus(i+1,1));assert.ok(first.every((v,i)=>i===0||v<first[i-1]));assert.equal(rookieSigningBonus(1,1),65000);assert.ok(rookieSigningBonus(7,1)>=5000&&rookieSigningBonus(7,1)<10000);assert.ok(rookieSigningBonus(7,10)<=rookieSigningBonus(7,1));
});

test('최저연봉 자동 인상 없이 부진 동결·삭감과 호성적 인상이 구분된다',()=>{
 assert.equal(minimumSalary(2027),minimumSalary(2040));
 const noGames=make(1);noGames.contract.annualMan=3300;noGames.history=[{stage:'프로',role:'bat',position:'우익수',stat:emptyBat()}];assert.equal(salaryOffer(noGames),3300);
 const poor=make(2);poor.contract.annualMan=10000;poor.history=[{stage:'프로',role:'bat',position:'우익수',stat:{...emptyBat(),g:120,pa:400,ab:380,h:45}}];assert.ok(salaryOffer(poor)<10000);
 const good=make(3);good.history=[{stage:'프로',role:'bat',position:'우익수',stat:{...emptyBat(),g:140,pa:600,ab:520,h:180,hr:25,bb:65}}];assert.ok(salaryOffer(good)>5000);
});

test('시즌 내내 등록된 선발은 로테이션을 돌고 중간계투는 세이브가 없다',()=>{
 const starters=[],middle=[],closers=[];
 for(let seed=1;seed<=12;seed++)for(const [position,target] of [['선발',starters],['중간계투',middle],['마무리',closers]]){
  const season=simulateSeason({seed,year:2030,player:{name:'검증',role:'pitch',position,team:0,a:[75,75,75,75,75,75],opportunity:1}});
  target.push(season.players.find(p=>p.id==='user').stat);
 }
 assert.ok(starters.every(s=>s.gs>=24&&s.gs<=32),starters.map(s=>s.gs).join(','));assert.ok(middle.every(s=>s.sv===0));assert.ok(closers.some(s=>s.sv>=10));assert.ok(closers.reduce((n,s)=>n+s.sv,0)>middle.reduce((n,s)=>n+s.sv,0));
});

test('우수한 중간계투는 마무리 제안을 시즌 결과 직후 받으며 저장·복구된다',()=>{
 const c=make(5,'pitch','중간계투');c.player.a=[75,78,78,70,76,70];c.latest={players:[{id:'closer',team:0,role:'pitch',position:'마무리',a:[50,50,50,50,50,50]}]};c.history=[{year:2030,stage:'프로',role:'pitch',position:'중간계투',stat:{...emptyPitch(),g:60,outs:180,er:15,hold:20},awards:[]}];
 assert.equal(positionOffer(c)?.target,'마무리');c.phase='result';nextYear(c);assert.equal(c.phase,'position_choice');let raw;saveCareer(c,{setItem:(_,v)=>raw=v});const loaded=loadCareer({getItem:()=>raw});assert.equal(loaded.pendingPositionOffer.target,'마무리');resolvePositionOffer(c,true);assert.equal(c.player.position,'마무리');assert.equal(c.year,2031);assert.equal(c.positionDecisionYear,2031);assert.ok(c.pendingEvent?.type==='position_result');
});

test('압도적인 야수는 MVP를 받고 골든글러브 외야수는 한 부문에서 세 명이다',()=>{
 const stat=(h,hr,rbi,pa=600)=>({...emptyBat(),g:140,pa,ab:pa-70,h,hr,rbi,r:105,bb:60,ch:220,e:2});
 const players=[{id:'star',name:'스타',team:0,role:'bat',position:'우익수',a:[90,90,85,70,80,78],stat:stat(205,35,125)},...['좌익수','중견수','우익수'].map((position,i)=>({id:'of'+i,name:'외야',team:0,role:'bat',position,a:[70,65,70,70,72,72],stat:stat(155-i*4,15,70)})),{id:'ace',name:'에이스',team:0,role:'pitch',position:'선발',a:[85,85,85,85,85,85],stat:{...emptyPitch(),g:30,gs:30,outs:540,er:36,k:220,w:20,h:130,bb:35}}];
 const season={year:2030,games:144,level:'major',teams:[{id:0,g:144,w:85,l:59}],players};const result=awards(season);assert.ok(result.find(x=>x.title==='정규시즌 MVP').winners.includes('star'));const glove=result.filter(x=>x.title==='골든글러브 · 외야수');assert.equal(glove.length,1);assert.equal(glove[0].winners.length,3);assert.ok(glove[0].details.star==='골든글러브 · 우익수');assert.ok(result.some(x=>x.title==='수비상 · 투수'));
});

test('패배 최다는 커리어 로우이며 개인 수상 구분자는 수상과 포지션에 따라 다르다',()=>{
 assert.equal(careerRecordMarker('w',18,[12,15]),'CH');assert.equal(careerRecordMarker('l',12,[7,9]),'CL');assert.equal(careerRecordMarker('l',3,[7,9]),'CH');assert.equal(careerRecordMarker('sv',30,[20,25]),'CH');
 assert.equal(awardLine(['타격왕','골든글러브 · 우익수','수비상 · 우익수']),'타격왕 / 골든글러브 · 우익수 / 수비상 · 우익수');
});

test('세 대회 우승 대표팀 선수에게 게임 병역특례가 적용되고 28세 시즌은 입대가 필요하다',()=>{
 for(const name of ['WBC','아시안게임','프리미어12']){
  const year=name==='프리미어12'?2031:2030;let c;for(let seed=1;seed<5000;seed++)if(tournamentResult(seed,year,name).result==='우승'){c=make(seed);break;}assert.ok(c);c.year=year;c.age=25;c.served=false;c.history=[{stage:'프로',role:'bat',position:'우익수',stat:{...emptyBat(),g:140,pa:600,ab:520,h:180}}];
  c.pendingEvent={type:'national_invitation',year,name};decideNationalInvitation(c,true);if(name==='아시안게임')nationalEvents(c,null,null);assert.ok(c.exempt&&c.served,name);assert.equal(c.nationalHistory.at(-1).exemption,true);
 }
 const c=make(17);c.served=false;c.year=2030;c.age=27;assert.ok(militaryOpportunities(c).every(x=>x.age<=27&&nationalTournamentYear(x.year,x.name)));c.age=28;assert.deepEqual(militaryOpportunities(c),[]);assert.throws(()=>progress(c),/현역 입대/);
 const mandatory=make(18);mandatory.served=false;mandatory.age=27;mandatory.phase='result';nextYear(mandatory);assert.equal(mandatory.age,28);assert.equal(mandatory.service,2);assert.equal(mandatory.pendingEvent.type,'military');assert.equal(mandatory.pendingEvent.mandatory,true);
});
