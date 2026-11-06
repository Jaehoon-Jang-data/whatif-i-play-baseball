import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBat,emptyPitch,simulateSeason,createCareer,archiveEntry,saveCareer,loadCareer} from '../src/engine.js';
import {leagueWarContext,seasonWAR,warSnapshot,careerWAR,bestWarSeasons,teamWarReport} from '../src/war.js';
import {formatWAR,warCareerHtml,warMetricHtml,warNoteHtml} from '../src/presentation.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const bat={...emptyBat(),g:144,pa:600,ab:530,h:160,d:30,t:3,hr:20,bb:65,hbp:3,sf:2,sb:20,cs:5};
const pitch={...emptyPitch(),g:28,gs:28,outs:540,hr:15,bb:45,k:160,r:75,er:65};
const league={year:2030,level:'major',games:144,teams:[{id:0,g:144,r:650,w:76,l:68,tie:0,park:1.06},{id:1,g:144,r:650,w:68,l:76,tie:0,park:.94}],players:[{id:'user',role:'bat',team:0,position:'유격수',stat:{...bat}},{id:'b',role:'bat',team:1,position:'지명타자',stat:{...bat}},{id:'p',role:'pitch',team:0,position:'선발',stat:{...pitch}},{id:'q',role:'pitch',team:1,position:'선발',stat:{...pitch}}]};
const row={year:2030,stage:'프로',age:25,awards:[],role:'bat',position:'유격수',team:0,stat:{...bat},league};
const pRow={...row,role:'pitch',position:'선발',stat:{...pitch}};
const value=r=>seasonWAR(r).value;

test('타격·주루·포지션·대체 득점을 합산해 시즌 환경의 승수로 변환한다',()=>{
 const w=seasonWAR(row),c=leagueWarContext(league);near(w.components.batting,0);near(w.components.baserunning,0);near(w.components.fielding,0);near(w.components.position,Math.min(144,600/4.3)/162*7.5);near(w.components.replacement,c.batReplacementRuns/2);near(w.value,Object.values(w.components).reduce((a,b)=>a+b,0)/w.runsPerWin);assert.ok(w.notes.some(x=>x.includes('출장량 추정')));
 assert.ok(value({...row,stat:{...bat,h:180,hr:40}})>value(row));assert.ok(value({...row,stat:{...bat,bb:90,ab:505}})>value(row));assert.ok(value({...row,stat:{...bat,sb:35}})>value(row));assert.ok(value({...row,stat:{...bat,cs:20}})<value(row));
 // Errors alone never masquerade as a complete defensive value.
 near(value({...row,stat:{...bat,e:40}}),value({...row,stat:{...bat,e:0}}));
});
test('실제 복수 포지션 출장 비중을 우선하고 현재 포지션과 능력치는 사용하지 않는다',()=>{
 const c=leagueWarContext(league),mixed={...row,league:null,warContext:c,warUsage:{positionOuts:{'포수':162*27/2,'지명타자':162*27/2},parkPa:600}};
 near(seasonWAR(mixed).components.position,(12.5-17.5)/2);near(value(mixed),value({...mixed,position:'1루수',aAfter:[99,99,99,99,99,99]}));assert.ok(value({...mixed,warUsage:{...mixed.warUsage,positionOuts:{'유격수':162*27}}})>value({...mixed,warUsage:{...mixed.warUsage,positionOuts:{'1루수':162*27}}}));
});
test('투수는 FIP 계열 기록·이닝·보직으로 계산하며 승패·세이브를 가치로 대체하지 않는다',()=>{
 const w=seasonWAR(pRow);near(w.components.batting,0);near(w.components.pitching,0);assert.equal(w.method,'FIP 계열 기록 기반');assert.ok(value({...pRow,stat:{...pitch,k:210,bb:30,hr:8}})>value(pRow));near(value({...pRow,stat:{...pitch,w:25,l:0,sv:40,r:150,er:140}}),value(pRow));
 const short={...pitch,g:28,gs:0,outs:180,k:160/3,bb:15,hr:5,r:25,er:65/3};assert.ok(value(pRow)>value({...pRow,position:'중간계투',stat:short}));near(seasonWAR({...pRow,stat:emptyPitch()}).value,0);
});
test('시즌별 득점 환경과 실제 구장 노출을 쓰며 없는 과거 리그 자료를 만들어 넣지 않는다',()=>{
 const low=structuredClone(league);low.teams.forEach(t=>t.r=450);assert.notEqual(seasonWAR({...row,league:low}).runsPerWin,seasonWAR(row).runsPerWin);
 const c=leagueWarContext(league);const exact={...row,league:null,warContext:c,warUsage:{positionOuts:{'유격수':3000},parkPa:600*1.05}};
 assert.ok(value(exact)<value({...exact,warUsage:{...exact.warUsage,parkPa:600*.95}}));
 const p={...pRow,league:null,warContext:c,warUsage:{parkOuts:540*1.05}};assert.ok(value(p)>value({...p,warUsage:{parkOuts:540*.95}}));
 assert.equal(value({...row,league:null}),null);assert.equal(value({...row,year:2031}),null);assert.equal(value({...row,military:true}),null);
 const changed={...row,stat:{...bat,hr:bat.hr+1}};assert.notEqual(value(changed),value(row));
});
test('완전한 1군·2군 시즌과 트레이드의 실제 노출량을 저장·복구·은퇴 보관 후에도 보존한다',()=>{
 for(const role of ['bat','pitch']){
  const l=simulateSeason({seed:13,year:2030,playerTrade:true,player:{name:'가상 WAR',role,position:role==='bat'?'포수':'선발',team:0,a:Array(6).fill(78),opportunity:1}}),user=l.players.find(p=>p.id==='user');
  const r={...row,role,position:user.position,stat:user.stat,team:user.team,league:l,minorStat:user.stat,minorLeague:l,teamSegments:[{team:0},{team:user.team}]},before=seasonWAR(r),snapshot=warSnapshot(r);
  assert.ok(Object.keys(user.warUsage.teams).length===2);near(Object.values(user.warUsage.teams).reduce((a,b)=>a+b,0),role==='bat'?user.stat.pa:user.stat.outs);
  near(value({...r,league:null,...snapshot}),before.value);near(seasonWAR({...r,minorLeague:null,...snapshot},{level:'minor'}).value,seasonWAR(r,{level:'minor'}).value);
  const c=createCareer({seed:13,name:'검증',school:'가상고',role,position:user.position,type:role==='bat'?'교타형':'제구형',team:0});c.history=[r];c.latest=l;c.player.position=role==='bat'?'1루수':'마무리';let raw;saveCareer(c,{setItem:(_,v)=>raw=v});const loaded=loadCareer({getItem:()=>raw});near(value(loaded.history[0]),before.value);
  const archived=JSON.parse(JSON.stringify(archiveEntry(loaded)));near(value(archived.history[0]),before.value);assert.equal(archived.history[0].league,undefined);assert.deepEqual(archived.history[0].teamSegments,r.teamSegments);
 }
});
test('구 시즌은 출장 추정으로 계산하되 은퇴 요약만 남은 구 기록은 계산 불가로 구분한다',()=>{
 const traded={...row,teamSegments:[{team:0,stat:{...bat,pa:450}},{team:1,stat:{...bat,pa:150}}]};const c=leagueWarContext(league);near(seasonWAR(traded).diagnostics.parkFactor,1.015);near(value({...traded,league:null,...warSnapshot(traded)}),value(traded));
 const snapshot=warSnapshot(row);near(value({...row,league:null,...snapshot}),value(row));assert.ok(seasonWAR(row).notes.includes('구장·출장 비중 일부 추정'));
 const old={...row,league:undefined};const out=careerWAR([row,old]);assert.equal(out.known,1);assert.equal(out.missing,1);near(out.value,value(row));assert.match(warCareerHtml([old],['가상 팀']),/리그 자료 없는 1시즌 제외/);
});
test('TOP 3은 표시 0.1 WAR 동률에서 공동 순위·이른 연도를 사용하고 통산과 구분한다',()=>{
 const rs=[2033,2030,2032,2031].map(year=>({...row,year,league:null,warContext:{...leagueWarContext(league),year}}));
 assert.deepEqual(bestWarSeasons(rs).map(x=>[x.row.year,x.rank]),[[2030,1],[2031,1],[2032,1]]);
 const html=warCareerHtml(rs,['가상 팀']);assert.match(html,/통산 WAR/);assert.match(html,/2030년/);assert.doesNotMatch(html,/2033년/);assert.match(warMetricHtml(seasonWAR(row)),/WAR/);assert.match(warNoteHtml(seasonWAR(pRow)),/FIP 기반/);assert.equal(formatWAR(-.01),'0.0');
});
test('리그 전체 WAR는 대체 수준 풀과 일치하고 팀별 승수 편차를 진단한다',()=>{
 for(const seed of [3,17,41]){const l=simulateSeason({seed,year:2030}),report=teamWarReport(l),ctx=leagueWarContext(l);near(report.reduce((a,b)=>a+b.war,0),ctx.teamGames/2*1000/2430);assert.ok(report.every(x=>Number.isFinite(x.gap)&&Math.abs(x.gap)<25));}
});

test('피사구는 리그·선수 모두 기록된 경우만 FIP에 반영하고 v1 문맥을 보존한다',()=>{
 const l=structuredClone(league);l.awards=[];for(const p of l.players.filter(p=>p.role==='pitch'))p.stat.hbp=10;
 const r={...pRow,league:l,stat:{...pitch,hbp:10}},base=seasonWAR(r),extra=seasonWAR({...r,stat:{...r.stat,hbp:15}});
 assert.equal(base.diagnostics.includeHbp,true);near(base.value-extra.value,3*5/9/base.runsPerWin);
 const ctx=leagueWarContext(league),v1={...ctx,version:1};delete v1.pitchHbpIncluded;
 near(seasonWAR({...pRow,league:null,warContext:v1}).value,seasonWAR(pRow).value);
 assert.equal(seasonWAR({...pRow,league:null,warContext:{...ctx,version:99}}).value,null);
 const c=createCareer({seed:2,name:'피사구 보존',school:'가상고',role:'pitch',position:'선발',type:'제구형',team:0});c.history=[r];let raw;saveCareer(c,{setItem:(_,s)=>raw=s});near(seasonWAR(loadCareer({getItem:()=>raw}).history[0]).value,base.value);
});
