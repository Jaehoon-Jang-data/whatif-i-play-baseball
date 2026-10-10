import test from 'node:test';
import assert from 'node:assert/strict';
import {awardSummary,awards,careerTimeline,createCareer,emptyBat,emptyPitch,loadCareer,nationalSelectionChance,nextYear,postseasonRosterAssessment,releaseAssessment,resolvePositionOffer,sangmuRecruitment,saveCareer,simulateSeason} from '../src/engine.js';

const player=(role='bat')=>{const c=createCareer({seed:17,name:'검증',school:'가상고',role,position:role==='bat'?'유격수':'마무리',type:role==='bat'?'교타형':'파이어볼러형',team:0});c.stage='프로';c.year=2030;c.age=23;c.proYears=2;c.player.a.fill(48);return c;};

test('23세 신인왕과 저연차 선수는 한 시즌 부진만으로 보류 명단에서 제외하지 않는다',()=>{
  const c=player(),row={year:2029,stage:'프로',role:'bat',position:'유격수',stat:{...emptyBat(),g:120,pa:490,ab:440,h:140},minorStat:emptyBat(),awards:['신인왕']};
  c.history=[row,{...row,year:2030,stat:{...emptyBat(),g:24,pa:70,ab:64,h:8},awards:[]}];
  assert.equal(releaseAssessment(c).probability,0);
  assert.equal(releaseAssessment(c).prospect,true);
  c.phase='result';c.reserved=true;c.contract={kind:'reserved',annualMan:7000,left:0};nextYear(c);if(c.phase==='position_choice')resolvePositionOffer(c,false);
  assert.notEqual(c.phase,'release_choice');assert.equal(c.reserved,true);
  c.age=34;c.proYears=11;c.player.a.fill(30);c.history=Array.from({length:3},(_,i)=>({...row,year:2027+i,stat:{...emptyBat(),g:15,pa:42,ab:40,h:4},awards:[]}));
  assert.ok(releaseAssessment(c).probability>0);
  assert.match(releaseAssessment(c).reason,/부진 3시즌.*경쟁.*34세/);
});

test('포스트시즌 제출 때 2군·재활군은 제외하고 1군 등록 복귀 선수는 포함한다',()=>{
  const row={role:'bat',stat:{...emptyBat(),g:90,pa:320},rosterCalendar:[...Array(170).fill('1군'),...Array(18).fill('2군')]};
  assert.equal(postseasonRosterAssessment(row).selected,false);
  assert.match(postseasonRosterAssessment(row).reason,/2군/);
  row.rosterCalendar[187]='재활군';assert.match(postseasonRosterAssessment(row).reason,/부상/);
  row.rosterCalendar[187]='1군';assert.equal(postseasonRosterAssessment(row).selected,true);
  row.rosterCalendar=Array(188).fill('2군');assert.equal(postseasonRosterAssessment(row).selected,false);
});

test('세이브 0개 선수는 타이틀을 받지 않으며 장기 리그의 선발·마무리 보직은 유지된다',()=>{
  const blank={year:2030,games:144,level:'major',teams:[{id:0,g:144,w:72}],players:Array.from({length:135},(_,i)=>({id:`p${i}`,name:`투수${i}`,role:'pitch',position:'중간계투',team:0,a:Array(6).fill(50),stat:{...emptyPitch(),g:2,outs:6}}))};
  assert.deepEqual(awards(blank).find(x=>x.title==='세이브왕').winners,[]);
  let roster;for(let year=2027;year<=2041;year++){
    const season=simulateSeason({seed:9,year,rosterState:roster});
    const saves=season.players.filter(p=>p.role==='pitch').map(p=>p.stat.sv).sort((a,b)=>b-a);
    assert.ok(saves[1]>=10,`${year}: 세이브 2위 ${saves[1]}`);
    for(const team of season.teams){const arms=season.nextRoster.filter(p=>p.team===team.id&&p.role==='pitch');assert.ok(arms.filter(p=>p.position==='선발').length>=5);assert.ok(arms.some(p=>p.position==='마무리'));}
    assert.equal(season.awards.find(x=>x.title==='세이브왕').value,saves[0]);
    roster=season.nextRoster;
  }
  const damaged=roster.map(p=>({...p,position:p.role==='pitch'?'중간계투':p.position}));
  const restored=simulateSeason({seed:9,year:2042,rosterState:damaged});
  assert.equal(restored.players.filter(p=>p.position==='마무리'&&p.stat.g>0).length,10);
  assert.ok(restored.players.filter(p=>p.role==='pitch').map(p=>p.stat.sv).sort((a,b)=>b-a)[1]>=10);
});

test('과거 저장의 0세이브 공동 수상을 선수·리그·이벤트 이력에서 함께 정정한다',()=>{
  const c=player('pitch'),pitchers=Array.from({length:135},(_,i)=>({id:i?'p'+i:'user',role:'pitch',position:'중간계투',team:0,a:Array(6).fill(50),stat:{...emptyPitch(),g:2,outs:6}}));
  const league={year:2030,games:144,level:'major',players:pitchers,teams:[{id:0,g:144}],awards:[{title:'세이브왕',winners:pitchers.map(p=>p.id),value:0}]};
  c.history=[{year:2030,stage:'프로',role:'pitch',position:'마무리',team:0,stat:{...emptyPitch(),g:2,outs:6},awards:['세이브왕'],league}];c.latest=league;c.events=[{year:2030,text:'세이브왕 수상'}];c.pendingEvent={type:'award',year:2030,titles:['세이브왕']};
  let raw;saveCareer(c,{setItem:(_,value)=>raw=value});const loaded=loadCareer({getItem:()=>raw});
  assert.deepEqual(loaded.history[0].league.awards[0].winners,[]);
  assert.deepEqual(loaded.latest.awards[0].winners,[]);
  assert.deepEqual(loaded.history[0].awards,[]);
  assert.deepEqual(loaded.events,[]);assert.equal(loaded.pendingEvent,null);
  assert.deepEqual(awardSummary([{year:2030,stat:{...emptyPitch(),sv:0},awards:['세이브왕']}]),[]);
});

test('아시안게임은 연령·연차 정책을 따르고 상무는 미필 프로 경력만 지원한다',()=>{
  const c=player('pitch');c.player.a.fill(85);c.age=25;c.proYears=5;
  const stat={...emptyPitch(),g:50,outs:150,k:70,sv:25};
  const youth=nationalSelectionChance(c,'아시안게임',stat);assert.equal(youth.category,'연령·연차 대상');
  c.age=30;assert.equal(nationalSelectionChance(c,'아시안게임',stat).chance,0);
  c.age=25;c.proYears=1;assert.equal(sangmuRecruitment(c).eligible,true);
  c.exempt=true;assert.equal(sangmuRecruitment(c).eligible,false);
  c.exempt=false;c.served=true;assert.equal(sangmuRecruitment(c).eligible,false);
  c.served=false;c.service=1;assert.equal(sangmuRecruitment(c).eligible,false);
});

test('이력은 주요 사건만 표시하고 과거 시즌의 첫 1군·우승·수상을 복원한다',()=>{
  const c=player();c.events=[{year:2029,text:'구단 신뢰도 +3'},{year:2029,text:'제안 수락 · 100만원 → 200만원'},{year:2029,text:'옵션 달성 · 지급 300만원'},{year:2029,text:'신인 드래프트 1라운드 전체 1순위 지명'},{year:2030,text:'은퇴 · 본인 선택'}];
  c.history=[{year:2029,stage:'프로',team:0,rosterCalendar:['2군','1군'],awards:['신인왕'],postseason:{champion:0,ring:true}}];
  const texts=careerTimeline(c).map(x=>x.text);
  assert.equal(texts.filter(x=>x.includes('신인왕')).length,1);
  assert.ok(texts.some(x=>x.includes('첫 1군')));assert.ok(texts.some(x=>x.includes('한국시리즈 우승')));
  assert.ok(texts.some(x=>x.includes('지명')));assert.ok(texts.some(x=>x.includes('은퇴')));
  assert.ok(texts.every(x=>!/(신뢰도|제안 수락|옵션)/.test(x)));
});
