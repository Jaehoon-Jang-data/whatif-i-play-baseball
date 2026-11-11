import test from 'node:test';
import assert from 'node:assert/strict';
import {CAREER_RECORDS,SEASON_RECORDS,recordAchievements} from '../src/record-achievements.js';
import {recordBadgesHtml,awardBadgesHtml} from '../src/presentation.js';
import {createCareer,emptyBat,emptyPitch,saveCareer,loadCareer,archiveEntry} from '../src/engine.js';

const row=(role,year,stat={})=>({year,stage:'프로',role,position:role==='bat'?'포수':'선발',team:0,stat:{...(role==='bat'?emptyBat():emptyPitch()),g:1,...stat},awards:[]});
const has=(history,r,id)=>recordAchievements(history,r).some(x=>x.id===id);

test('통산 모든 기준은 직전 미달·정확한 첫 달성·이후 반복 없음의 경계를 지킨다',()=>{
 for(const [role,criteria] of Object.entries(CAREER_RECORDS))for(const [key,,thresholds,scale=1] of criteria)for(const n of thresholds){
  const id=`career-${role}-${key}-${n}`,prior=row(role,2030,{[key]:n*scale-2}),near=row(role,2031,{[key]:1}),hit=row(role,2031,{[key]:2}),next=row(role,2032,{[key]:1});
  assert.equal(has([prior,near],near,id),false,id);
  assert.equal(has([prior,hit],hit,id),true,id);
  assert.equal(has([prior,hit,next],next,id),false,id);
 }
});
test('한 시즌에 여러 통산 기준을 넘어도 각각 한 배지이며 미래·정렬 순서에 영향받지 않는다',()=>{
 const prior=row('bat',2030,{h:999}),hit=row('bat',2031,{h:502,hr:101,sb:100}),future=row('bat',2032,{h:999});
 const records=recordAchievements([future,hit,prior],hit);
 assert.deepEqual(records.filter(x=>x.key==='h'&&x.kind==='career').map(x=>x.label),['통산 1,000안타','통산 1,500안타']);
 assert.ok(records.some(x=>x.label==='통산 100홈런'));assert.ok(records.some(x=>x.label==='통산 100도루'));
 assert.equal(new Set(records.map(x=>x.id)).size,records.length);
 assert.deepEqual(records,recordAchievements([prior,structuredClone(hit)],structuredClone(hit)));
});
test('시즌 모든 기준은 1단위 미달과 정확한 달성을 구분하고 통산 합산으로 만들지 않는다',()=>{
 for(const [role,criteria] of Object.entries(SEASON_RECORDS))for(const [key,,n,scale=1] of criteria){
  const id=`season-${role}-${key}-${n}`,prior=row(role,2030,{[key]:n*scale}),near=row(role,2031,{[key]:n*scale-1}),hit=row(role,2031,{[key]:n*scale});
  assert.equal(has([prior,near],near,id),false,id);assert.equal(has([prior,hit],hit,id),true,id);
 }
});
test('홈런-도루는 최상위 조합만 표시하며 100타점-100득점은 두 조건을 모두 요구한다',()=>{
 for(const [hr,sb,tier] of [[19,40,null],[20,20,20],[30,29,20],[30,30,30],[40,39,30],[40,40,40]]){
  const r=row('bat',2030,{hr,sb});const combos=recordAchievements([],r).filter(x=>x.id.startsWith('season-hr-sb'));
  assert.deepEqual(combos.map(x=>x.label),tier?[`시즌 ${tier}홈런-${tier}도루`]:[]);
 }
 for(const [rbi,r,expected] of [[99,100,false],[100,99,false],[100,100,true]]){
  const season=row('bat',2030,{rbi,r});assert.equal(has([],season,'season-rbi-r-100'),expected);
  if(expected)assert.equal(recordAchievements([],season).filter(x=>x.kind==='season').length,3);
 }
});
test('고교·대학·군·2군·국제대회·포스트시즌·이적 구간을 중복 합산하지 않는다',()=>{
 const prior=row('bat',2030,{h:999}),season=row('bat',2031,{h:1,hr:19,sb:19,rbi:99,r:99});
 Object.assign(season,{minorStat:{h:200,hr:50,sb:50},postseason:{stat:{h:100,hr:10,sb:10}},international:[{stat:{h:200}}],teamSegments:[{team:0,stat:{h:1}},{team:1,stat:{h:0}}]});
 const ignored=['고교','대학'].map((stage,i)=>({...row('bat',2028+i,{h:3000}),stage}));ignored.push({...row('bat',2027,{h:3000}),military:true},{...row('bat',2026,{h:3000}),league:{level:'minor'}});
 const records=recordAchievements([...ignored,prior,season],season);assert.deepEqual(records.map(x=>x.label),['통산 1,000안타']);
 for(const bad of [...ignored,{...season,stat:{...season.stat,g:0}}])assert.deepEqual(recordAchievements([],bad),[]);
 const pitch=row('pitch',2032,{k:1});assert.equal(has([row('bat',2031,{k:999})],pitch,'career-pitch-k-1000'),false);
 assert.deepEqual(recordAchievements([],row('pitch',2033,{g:1,gs:1,outs:27,h:0,r:0,er:0})),[],'시즌 합계만으로 완투·완봉·노히트·퍼펙트를 추정하지 않음');
});
test('이닝은 아웃으로 정확히 비교하고 과거 누락 필드는 추정하지 않는다',()=>{
 const prior=row('pitch',2030,{outs:2998}),hit=row('pitch',2031,{outs:2});
 assert.equal(has([prior,hit],hit,'career-pitch-outs-1000'),true);
 const old=row('pitch',2029);delete old.stat.hold;const now=row('pitch',2031,{hold:100,k:1000});
 assert.equal(has([old],now,'career-pitch-hold-100'),false);assert.equal(has([old],now,'career-pitch-k-1000'),true);
});
test('저장·복구·구 JSON 로드·은퇴 보관 후에도 배지를 재계산하며 수상·지급 내역을 변경하지 않는다',()=>{
 const c=createCareer({seed:313,name:'기록 검증',school:'검증고',role:'bat',position:'포수',team:0});Object.assign(c,{stage:'프로',year:2031,phase:'prepare'});
 c.history=[row('bat',2030,{h:999}),row('bat',2031,{h:200,hr:30,sb:30,rbi:100,r:100})];c.history[1].awards=['홈런왕'];
 const original=structuredClone(c),expected=recordAchievements(c.history,c.history[1]);let raw;
 saveCareer(c,{setItem:(_,s)=>raw=s});const loaded=loadCareer({getItem:()=>raw});const legacy=loadCareer({getItem:()=>JSON.stringify(original)});
 for(const h of [loaded.history,legacy.history,archiveEntry(loaded).history])assert.deepEqual(recordAchievements(h,h[1]),expected);
 assert.deepEqual(c,original);assert.deepEqual(loaded.history[1].awards,['홈런왕']);assert.deepEqual(loaded.salaryLedger,original.salaryLedger);
 assert.ok(!Object.hasOwn(loaded.history[1],'recordAchievements'));
});
test('달성 기록은 타이틀과 같은 개별 배지 구조로 별도 영역에 표시한다',()=>{
 const r=row('bat',2030,{h:200,rbi:100,r:100}),html=recordBadgesHtml([],r);
 assert.match(html,/aria-label="달성 기록"/);assert.match(html,/1군 정규시즌/);
 assert.equal((html.match(/class="award-badge record-badge"/g)||[]).length,recordAchievements([],r).length);
 assert.match(awardBadgesHtml(['골든글러브 · 포수']),/class="award-badge"><b>/);assert.ok(!html.includes(' / '));assert.equal(recordBadgesHtml([],row('bat',2030)), '');
});
