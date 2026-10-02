import test from 'node:test';
import assert from 'node:assert/strict';
import {abilityCandidates,overall,simulateSeason,TITLES,awardSummary,canonicalAwardName,createCareer,progress,saveCareer,loadCareer,percentileReport,qualification,tournamentResult,nationalTournamentYear,decideNationalInvitation} from '../src/engine.js';

test('세 후보의 실제 능력치가 같은 표시 오버롤을 만든다',()=>{
 for(const role of ['bat','pitch'])for(const position of role==='bat'?['포수','1루수','중견수']:['선발','중간계투','마무리'])for(let seed=1;seed<=200;seed++){
  const candidates=abilityCandidates(role,seed,position);
  assert.equal(new Set(candidates.map(x=>overall({role,position,a:x.a}))).size,1);
  assert.equal(new Set(candidates.map(x=>x.type)).size,3);
  assert.ok(new Set(candidates.map(x=>x.a.join(','))).size>1);
 }
});

test('투수 골든글러브는 하나, 최동원상은 독립 후보와 점수를 가진다',()=>{
 const season=simulateSeason({seed:41,year:2030});
 const gloves=season.awards.filter(x=>x.title.startsWith('골든글러브 ·')&&season.players.some(p=>p.role==='pitch'&&x.winners.includes(p.id)));
 assert.deepEqual(gloves.map(x=>x.title),['골든글러브 · 투수']);
 const choi=season.awards.find(x=>x.title==='최동원상');
 assert.ok(choi?.winners.length===1&&choi.candidates.length>0);
 for(const entry of choi.candidates){
  const player=season.players.find(x=>x.id===entry.id);
  assert.ok(player.stat.gs>=25&&player.stat.outs>=360||player.stat.sv>=35&&player.stat.outs>=120);
  assert.ok(Number.isFinite(entry.score));
 }
 assert.deepEqual(TITLES.map(x=>x[0]),['다승왕','평균자책점왕','삼진왕','세이브왕','홀드왕','승률왕','타격왕','출루율왕','타점왕','홈런왕','도루왕','안타왕','득점왕','장타율왕']);
});

test('시즌 수상 이력은 은퇴 집계와 구버전 명칭에 동일하게 반영된다',()=>{
 const rows=[{year:2031,awards:['MVP','다승','골든글러브 · 선발']},{year:2032,awards:['정규시즌 MVP','다승왕']},{year:2036,awards:['MVP','최동원상']}];
 const summary=awardSummary(rows);
 assert.deepEqual(summary.find(x=>x.name==='정규시즌 MVP'),{name:'정규시즌 MVP',years:[2031,2032,2036],count:3});
 assert.deepEqual(summary.find(x=>x.name==='다승왕').years,[2031,2032]);
 assert.equal(canonicalAwardName('골든글러브 · 선발'),'골든글러브 · 투수');
 const c=createCareer({seed:1,name:'검증',school:'검증고',role:'pitch',position:'선발',type:'완급형',team:0});
 c.history=rows.map(x=>({...x,stage:'프로',role:'pitch',stat:{g:0,gs:0,outs:0,w:0,l:0,hold:0,sv:0,bs:0,k:0,bb:0,h:0,hr:0,r:0,er:0}}));
 let saved;saveCareer(c,{setItem:(_,raw)=>saved=raw});
 const loaded=loadCareer({getItem:()=>saved});
 assert.deepEqual(loaded.history.map(x=>x.awards),[['정규시즌 MVP','다승왕','골든글러브 · 투수'],['정규시즌 MVP','다승왕'],['정규시즌 MVP','최동원상']]);
});

test('규정이닝 충족 투수는 비교군을 넓혀 백분위를 표시한다',()=>{
 const players=Array.from({length:12},(_,i)=>({id:i?'peer'+i:'user',role:'pitch',position:'선발',team:0,stat:{g:30,gs:30,outs:i===0?qualification(144,'pitch'):i<4?450:270,w:8,l:6,hold:0,sv:0,bs:0,k:80+i,bb:30,h:100,hr:10,r:40,er:35}}));
 const report=percentileReport({year:2030,games:144,teams:[{id:0,g:144}],players},'pitch');
 assert.ok(report.every(x=>x.qualification==='충족'&&x.percentile!==null&&x.count>=10));
 assert.ok(report.every(x=>x.threshold<qualification(144,'pitch')));
});

test('대표팀 미선발 시즌도 대회 결과를 저장하고 복구한다',()=>{
 const c=createCareer({seed:17,name:'검증',school:'검증고',role:'bat',position:'중견수',type:'교타형',team:0});
 c.stage='프로';c.phase='prepare';c.year=2030;c.age=28;c.served=true;c.proYears=4;c.contract={kind:'reserved',annualMan:6000,years:1,left:0};
 c.nationalDecisions={'2030:WBC':'미선발','2030:아시안게임':'미선발'};
 const row=progress(c);
 assert.deepEqual(row.tournamentResults.map(x=>x.name),['WBC','아시안게임']);
 assert.deepEqual(row.tournamentResults.map(x=>x.result),row.tournamentResults.map(x=>tournamentResult(c.seed,row.year,x.name).result));
 assert.deepEqual(row.international,[]);
 let saved;saveCareer(c,{setItem:(_,raw)=>saved=raw});
 assert.deepEqual(loadCareer({getItem:()=>saved}).history.at(-1).tournamentResults,row.tournamentResults);
 assert.equal(nationalTournamentYear(2031,'프리미어12'),true);
});

test('대회 단체 결과와 개인 선발·출장·성적은 서로 다른 데이터다',()=>{
 const make=()=>{const c=createCareer({seed:29,name:'검증',school:'검증고',role:'bat',position:'중견수',type:'교타형',team:0});c.stage='프로';c.year=2030;c.pendingEvent={type:'national_invitation',year:2030,name:'WBC'};return c;};
 const accepted=make(),declined=make();decideNationalInvitation(accepted,true);decideNationalInvitation(declined,false);
 const a=accepted.nationalHistory[0],d=declined.nationalHistory[0];
 assert.equal(a.result,d.result);assert.equal(a.result,tournamentResult(29,2030,'WBC').result);
 assert.equal(a.selected,true);assert.equal(d.declined,true);assert.equal(d.appeared,false);assert.equal(d.stat,null);
 assert.equal(a.appeared,Boolean(a.stat));
 if(a.stat)assert.equal(a.stat.pa,a.stat.ab+a.stat.bb+a.stat.hbp+a.stat.sf);
});
