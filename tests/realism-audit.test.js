import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,offers,sign,progress,nextYear,acknowledgeEvent,faStatus,faContractTerm,negotiateSalary,saveCareer,loadCareer,migrateCareer,rosterPlan,springEvaluation,nationalPolicy,nationalSelectionChance,simulateSeason,rates,developmentalTryout} from '../src/engine.js';

function pro(seed=1,age=30,position='중견수'){
  const c=createCareer({seed,name:'감사 선수',school:'가명고',role:position==='선발'||position==='중간계투'||position==='마무리'?'pitch':'bat',position,type:'교타형',team:0});
  c.stage='프로';c.phase='prepare';c.age=age;c.year=2030;c.served=true;c.proYears=8;c.player.a.fill(85);c.contract={kind:'reserved',annualMan:12000,years:1,left:0};c.reserved=true;c.playerStatus='reserved';return c;
}
function clear(c){while(c.pendingEvent)acknowledgeEvent(c);}

test('2·3·4년 FA 계약은 연차, 단년 보류 연봉, 재취득을 별도로 추적한다',()=>{
  for(const [years,age] of [[2,37],[3,35],[4,30]]){
    let c;let offer;
    for(let seed=1;seed<30;seed++){const trial=pro(seed,age);trial.phase='market';trial.faDeclared=true;const found=offers(trial).find(x=>x.years===years);if(found){c=trial;offer=found;break;}}
    assert.ok(c,`${years}년 제안`);sign(c,offer);c.age=30;assert.equal(c.contract.startYear,2030);assert.equal(c.contract.endYear,2029+years);assert.equal(faContractTerm(c).elapsed,0);
    c.phase='prepare';let raw;saveCareer(c,{setItem:(_,v)=>raw=v});assert.equal(loadCareer({getItem:()=>raw}).contract.startYear,2030);
    for(let year=0;year<years;year++){
      assert.equal(c.salaryPending,false);const row=progress(c);assert.equal(row.salaryMan,offer.annualMan);assert.equal(row.optionResults.length,offer.options.length);
      assert.equal(faContractTerm(c).elapsed,year+1);clear(c);nextYear(c);clear(c);
      if(year<years-1)assert.equal(c.salaryPending,false);
    }
    assert.equal(faStatus(c).required,4);assert.equal(faStatus(c).seasons,years);
    if(years<4){
      assert.equal(c.phase,'prepare');assert.equal(c.salaryPending,true);
      const oldFa=structuredClone(c.contractHistory[0]);const result=negotiateSalary(c);assert.equal(result.kind,'reserved');assert.equal(result.years,1);assert.equal(c.contract.kind,'reserved');assert.deepEqual(c.contractHistory[0],oldFa);assert.equal(faStatus(c).seasons,years);
      while(faStatus(c).seasons<4){assert.equal(c.phase,'prepare',`${years}년 계약 후 ${c.year}년 상태`);progress(c);clear(c);nextYear(c);clear(c);if(c.phase==='prepare'&&c.salaryPending)negotiateSalary(c);}
    }
    assert.equal(c.phase,'fa_choice');assert.equal(faStatus(c).eligible,true);
    const old={...c,version:5,contract:{...offer,left:0},lastContract:{year:2030,...offer},salaryPending:false,phase:'prepare'};
    const migrated=migrateCareer(old);assert.equal(migrated.salaryPending,true);assert.equal(migrated.contract.startYear,2030);assert.equal(migrated.contract.endYear,2029+years);
  }
});

test('지명 신인 개막 예외와 육성선수 정식 등록 시점을 구분한다',()=>{
  const regular=pro(4,19);regular.proYears=0;regular.lastDraft={selected:true,round:7,scout:{score:60}};regular.history=[{stage:'고교',stat:{pa:130}}];assert.equal(rosterPlan(regular).opening,'2군');
  const elite=pro(4,19);elite.proYears=0;elite.lastDraft={selected:true,round:1,scout:{score:78}};elite.history=[{stage:'고교',stat:{pa:150}}];assert.equal(rosterPlan(elite).opening,'1군');assert.equal(springEvaluation(elite)?.type,'spring_evaluation');
  const developmental=pro(4,19);developmental.proYears=0;developmental.developmental=true;developmental.developmentalElite=true;assert.equal(rosterPlan(developmental).opening,'2군');assert.ok(rosterPlan(developmental).calendar.slice(0,46).every(x=>x==='2군'));assert.equal(springEvaluation(developmental),null);
});

test('대표팀 대회별 나이 정책, 보직, 출전 표본을 구별한다',()=>{
  const youth=pro(1,24),wild=pro(1,28),older=pro(1,32),veteran=pro(1,39);for(const c of [youth,wild,older,veteran])c.proYears=10;
  const stat={g:140,pa:590,ab:510,h:180,d:30,t:3,hr:20,bb:65,hbp:0,sf:10};
  assert.equal(nationalPolicy(2030,'아시안게임').assumed,true);
  assert.equal(nationalSelectionChance(youth,'아시안게임',stat).category,'연령·연차 대상');
  assert.equal(nationalSelectionChance(wild,'아시안게임',stat).category,'와일드카드');
  assert.equal(nationalSelectionChance(older,'아시안게임',stat).chance,0);
  const lateRookie=structuredClone(older);lateRookie.proYears=3;assert.ok(nationalSelectionChance(lateRookie,'아시안게임',stat).chance>0);assert.ok(nationalSelectionChance(lateRookie,'아시안게임',stat).chance<nationalSelectionChance(youth,'아시안게임',stat).chance);
  assert.ok(nationalSelectionChance(veteran,'WBC',stat).chance>0);
  assert.ok(nationalSelectionChance(youth,'프리미어12',stat).chance>nationalSelectionChance(youth,'프리미어12',{...stat,g:4,pa:12,ab:10,h:6} ).chance);
  assert.ok(nationalSelectionChance(youth,'아시안게임',stat).chance>nationalSelectionChance(wild,'아시안게임',stat).chance);
  const starter=pro(1,26,'선발'),closer=pro(1,26,'마무리');
  const pitching={g:50,gs:0,outs:150,h:45,bb:15,k:55,er:20,sv:35,hold:0};
  assert.notEqual(nationalSelectionChance(starter,'WBC',pitching).chance,nationalSelectionChance(closer,'WBC',pitching).chance);
});

test('원기록의 투타 합계와 비율 산술은 고정 시드 리그에서 일치한다',()=>{
  for(let seed=1;seed<=8;seed++){
    const league=simulateSeason({seed,year:2030});
    const bat=league.players.filter(p=>p.role==='bat'),pitch=league.players.filter(p=>p.role==='pitch');
    for(const p of bat){const s=p.stat,v=rates(s,'bat');assert.equal(s.pa,s.ab+s.bb+s.hbp+s.sf);assert.ok(s.h>=s.d+s.t+s.hr);assert.ok(s.ab>=s.h);assert.equal(v.ops,v.obp+v.slg);}
    for(const p of pitch){const s=p.stat,v=rates(s,'pitch');assert.ok(s.er<=s.r);assert.ok(s.gs<=s.g);assert.equal(v.era,s.outs?s.er*27/s.outs:0);assert.equal(v.whip,s.outs?(s.bb+s.h)*3/s.outs:0);}
    assert.equal(bat.reduce((n,p)=>n+p.stat.r,0),pitch.reduce((n,p)=>n+p.stat.r,0));
  }
});

test('두 항목 훈련은 해당 능력에 집중되고 출장·잠재력·나이·군복무가 성장에 반영된다',()=>{
  const base=pro(21,22);base.player.a.fill(62);base.potential=1;
  const focused=structuredClone(base),other=structuredClone(base);const a=progress(focused,[0,1]),b=progress(other,[4,5]);
  assert.ok(a.aAfter[0]>b.aAfter[0]);assert.ok(b.aAfter[4]>a.aAfter[4]);
  const high=structuredClone(base),low=structuredClone(base);high.potential=1.2;low.potential=.85;
  assert.ok(progress(high,[0,1]).overall>progress(low,[0,1]).overall);
  const service=structuredClone(base);service.service=2;service.servicePath='regular';service.served=false;
  const absent=progress(service,[0,1]);assert.equal(absent.stat.g,0);assert.equal(absent.minorStat.g,0);assert.equal(absent.totalGrowth,0);
  const older=structuredClone(base);older.age=37;const oldRow=progress(older,[0,1]);assert.ok(oldRow.overall< a.overall);
});

test('우수 육성선수도 개막 2군이며 콜업 때 정식 등록 상태가 저장된다',()=>{
  let c;
  for(let seed=1;seed<=50;seed++){
    const trial=pro(seed,19);trial.proYears=0;trial.developmental=true;trial.developmentalElite=true;
    if(rosterPlan(trial).calendar.includes('1군')){c=trial;break;}
  }
  assert.ok(c);assert.equal(c.playerStatus,'reserved');c.playerStatus='developmental';
  const row=progress(c);assert.equal(row.rosterCalendar[0],'2군');assert.equal(row.developmentalConverted,true);assert.equal(c.developmental,false);assert.equal(c.playerStatus,'reserved');assert.ok(row.rosterMoves.some(x=>x.to==='1군'&&x.day>=47));
  let raw;saveCareer(c,{setItem:(_,v)=>raw=v});assert.equal(loadCareer({getItem:()=>raw}).developmentalConvertedYear,c.year);
});

test('미지명 얼리드래프트 대학 2학년은 육성 등록 대상이 아니다',()=>{
  const c=pro(8,20);c.stage='대학';c.phase='draft_result';c.lastDraft={selected:false,kind:'early',year:c.year};
  assert.throws(()=>developmentalTryout(c));
});

test('FA 계약 중 현역 복무 첫해는 계약 소진 없이 종료 시즌을 미룬다',()=>{
  const c=pro(3,37);c.phase='market';c.faDeclared=true;sign(c,offers(c)[0]);c.phase='prepare';c.age=26;c.service=2;c.servicePath='regular';c.served=false;
  const end=c.contract.endYear,remaining=c.contract.left;
  const first=progress(c);assert.equal(first.salaryMan,0);assert.equal(c.contract.left,remaining);assert.equal(c.contract.endYear,end+1);assert.equal(c.contractHistory[0].endYear,end+1);
  clear(c);nextYear(c);const second=progress(c);assert.ok(second.salaryMan>0);assert.equal(c.contract.left,remaining-1);
});

test('구버전 육성선수의 과거 1군 등록은 정식선수 전환으로 이관한다',()=>{
  const c=pro(12,22);c.version=5;c.developmental=true;c.playerStatus='reserved';c.history=[{year:2029,stage:'프로',registeredDays:70,role:'bat',stat:{g:20,pa:40,ab:35,h:10,bb:5},minorStat:{g:50,pa:190,ab:160,h:45},awards:[]}];
  const loaded=migrateCareer(c);assert.equal(loaded.developmental,false);assert.equal(loaded.developmentalConvertedYear,2029);
});
