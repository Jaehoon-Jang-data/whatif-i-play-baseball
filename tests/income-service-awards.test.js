import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,emptyBat,emptyPitch,incomeBreakdown,archiveEntry,upsertArchive,saveCareer,loadCareer,rosterPlan,progress,acknowledgeEvent,nextYear,careerComparisonEligible,awards,rookieEligible,simulateSeason} from '../src/engine.js';

const career=(seed=3,role='bat',position=role==='bat'?'우익수':'선발')=>createCareer({seed,name:'검증',school:'검증고',team:0,role,position,type:role==='bat'?'교타형':'변화구형'});

test('총수입은 시즌 기본 연봉·실지급 옵션·계약금을 한 번씩만 합산한다',()=>{
 const c=career();c.stage='프로';c.year=2032;c.signingLedger=[{year:2028,team:0,kind:'rookie',amountMan:6000},{year:2031,team:2,kind:'fa',amountMan:12000}];c.signingIncome=18000;
 c.salaryLedger=[{year:2030,team:0,salaryMan:3300,optionPaidMan:500,optionResults:[{paidMan:500},{paidMan:0}],allowanceMan:300},{year:2031,team:2,salaryMan:7000,optionPaidMan:0,optionResults:[{paidMan:0}],teamShares:[{team:0,salaryMan:3500},{team:2,salaryMan:3500}]}];
 const expected={salaryMan:10300,signingMan:18000,optionMan:500,allowanceMan:300,totalMan:29100,complete:true};assert.deepEqual(incomeBreakdown(c),expected);
 const archive=archiveEntry(c);assert.deepEqual(incomeBreakdown(archive),expected);assert.equal(upsertArchive([archive],c).length,1);
 let raw;saveCareer(c,{setItem:(_,v)=>raw=v});const loaded=loadCareer({getItem:()=>raw});assert.deepEqual(incomeBreakdown(loaded),expected);
 const old={salaryLedger:c.salaryLedger,signingIncome:18000};assert.deepEqual(incomeBreakdown(old),expected);
});

test('구 저장 계약금은 지명·FA 계약에서 연도를 복원하고 잔액은 미상 연도로 보존한다',()=>{
 const c=career();delete c.signingLedger;c.stage='프로';c.signingIncome=19000;c.draftAttempts=[{year:2028,team:0,selected:true,bonusMan:6000}];c.contractHistory=[{year:2031,team:2,kind:'fa',signingBonusMan:12000}];
 let raw;saveCareer(c,{setItem:(_,v)=>raw=v});const loaded=loadCareer({getItem:()=>raw});
 assert.deepEqual(loaded.signingLedger.map(x=>[x.year,x.amountMan]),[[2028,6000],[2031,12000],[null,1000]]);
 assert.equal(incomeBreakdown(loaded).signingMan,19000);
});

test('전역 시즌의 2군 복귀 뒤에는 복무로 되돌아가지 않고 재시작 뒤에도 유지된다',()=>{
 const c=career(83);c.stage='프로';c.phase='prepare';c.year=2030;c.age=25;c.proYears=1;c.service=1;c.servicePath='regular';c.player.a.fill(40);c.contract={kind:'reserved',annualMan:3300,left:1};
 const planned=rosterPlan(c);assert.equal(planned.calendar[118],'복무');assert.equal(planned.calendar[119],'2군');assert.equal(planned.calendar[187],'2군');
 const row=progress(c);assert.equal(c.service,0);assert.equal(c.served,true);assert.equal(row.rosterCalendar[187],'2군');assert.equal(row.rosterMoves.some(x=>x.from==='2군'&&x.to==='복무'),false);
 while(c.pendingEvent)acknowledgeEvent(c);nextYear(c);assert.equal(c.service,0);assert.equal(c.served,true);assert.ok(rosterPlan(c).calendar.every(x=>x!=='복무'));
 let raw;saveCareer(c,{setItem:(_,v)=>raw=v});const loaded=loadCareer({getItem:()=>raw});assert.equal(loaded.service,0);assert.equal(loaded.served,true);assert.ok(rosterPlan(loaded).calendar.every(x=>x!=='복무'));
 loaded.phase='season';const later=progress(loaded);assert.ok(later.rosterCalendar.every(x=>x!=='복무'));
});

test('현역 복무 첫해는 부상 계산으로 2군 등록이 열리지 않고 복귀 전에도 출전하지 않는다',()=>{
 const c=career(84);c.stage='프로';c.service=2;c.servicePath='regular';
 assert.ok(rosterPlan(c,{startDay:50,days:40}).calendar.every(x=>x==='복무'));
 c.service=1;const plan=rosterPlan(c,{startDay:50,days:20});
 assert.ok(plan.calendar.slice(0,119).every(x=>x==='복무'));
});

test('이전 저장의 제대 뒤 잘못된 복무 달력과 상태를 함께 바로잡는다',()=>{
 const c=career(4);c.stage='프로';c.phase='result';c.year=2030;c.service=1;c.served=false;c.history=[{year:2030,stage:'프로',role:'bat',position:'우익수',team:0,servicePath:'regular',military:false,stat:emptyBat(),awards:[],rosterCalendar:[...Array(119).fill('복무'),...Array(19).fill('2군'),...Array(50).fill('복무')],rosterMoves:[]}];
 let raw;saveCareer(c,{setItem:(_,v)=>raw=v});const loaded=loadCareer({getItem:()=>raw});assert.equal(loaded.service,0);assert.equal(loaded.served,true);assert.equal(loaded.history[0].rosterCalendar[187],'미출장');assert.equal(loaded.history[0].rosterMoves.some(x=>x.to==='복무'&&x.day>119),false);
});

test('커리어 하이·로우 표본은 시즌별 팀 경기와 당시 보직으로 판정한다',()=>{
 const row=(role,position,volume,games=144)=>({stage:'프로',role,position,team:0,military:false,stat:role==='bat'?{...emptyBat(),g:30,pa:volume}:{...emptyPitch(),g:30,outs:volume},league:{games,teams:[{id:0,g:games}]}});
 assert.equal(careerComparisonEligible(row('bat','우익수',222)),false);assert.equal(careerComparisonEligible(row('bat','우익수',223)),true);
 assert.equal(careerComparisonEligible(row('pitch','선발',215)),false);assert.equal(careerComparisonEligible(row('pitch','선발',216)),true);
 assert.equal(careerComparisonEligible(row('pitch','중간계투',107)),false);assert.equal(careerComparisonEligible(row('pitch','중간계투',108)),true);
 assert.equal(careerComparisonEligible(row('pitch','마무리',90,120)),true);assert.equal(careerComparisonEligible(row('pitch','선발',90,120)),false);
});

test('공식 신인 자격을 가진 23경기 타자는 후보이되 게임 표본 기준으로 수상하지 않는다',()=>{
 const stat=(g,pa,h)=>({...emptyBat(),g,pa,ab:pa-10,h,hr:g===23?10:8,bb:10});
 const season={year:2030,games:144,level:'major',teams:[{id:0,g:144,w:70,l:74}],players:[{id:'short',name:'단기',team:0,role:'bat',position:'우익수',rookie:true,a:Array(6).fill(90),stat:stat(23,100,50)},{id:'full',name:'풀타임',team:0,role:'bat',position:'중견수',rookie:true,a:Array(6).fill(60),stat:stat(120,430,140)}]};
 const award=awards(season).find(x=>x.title==='신인왕');assert.ok(award.candidates.some(x=>x.id==='short'&&x.sampleEligible===false));assert.deepEqual(award.winners,['full']);
 season.players.splice(1);assert.deepEqual(awards(season).find(x=>x.title==='신인왕').winners,[]);
 const c=career();c.year=2030;c.stage='프로';c.history=[{year:2029,stage:'프로',role:'bat',stat:{...emptyBat(),pa:60},awards:[]}];assert.equal(rookieEligible(c),true);c.foreignProHistory=true;assert.equal(rookieEligible(c),false);
});

test('23경기 불펜도 후보 자격과 수상 표본을 구분한다',()=>{
 const season={year:2030,games:144,level:'major',teams:[{id:0,g:144,w:70,l:74}],players:[{id:'short',team:0,role:'pitch',position:'중간계투',rookie:true,a:Array(6).fill(95),stat:{...emptyPitch(),g:23,outs:80,er:0,k:100}},{id:'full',team:0,role:'pitch',position:'중간계투',rookie:true,a:Array(6).fill(60),stat:{...emptyPitch(),g:50,outs:140,er:30,k:60}}]};
 const award=awards(season).find(x=>x.title==='신인왕');assert.ok(award.candidates.some(x=>x.id==='short'&&x.sampleEligible===false));assert.deepEqual(award.winners,['full']);
});

test('AI 신인도 이전 시즌 누적 타석·아웃과 입단 5년 기한으로 다음 해 자격을 판정한다',()=>{
 const league=simulateSeason({seed:91,year:2030,games:18});
 const previous=new Map(league.players.map(p=>[p.id,p]));
 const kept=league.nextRoster.filter(p=>previous.has(p.id)&&previous.get(p.id).rookie);
 assert.ok(kept.length>0);
 for(const p of kept){const old=previous.get(p.id),volume=old.role==='bat'?old.stat.pa:old.stat.outs;
  assert.equal(p.rookie,volume<=(old.role==='bat'?60:90));
  assert.equal(old.role==='bat'?p.priorPa:p.priorOuts,volume);
 }
 const young=kept.find(p=>p.rookie&&p.priorPa>0&&p.priorPa<=60);
 assert.ok(young,'저출장 신인 타자 표본');
 const next=simulateSeason({seed:92,year:2031,games:1,rosterState:league.nextRoster});
 assert.equal(next.players.find(p=>p.id===young.id).rookie,true);
});
