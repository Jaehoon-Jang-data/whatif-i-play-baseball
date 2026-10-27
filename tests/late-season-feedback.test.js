import test from 'node:test';
import assert from 'node:assert/strict';
import {careerTeams,createCareer,archiveEntry,retire,saveCareer,loadCareer,emptyBat,rosterPlan,asianGamesWindow,tournamentResult,rng,sangmuRecruitment,postseasonRosterAssessment,nationalEvents,acknowledgeSeasonNational} from '../src/engine.js';
import {seasonDate} from '../src/league-operations.js';
import {seasonPlaybackStops,SEASON_PLAYBACK_STEPS} from '../src/progress-display.js';
const make=(seed=31)=>{const c=createCareer({seed,name:'가상 선수',school:'가상고',role:'bat',position:'중견수',type:'교타형',team:0});Object.assign(c,{stage:'프로',year:2034,age:24,proYears:3,reserved:true});c.player.a.fill(70);return c;};
const restore=c=>{let raw;saveCareer(c,{setItem:(_,v)=>raw=v});return loadCareer({getItem:()=>raw});};
const row=(year,team=0)=>({year,stage:'프로',role:'bat',position:'중견수',team,military:false,stat:{...emptyBat(),g:100,pa:400,ab:360,h:110,bb:40},awards:[]});
test('복귀 이적은 연속 중복만 제거하며 은퇴 보관·저장 뒤에도 마지막 구단을 남긴다',()=>{
 const c=make();c.history=[row(2031),row(2032,3),row(2033,3)];c.transactionHistory=[{year:2031,type:'secondary',selected:true,oldTeam:0,newTeam:3},{year:2033,type:'secondary',selected:true,oldTeam:3,newTeam:0},{year:2034,type:'secondary',selected:false,oldTeam:0,newTeam:7}];
 assert.deepEqual(careerTeams(c),[0,3,0]);retire(c);assert.deepEqual(archiveEntry(c).teamHistory,[0,3,0]);assert.deepEqual(careerTeams(archiveEntry(c)),[0,3,0]);assert.deepEqual(careerTeams(restore(c)),[0,3,0]);assert.equal(archiveEntry(c).history.at(-1).team,3);
});
test('시즌 중 트레이드 구간과 FA·최종 소속도 순서대로 팀 이력에 포함한다',()=>{
 const c=make();c.player.team=4;c.history=[{...row(2031,2),teamSegments:[{team:0},{team:2}]}];c.contractHistory=[{year:2032,kind:'fa',team:4}];assert.deepEqual(careerTeams(c),[0,2,4]);
});
test('최근 신인왕 실적은 상무 선발에 반영하되 자동 합격과 재지원 중복은 만들지 않는다',()=>{
 const normal=make(),roy=structuredClone(normal);normal.history=[row(2033)];roy.history=[{...row(2033),awards:['신인왕']}];const a=sangmuRecruitment(normal),b=sangmuRecruitment(roy);assert.ok(b.probability>a.probability+.3);assert.ok(b.probability<1);assert.ok(b.distinction>0);
 assert.equal(sangmuRecruitment({...roy,athleticTried:2034}).alreadyApplied,true);for(const field of [{served:true},{exempt:true},{service:1},{age:28}])assert.equal(sangmuRecruitment({...roy,...field}).eligible,false);
});
test('포스트시즌은 최근 부진·같은 포지션 경쟁을 반영하고 수비 전문 역할을 허용한다',()=>{
 const bad={...row(2034),stat:{...emptyBat(),g:30,pa:42,ab:39,h:6,bb:3},aAfter:Array(6).fill(65),rosterCalendar:Array(188).fill('1군')};
 const rival={id:'rival',team:0,role:'bat',position:'중견수',a:Array(6).fill(70),stat:{...emptyBat(),g:110,pa:450,ab:400,h:120,bb:50,d:20,hr:12}};bad.league={players:[rival]};assert.equal(postseasonRosterAssessment(bad).selected,false);assert.match(postseasonRosterAssessment(bad).reason,/부진/);
 bad.aAfter[4]=85;bad.aAfter[5]=85;assert.equal(postseasonRosterAssessment(bad).selected,true);assert.match(postseasonRosterAssessment(bad).reason,/수비/);
 bad.rosterCalendar[187]='2군';assert.equal(postseasonRosterAssessment(bad).selected,false);bad.rosterCalendar[187]='재활군';assert.equal(postseasonRosterAssessment(bad).selected,false);
});
test('아시안게임은 9월 하순 열흘만 차출하고 이후 원래 구단 상태로 복귀한다',()=>{
 for(const year of [2030,2034,2038]){const c=make();c.year=year;c.player.a.fill(90);c.nationalDecisions={[`${year}:아시안게임`]:'수락'};const plan=rosterPlan(c),window=asianGamesWindow(year),days=plan.calendar.flatMap((state,i)=>state==='대표팀'?[i]:[]);assert.equal(days.length,10);assert.equal(seasonDate(year,days[0],188),window.start);assert.equal(seasonDate(year,days.at(-1),188),window.end);assert.equal(plan.calendar[days.at(-1)+1],'1군');assert.equal(plan.calendar[187],'1군');assert.ok(plan.moves.some(x=>x.reason==='대표팀 복귀'));
 for(let game=0;game<144;game++)if(plan.calendar[Math.floor(game*188/144)]==='대표팀')assert.equal(plan.majorDays[game],false);
 const after=restore(c);assert.deepEqual(rosterPlan(after).calendar,plan.calendar);
 c.nationalDecisions={[`${year}:아시안게임`]:'거절'};assert.ok(!rosterPlan(c).calendar.includes('대표팀'));
 }
});
test('우승률은 43%에서 55%로 높이고 성인 대회 확률은 유지한다',()=>{
 let old=0,next=0;for(let seed=1;seed<=10000;seed++){old+=+(rng(seed+2034*1231+109)()<.43);next+=+(tournamentResult(seed,2034,'아시안게임').result==='우승');for(const [name,index]of [['WBC',0],['프리미어12',2]])assert.equal(tournamentResult(seed,2034,name).result==='우승',rng(seed+2034*1231+index*109)()<.09);}
 assert.ok(next>old+1000&&next<old+1400);
});
test('대표팀 결과·특례는 중복 생성하지 않고 시즌 중 확인 뒤 다른 알림은 보존한다',()=>{
 const c=make();c.nationalDecisions={'2034:아시안게임':'수락'};const one=nationalEvents(c,null,null),two=nationalEvents(c,null,null);assert.equal(c.nationalHistory.length,1);assert.deepEqual(one,two);assert.equal(one[0].window.days,10);
 c.pendingEvent={type:'national',year:2034,items:one};c.eventQueue=[{type:'award',year:2034,titles:['타격왕']},{type:'postseason',year:2034,ring:false}];acknowledgeSeasonNational(c,2034);assert.equal(c.pendingEvent.type,'award');assert.equal(c.eventQueue[0].type,'postseason');assert.equal(c.nationalHistory.length,1);assert.equal(restore(c).seasonNationalAcknowledgedYear,2034);
});
test('진행 정지는 이적·차출·복귀 순서이고 확인 상태 저장 후에는 지난 팝업을 반복하지 않는다',()=>{
 const c=make(),event={name:'아시안게임',selected:true,window:asianGamesWindow(c.year)},candidate={year:c.year,history:[{rosterCalendar:Array(188).fill('1군'),international:[event],league:{playerTrade:{day:70}}}]};
 let stops=seasonPlaybackStops(c,candidate);assert.deepEqual(stops.map(s=>s.type),['trade','national_departure','national']);assert.ok(stops.every(s=>s.step<SEASON_PLAYBACK_STEPS));assert.ok(stops[1].step<stops[2].step);
 c.seasonTradeAcknowledgedYear=c.year;c.seasonNationalDepartureYear=c.year;stops=seasonPlaybackStops(restore(c),candidate);assert.deepEqual(stops.map(s=>s.type),['national']);c.seasonNationalAcknowledgedYear=c.year;assert.deepEqual(seasonPlaybackStops(restore(c),candidate),[]);
});
