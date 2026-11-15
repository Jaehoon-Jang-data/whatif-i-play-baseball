import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,emptyBat,emptyPitch,simulateSeason,careerRecordMarker,careerComparisonEligible,sangmuRecruitment,enlist,asianGamesRoster,nationalSelectionChance,saveCareer,loadCareer} from '../src/engine.js';
import {leagueWarContext,seasonWAR} from '../src/war.js';
const bat={...emptyBat(),g:135,pa:600,ab:530,h:175,d:30,t:3,hr:20,bb:65,hbp:3,sf:2,sb:20,cs:5};
const pitch={...emptyPitch(),g:28,gs:28,outs:540,hr:15,bb:45,k:160,r:75,er:65};
const make=()=>{const c=createCareer({seed:17,name:'선발 검증',role:'bat',position:'2루수',team:0});Object.assign(c,{year:2034,age:25,stage:'프로',phase:'prepare',proYears:6});c.player.a.fill(70);return c;};
function selectionLeague(){
 const players=[];
 for(let team=0;team<10;team++){
  for(const [i,position]of ['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'].entries())players.push({id:`${team}-b${i}`,team,role:'bat',position,a:Array(6).fill(60),age:23,rookieYear:2032,stat:{...bat,h:155}});
  for(const [i,position]of ['선발','중간계투','마무리'].entries())players.push({id:`${team}-p${i}`,team,role:'pitch',position,a:Array(6).fill(60),age:23,rookieYear:2032,stat:{...pitch,g:position==='선발'?28:55,gs:position==='선발'?28:0}});
 }
 return {year:2034,players,awards:[]};
}
test('커리어 하이·로우는 현재를 포함한 유효 3시즌부터 표시한다',()=>{
 for(const key of ['h','w','l','sv','era'])assert.equal(careerRecordMarker(key,10,[5]),'');
 assert.equal(careerRecordMarker('h',200,[150,180]),'CH');assert.equal(careerRecordMarker('h',100,[150,180]),'CL');assert.equal(careerRecordMarker('l',2,[5,7]),'CH');assert.equal(careerRecordMarker('h',180,[150,180]),'');
 const r={stage:'프로',role:'bat',stat:{...bat,pa:222}};assert.equal(careerComparisonEligible(r),false);r.stat.pa=223;assert.equal(careerComparisonEligible(r),true);
 assert.equal(careerComparisonEligible({stage:'프로',role:'pitch',position:'선발',stat:{outs:215}}),false);assert.equal(careerComparisonEligible({stage:'프로',role:'pitch',position:'중간계투',stat:{outs:108}}),true);
});
test('WAR 준거는 1군 실제 출장 기록이며 2군·무출장 명단으로 평균을 낮추지 않는다',()=>{
 const league={year:2034,level:'major',teams:[{id:0,g:144,r:700,park:1}],players:[{id:'b',role:'bat',position:'2루수',team:0,stat:Object.fromEntries(Object.entries(bat).map(([k,v])=>[k,v*9]))},{id:'p',role:'pitch',position:'선발',team:0,stat:Object.fromEntries(Object.entries(pitch).map(([k,v])=>[k,v*7.2]))}]};
 const before=leagueWarContext(league);league.minorLeague={players:[{role:'bat',stat:{...bat,h:0}}]};league.players.push({id:'reserve',role:'bat',position:'유격수',stat:emptyBat()},{id:'reserve-arm',role:'pitch',stat:emptyPitch()});
 assert.deepEqual(leagueWarContext(league),before);assert.deepEqual(before.referencePopulation,{level:'major',batters:1,pitchers:1,battingPa:5400,outs:3888,minorIncluded:false});
 const result=seasonWAR({year:2034,stage:'프로',role:'bat',position:'2루수',team:0,stat:bat,league});assert.ok(result.components.replacement>0);assert.ok(result.value>1);
 assert.equal(leagueWarContext({...league,level:'minor'}),null);assert.equal(seasonWAR({role:'bat',stage:'대학',stat:bat,league}).value,null);
 const bad=seasonWAR({year:2034,stage:'프로',role:'bat',position:'지명타자',team:0,stat:{...bat,h:60,hr:0},league});assert.ok(bad.value<0,'음수 WAR를 임의로 0으로 올리지 않는다');
});
test('아시안게임 예상 명단은 24명·11/2/7/4·와일드카드 3명·구단별 3명을 지킨다',()=>{
 const c=make();c.latest=selectionLeague();c.history=[{year:2028,stage:'프로'}];
 for(const p of c.latest.players.slice(0,14)){p.age=28;p.rookieYear=2025;p.a.fill(85);}
 const roster=asianGamesRoster(c,bat);assert.equal(roster.complete,true);assert.equal(roster.selected.length,24);assert.ok(roster.wildcards<=3);
 assert.equal(roster.selected.filter(p=>p.role==='pitch').length,11);assert.equal(roster.selected.filter(p=>p.position==='포수').length,2);assert.equal(roster.selected.filter(p=>['1루수','2루수','3루수','유격수','지명타자'].includes(p.position)).length,7);assert.equal(roster.selected.filter(p=>['좌익수','중견수','우익수'].includes(p.position)).length,4);
 assert.equal(new Set(roster.selected.map(p=>p.team)).size,10);for(const team of new Set(roster.selected.map(p=>p.team)))assert.ok(roster.selected.filter(p=>p.team===team).length<=3);
 for(const position of ['1루수','2루수','3루수','유격수'])assert.ok(roster.selected.some(p=>p.position===position));
 assert.equal(nationalSelectionChance(c,'아시안게임',bat).chance,roster.selected.some(p=>p.id==='user')?1:0);assert.equal(nationalSelectionChance({...c,service:1},'아시안게임',bat).chance,0);
});
test('아시안게임은 같은 내야라도 포지션 공백·경쟁과 실제 입단 연도를 사용한다',()=>{
 const c=make();c.latest=selectionLeague();c.player.a.fill(85);c.history=[{year:2028,stage:'프로'}];
 assert.ok(nationalSelectionChance(c,'아시안게임',bat).chance>.8);assert.equal(nationalSelectionChance({...c,age:30},'아시안게임',bat).chance,0);
 c.history=[{year:2031,stage:'프로'}];c.age=28;c.proYears=4;assert.equal(nationalSelectionChance(c,'아시안게임',bat).category,'연령·연차 대상');
 assert.equal(nationalSelectionChance(c,'아시안게임',{...bat,g:3,pa:10,ab:8,h:3}).chance,0);
});
test('충분한 출장의 최근 골든글러브는 상무 평가에 반영하되 합격을 보장하지 않는다',()=>{
 const c=make();c.latest=selectionLeague();c.history=[{year:2033,stage:'프로',role:'bat',stat:bat,awards:['골든글러브 · 2루수']}];
 const strong=sangmuRecruitment(c);assert.equal(strong.probability,.96);assert.equal(strong.rank,strong.stronger+1);assert.equal(strong.candidates,11);
 const weak=structuredClone(c);weak.player.a.fill(40);weak.history[0].stat={...bat,h:60,hr:0};assert.ok(sangmuRecruitment(weak).probability<strong.probability);
 let success=0;for(let seed=1;seed<=200;seed++){const player=structuredClone(c);player.seed=seed;success+=+enlist(player,'athletic');assert.equal(player.lastSangmuResult.rank,strong.rank);assert.equal(player.lastSangmuResult.total,strong.candidates);}assert.ok(success>175&&success<200);
 for(const field of [{served:true},{exempt:true},{service:1},{age:18},{age:28}])assert.equal(sangmuRecruitment({...c,...field}).eligible,false);
});
test('승패는 경기 결정 로그와 팀 합계에 일치하고 ERA만으로 승패를 만들지 않는다',()=>{
 const league=simulateSeason({seed:83,year:2034,recordPitching:true});
 for(const p of league.players.filter(p=>p.role==='pitch')){const logs=league.pitchingLog.filter(x=>x.id===p.id);assert.equal(p.stat.w,logs.filter(x=>x.winner).length);assert.equal(p.stat.l,logs.filter(x=>x.loser).length);assert.ok(logs.filter(x=>x.loser).every(x=>!x.teamWon));}
 for(const t of league.teams){const pitchers=league.players.filter(p=>p.role==='pitch'&&p.team===t.id);assert.equal(pitchers.reduce((n,p)=>n+p.stat.w,0),t.w);assert.equal(pitchers.reduce((n,p)=>n+p.stat.l,0),t.l);}
});
test('새 선발 평가와 WAR 문맥을 저장해도 확정된 과거 대표팀·상무 결과는 보존한다',()=>{
 const c=make();c.nationalDecisions={'2030:아시안게임':'미선발'};c.lastSangmuResult={year:2033,rank:15,total:20,accepted:false};const before=structuredClone(c);let raw;saveCareer(c,{setItem:(_,s)=>raw=s});const loaded=loadCareer({getItem:()=>raw});assert.deepEqual(loaded.nationalDecisions,before.nationalDecisions);assert.deepEqual(loaded.lastSangmuResult,before.lastSangmuResult);
});
