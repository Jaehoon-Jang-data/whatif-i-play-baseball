import test from'node:test';import assert from'node:assert/strict';
import{simulateSeason,awards,createCareer,emptyPitch,emptyBat,refreshCurrentAwards,saveCareer,loadCareer,archiveEntry,awardSummary}from'../src/engine.js';
import{createAwardEvaluation,goldenGloveEligible,rookieAwardEligibility,AWARD_MODEL_VERSION}from'../src/award-evaluation.js';
import{leagueWarContext,seasonWAR}from'../src/war.js';
const league=simulateSeason({seed:83,year:2030,player:{name:'수상 검증',role:'pitch',position:'선발',team:0,a:Array(6).fill(65),rookie:true,rookieYear:2030,priorPa:0,priorOuts:0,opportunity:.6}});
const war=(l,p)=>seasonWAR({...p,year:l.year},{context:leagueWarContext(l)}).value;

test('MVP·신인왕·골든글러브·최동원상은 같은 시즌 WAR를 주점수로 쓰고 보조점수는 10점 이내다',()=>{
 const fresh=awards(league);
 for(const a of fresh.filter(x=>x.title==='정규시즌 MVP'||x.title==='신인왕'||x.title==='최동원상'||x.title.startsWith('골든글러브'))){
  for(const p of a.candidates||[]){const player=league.players.find(x=>x.id===p.id);assert.equal(p.war,war(league,player));assert.equal(p.warPrimary,true);assert.ok(Math.abs(p.warPoints-p.war*100)<1e-9);assert.ok(p.secondary>=-1e-9&&p.secondary<=10+1e-9);}
 }
 const mvp=fresh.find(x=>x.title==='정규시즌 MVP'),winner=league.players.find(x=>x.id===mvp.winners[0]);assert.ok(war(league,winner)>=Math.max(...league.players.map(p=>war(league,p)))-.1000001);
 for(const a of fresh.filter(x=>x.title.startsWith('수비상')))assert.ok(a.candidates.every(p=>p.warPrimary===false&&p.warPoints===null));
});
test('기록 타이틀은 WAR 변화와 무관한 지표로 정하고 외야수는 통합 세 명을 선정한다',()=>{
 const l=structuredClone(league),before=awards(l),pitcher=l.players.find(p=>p.role==='pitch'&&p.stat.g);pitcher.stat.k+=100;
 const after=awards(l);for(const title of ['다승왕','세이브왕','홀드왕','홈런왕','안타왕'])assert.deepEqual(after.find(a=>a.title===title).winners,before.find(a=>a.title===title).winners);
 const of=after.filter(x=>x.title.startsWith('골든글러브')&&x.title.includes('외야'));assert.equal(of.length,1);assert.equal(of[0].winners.length,3);assert.equal(new Set(of[0].winners).size,3);
});
test('신인 공식 자격·보직별 표본·최소 기여는 각각 판정한다',()=>{
 const p={id:'rookie',role:'pitch',position:'선발',team:0,age:30,rookie:true,rookieYear:2025,priorPa:60,priorOuts:90,stat:{...emptyPitch(),g:10,gs:10,outs:147}};
 const short=rookieAwardEligibility(p,league,.464);assert.equal(short.officialEligible,true);assert.equal(short.sampleEligible,false);assert.equal(short.valueEligible,false);
 assert.equal(rookieAwardEligibility({...p,priorOuts:91},league,5).officialEligible,false);assert.equal(rookieAwardEligibility({...p,rookieYear:2024},league,5).officialEligible,false);assert.equal(rookieAwardEligibility({...p,rookieYear:2031},league,5).officialEligible,false);assert.equal(rookieAwardEligibility({...p,foreignProHistory:true},league,5).officialEligible,false);
 const starter={...p,stat:{...p.stat,g:20,outs:216}};assert.equal(rookieAwardEligibility(starter,league,1).awardEligible,true);assert.equal(rookieAwardEligibility({...starter,stat:{...starter.stat,outs:215}},league,2).sampleEligible,false);
 const relief={...p,position:'중간계투',stat:{...p.stat,g:30,gs:0,outs:108}};assert.equal(rookieAwardEligibility(relief,league,1).awardEligible,true);assert.equal(rookieAwardEligibility({...relief,stat:{...relief.stat,g:29}},league,3).sampleEligible,false);
 const bat={...p,role:'bat',position:'포수',stat:{...emptyBat(),g:60,pa:223}};assert.equal(rookieAwardEligibility(bat,league,1).awardEligible,true);assert.equal(rookieAwardEligibility({...bat,stat:{...bat.stat,pa:222}},league,5).sampleEligible,false);
});
test('단독 후보라도 49이닝의 낮은 기여로 신인왕을 자동 수여하지 않는다',()=>{
 const l=structuredClone(league);for(const p of l.players)p.rookie=false;const p=l.players.find(p=>p.id==='user');Object.assign(p,{rookie:true,rookieYear:2030,priorPa:0,priorOuts:0});p.stat={...emptyPitch(),g:10,gs:10,outs:147,w:2,l:5,k:35,bb:24,h:65,hr:5,r:30,er:30};p.warUsage={starterOuts:147,reliefOuts:0,parkOuts:147,teams:{0:147}};
 const a=awards(l).find(x=>x.title==='신인왕');assert.deepEqual(a.winners,[]);assert.equal(a.candidates[0].officialEligible,true);assert.equal(a.candidates[0].sampleEligible,false);
});
test('골든글러브 실제 수비 이닝·타이틀 예외·DH와 투수 자격을 분리한다',()=>{
 const p={id:'p',role:'bat',position:'포수',team:0,stat:{...emptyBat(),g:80,pa:300,ch:100},warUsage:{positionOuts:{포수:2159}}};assert.equal(goldenGloveEligible(p,league,new Set()),false);p.warUsage.positionOuts.포수=2160;assert.equal(goldenGloveEligible(p,league,new Set()),true);
 assert.equal(goldenGloveEligible({...p,warUsage:{positionOuts:{포수:1}}},league,new Set(['p'])),true);
 const dh={...p,position:'지명타자',stat:{...p.stat,pa:296}};assert.equal(goldenGloveEligible(dh,league,new Set()),false);assert.equal(goldenGloveEligible({...dh,stat:{...dh.stat,pa:297}},league,new Set()),true);
 const arm={...p,role:'pitch',position:'중간계투',stat:{...emptyPitch(),g:30,outs:90}};assert.equal(goldenGloveEligible(arm,league,new Set()),false);assert.equal(goldenGloveEligible({...arm,stat:{...arm.stat,hold:30}},league,new Set()),true);
});
test('열려 있는 시즌 결과만 한 번 정정하고 수상 이력·대기 이벤트·보관 집계를 일치시킨다',()=>{
 const c=createCareer({seed:83,name:'수상 이관',school:'고교',role:'pitch',position:'선발',team:0});Object.assign(c,{year:2030,stage:'프로',phase:'result'});const l=structuredClone(league);delete l.awardModelVersion;for(const p of l.players)p.rookie=false;const user=l.players.find(p=>p.id==='user');user.stat={...emptyPitch(),g:10,gs:10,outs:147,w:2,l:5,k:35,bb:24,h:65,hr:5,r:30,er:30};user.warUsage={starterOuts:147,reliefOuts:0,parkOuts:147,teams:{0:147}};l.awards=[{title:'신인왕',winners:['user']}];c.history=[{year:2029,stage:'프로',role:'pitch',stat:emptyPitch(),awards:['신인왕']},{year:2030,stage:'프로',role:'pitch',position:'선발',team:0,stat:user.stat,league:l,awards:['신인왕']}];c.latest=l;c.pendingEvent={type:'award',year:2030,titles:['신인왕']};c.eventQueue=[{type:'postseason',year:2030,ring:false}];c.events=[{year:2029,text:'신인왕 수상'},{year:2030,text:'신인왕 수상'}];const salary=structuredClone(c.salaryLedger);
 assert.equal(refreshCurrentAwards(c),true);assert.deepEqual(c.history[0].awards,['신인왕']);assert.deepEqual(c.history[1].awards,[]);assert.equal(c.pendingEvent.type,'postseason');assert.deepEqual(c.events,[{year:2029,text:'신인왕 수상'}]);assert.equal(l.awardModelVersion,AWARD_MODEL_VERSION);assert.equal(refreshCurrentAwards(c),false);assert.deepEqual(c.salaryLedger,salary);
 let raw;saveCareer(c,{setItem:(_,s)=>raw=s});const loaded=loadCareer({getItem:()=>raw});assert.deepEqual(loaded.history.map(x=>x.awards),[['신인왕'],[]]);assert.deepEqual(awardSummary(archiveEntry(loaded).history).find(x=>x.name==='신인왕').years,[2029]);assert.equal(loaded.pendingEvent.type,'postseason');
 const past=structuredClone(c);past.phase='prepare';delete past.history[1].league.awardModelVersion;assert.equal(refreshCurrentAwards(past),false);
});
