import test from 'node:test';
import assert from 'node:assert/strict';
import {seasonDate,tradeWindowOpen,rosterLimits,clubStrategy,selectClubRoster} from '../src/league-operations.js';
import {createCareer,developmentalEligibility,simulateSeason,emptyBat,nationalSelectionChance,nationalInvitation,offers,canonicalAwardName,progress,saveCareer,loadCareer,automaticTradeChance,requestTrade} from '../src/engine.js';

const career=(seed=1)=>createCareer({seed,name:'검증',school:'검증고',team:0,role:'bat',position:'우익수',type:'교타형'});

test('육성선수 자격은 신청·미지명·졸업 단계와 계약 거부를 구분한다',()=>{
 const c=career();c.phase='path';c.draftAttempts=[{year:c.year,kind:'regular'}];c.lastDraft={year:c.year,kind:'regular',selected:false};
 assert.equal(developmentalEligibility(c).eligible,true);
 c.draftAttempts=[];assert.equal(developmentalEligibility(c).eligible,false);
 c.draftAttempts=[{year:c.year,kind:'regular'}];c.lastDraft.selected=true;assert.equal(developmentalEligibility(c).eligible,false);
 c.lastDraft.selected=false;c.draftContractRefused=true;assert.equal(developmentalEligibility(c).eligible,false);
 c.draftContractRefused=false;c.foreignNegotiationBeforeDraft=true;assert.equal(developmentalEligibility(c).eligible,false);
 c.foreignNegotiationBeforeDraft=false;c.stage='대학';c.phase='undrafted';c.collegeSeasons=2;c.lastDraft.kind='early';c.draftAttempts[0].kind='early';assert.equal(developmentalEligibility(c).eligible,false);
 c.collegeSeasons=4;c.lastDraft.kind='regular';c.draftAttempts[0].kind='regular';assert.equal(developmentalEligibility(c).eligible,true);
});

test('트레이드 마감 시각과 포스트시즌 종료 다음 날의 경계',()=>{
 assert.equal(tradeWindowOpen('2030-07-31T23:59:59','2030-11-18'),true);
 assert.equal(tradeWindowOpen('2030-08-01T00:00:00','2030-11-18'),false);
 assert.equal(tradeWindowOpen('2030-11-18T23:59:59','2030-11-18'),false);
 assert.equal(tradeWindowOpen('2030-11-19T00:00:00','2030-11-18'),true);
 assert.equal(tradeWindowOpen('2031-01-01T00:00:00','2030-11-18'),true);
});

test('등록 인원과 출장 가능 인원은 2026 확대 시점과 이후 가정에서 분리된다',()=>{
 assert.deepEqual(rosterLimits(2026,'2026-07-15'),{registered:29,gameEligible:28,expanded:false});
 assert.deepEqual(rosterLimits(2026,'2026-07-16'),{registered:30,gameEligible:28,expanded:false});
 assert.deepEqual(rosterLimits(2026,'2026-08-24'),{registered:30,gameEligible:28,expanded:false});
 assert.deepEqual(rosterLimits(2026,'2026-08-25'),{registered:34,gameEligible:32,expanded:true});
 assert.deepEqual(rosterLimits(2030,'2030-08-31'),{registered:29,gameEligible:28,expanded:false});
 assert.deepEqual(rosterLimits(2030,'2030-09-01'),{registered:34,gameEligible:32,expanded:true});
});

test('구단 전략은 경기 상황·나이·전력에 따라 바뀌고 실제 등록에 반영된다',()=>{
 const players=Array.from({length:40},(_,i)=>({id:String(i),role:i<24?'bat':'pitch',age:i<16?21:34,a:Array(6).fill(i<16?58:60),stat:{g:0}}));
 const limits=rosterLimits(2030,'2030-06-01');
 const win=clubStrategy({w:70,l:30},players,44),rebuild=clubStrategy({w:30,l:70},players,44);
 assert.equal(win.kind,'윈나우');assert.equal(rebuild.kind,'리빌딩');
 const winRoster=selectClubRoster(players,limits,win.kind),rebuildRoster=selectClubRoster(players,limits,rebuild.kind);
 assert.equal(winRoster.registered.length,29);assert.equal(winRoster.eligible.length,28);assert.ok(rebuildRoster.registered.filter(p=>p.age===21).length>winRoster.registered.filter(p=>p.age===21).length);
});

test('1군 명단은 수비 위치와 선발 로테이션을 우선 채운 뒤 남은 자리를 경쟁시킨다',()=>{
 const positions=['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'];
 const players=[...Array.from({length:24},(_,i)=>({id:`b${i}`,role:'bat',position:positions[i%9],age:27,a:Array(6).fill(i<9?42:70)})),...Array.from({length:16},(_,i)=>({id:`p${i}`,role:'pitch',position:i<6?'선발':'중간계투',age:27,a:Array(6).fill(i<6?42:70)}))];
 const {eligible}=selectClubRoster(players,rosterLimits(2030,'2030-04-01'),'윈나우');
 for(const pos of positions)assert.ok(eligible.some(p=>p.position===pos),pos);
 assert.ok(eligible.filter(p=>p.position==='선발').length>=5);
});

test('3시즌 구단 로스터의 1·2군, 신인, 은퇴, 트레이드는 다음 시즌까지 보존된다',()=>{
 let roster,priorIds;
 for(let year=2030;year<=2032;year++){
  const season=simulateSeason({seed:19,year,rosterState:roster,player:year===2030?{name:'검증',role:'bat',position:'우익수',team:0,a:[70,70,70,70,70,70],opportunity:1}:null,playerTrade:year===2030});
  assert.equal(season.rosterViolations,0);assert.equal(season.nextRoster.length,400);
  assert.ok(season.rosterAudit.every(x=>x.registered<=rosterLimits(year,x.date).registered&&x.gameEligible<=rosterLimits(year,x.date).gameEligible));
  assert.ok(season.rosterAudit.some(x=>x.expanded&&x.registered===34&&x.gameEligible===32));
  assert.ok(season.transactions.every(x=>tradeWindowOpen(x.date)));
  assert.ok(season.nextRoster.some(p=>p.lastMinorGames>0));
  if(priorIds){assert.ok(season.nextRoster.some(p=>!priorIds.has(p.id)));assert.ok(season.nextRoster.some(p=>priorIds.has(p.id)));}
  if(year===2030){assert.ok(season.playerTrade);const user=season.players.find(p=>p.id==='user');const before=season.playerTrade.statBefore;assert.ok(before.pa>0&&before.pa<user.stat.pa);assert.notEqual(season.playerTrade.oldTeam,season.playerTrade.newTeam);}
  priorIds=new Set(season.nextRoster.map(p=>p.id));roster=season.nextRoster;
 }
});

test('25세 호성적 선수는 WBC 선발과 아시안게임 미선발이 함께 가능하다',()=>{
 const c=career(4);c.stage='프로';c.phase='prepare';c.year=2030;c.age=25;c.proYears=3;c.player.a=[82,82,82,82,82,82];
 const stat={...emptyBat(),g:140,pa:590,ab:520,h:170,hr:20,bb:60};
 const wbc=nationalSelectionChance(c,'WBC',stat),asian=nationalSelectionChance(c,'아시안게임',stat);
 assert.equal(asian.category,'연령·연차 대상');assert.ok(asian.chance>0);assert.ok(wbc.chance>asian.chance);
 assert.ok(nationalInvitation(c,'WBC',stat));assert.equal(nationalInvitation(c,'아시안게임',stat),null);
});

test('FA 연평균 기본 보장액은 예상 보류 연봉보다 높고 구단별 조건이 다르다',()=>{
 const c=career(25);c.stage='프로';c.phase='market';c.faDeclared=true;c.year=2030;c.age=29;c.proYears=8;c.contract={kind:'reserved',annualMan:25000};c.history=[{year:2029,stage:'프로',role:'bat',position:'우익수',stat:{...emptyBat(),g:140,pa:600,ab:530,h:175,hr:24,bb:58},awards:[]}];
 const rows=offers(c);assert.equal(rows.length,3);assert.ok(rows.every(x=>x.annualMan>x.reservedReferenceMan&&x.guaranteedMan>=x.annualMan*x.years));assert.ok(new Set(rows.map(x=>x.totalMan)).size>1);
 const highSalary=career(1);highSalary.stage='프로';highSalary.phase='market';highSalary.faDeclared=true;highSalary.year=2030;highSalary.age=36;highSalary.proYears=10;highSalary.contract={kind:'reserved',annualMan:250000};highSalary.history=[{year:2029,stage:'프로',role:'bat',position:'우익수',stat:{...emptyBat(),g:100,pa:300,ab:270,h:55},awards:[]}];
 const boundary=offers(highSalary);assert.ok(boundary.every(x=>x.annualMan>x.reservedReferenceMan));assert.ok(boundary.some(x=>x.optionMan===0)&&boundary.some(x=>x.optionMan>0));
});

test('구 저장의 외야 골든글러브 위치 표기는 단일 부문으로 이관된다',()=>{
 for(const pos of ['좌익수','중견수','우익수'])assert.equal(canonicalAwardName(`골든글러브 · ${pos}`),'골든글러브 · 외야수');
});

test('플레이어 시즌 중 이적은 전후 기록·급여·명단을 저장하고 시즌 재진행을 막는다',()=>{
 const c=career(41);c.stage='프로';c.phase='season';c.year=2030;c.age=25;c.proYears=3;c.served=true;c.player.a=[90,90,90,90,90,90];c.clubTrust=100;c.contract={kind:'reserved',annualMan:5000,left:0};
 c.history=[{year:2029,stage:'프로',role:'bat',position:'우익수',stat:{...emptyBat(),g:140,pa:600,ab:540,h:190,hr:30},registeredDays:180,awards:[]}];
 progress(c);const row=c.history.at(-1),trade=row.league.playerTrade;
 assert.ok(trade);assert.equal(trade.oldTeam,0);assert.equal(c.player.team,trade.newTeam);assert.equal(row.teamSegments.length,2);
 for(const key of Object.keys(row.stat))assert.equal(row.teamSegments[0].stat[key]+row.teamSegments[1].stat[key],row.stat[key],key);
 assert.ok(row.teamSegments.every(x=>x.stat.pa>0));assert.equal(c.salaryLedger.at(-1).teamShares.reduce((n,x)=>n+x.salaryMan,0),5000);assert.equal(c.leagueRoster.length,400);
 let raw;saveCareer(c,{setItem:(_,value)=>raw=value});const loaded=loadCareer({getItem:()=>raw});assert.deepEqual(loaded.history.at(-1).teamSegments,row.teamSegments);assert.equal(loaded.leagueRoster.length,400);assert.throws(()=>progress(loaded),/시즌|준비|진행/);
});

test('FA 계약 중 자동 이적과 트레이드 요청 수락은 보류선수보다 드물다',()=>{
 const reserved=career(19);reserved.stage='프로';reserved.phase='prepare';reserved.proYears=5;reserved.player.a.fill(60);reserved.contract={kind:'reserved',annualMan:5000,left:1};
 const fa=structuredClone(reserved);fa.contract={kind:'fa',annualMan:30000,left:3,years:3};
 assert.ok(automaticTradeChance(fa)<automaticTradeChance(reserved)*.2);
 fa.contract.left=1;assert.ok(automaticTradeChance(fa)<automaticTradeChance(reserved));
 fa.contract.left=3;
 assert.ok(requestTrade(structuredClone(fa)).chance<requestTrade(structuredClone(reserved)).chance);
 const star=structuredClone(reserved);star.player.a.fill(88);
 assert.ok(automaticTradeChance(star)<automaticTradeChance(reserved));
});
