import test from 'node:test';
import assert from 'node:assert/strict';
import {PROGRAMS,programProfile,programOptions,programSelection,programGrowth,completeProgramSeason} from '../src/training-programs.js';
import {playingStyle,expectedContribution} from '../src/player-value.js';
import {createCareer,progress,rosterPlan,injuryForecast,saveCareer,loadCareer,emptyBat,simulateSeason} from '../src/engine.js';
import {programOptionHtml} from '../src/training-ui.js';
const make=(role='bat',position=role==='bat'?'유격수':'선발')=>{const c=createCareer({seed:71,name:'프로그램',school:'가상고',role,position,type:role==='bat'?'교타형':'제구형',team:0});Object.assign(c,{age:23,year:2030,stage:'프로',proYears:3,phase:'prepare',served:true});c.player.a.fill(60);c.potentialCaps.fill(88);c.contract={kind:'reserved',annualMan:3300,left:1};return c;};
const restore=c=>{let raw;saveCareer(c,{setItem:(_,s)=>raw=s});return loadCareer({getItem:()=>raw});};
test('양 역할에 여섯 프로그램을 제공하고 예전 숫자 중점은 역할별 프로그램으로 이관한다',()=>{
 for(const role of ['bat','pitch']){assert.equal(PROGRAMS[role].length,6);const c=make(role);const options=programOptions(c);assert.equal(options.length,6);assert.ok(options.every(p=>p.main&&p.support&&p.burden&&p.reason));assert.ok(PROGRAMS[role].every(p=>p.weights.filter(w=>w>=.3).length>=2));c.training=[4,5];assert.deepEqual(restore(c).trainingPrograms,programSelection(role,[4,5]));}
 assert.throws(()=>programSelection('bat',['pitch-power']));assert.throws(()=>programSelection('bat',['bat-contact','bat-contact']));
});
test('프로그램별 주효과·보조효과·부담이 다르고 상한 성장량은 다른 능력치로 전이하지 않는다',()=>{
 for(const role of ['bat','pitch']){const c=make(role),ids=PROGRAMS[role].map(p=>p.id),a=programGrowth(c,[ids[0]],10),b=programGrowth(c,[ids[1]],10);assert.notDeepEqual(a.effects,b.effects);const index=a.effects.findIndex(x=>x.applied===Math.max(...a.effects.map(e=>e.applied))),fixed=structuredClone(c);fixed.player.a[index]=fixed.potentialCaps[index];const cap=programGrowth(fixed,[ids[0]],10);assert.equal(cap.effects[index].applied,0);assert.ok(cap.effects[index].blocked>0);for(let i=0;i<6;i++)if(i!==index)assert.equal(cap.effects[i].applied,a.effects[i].applied);}
});
test('반복 효율·전환·나이·잠재력·부상 회복 상태를 성장에 반영한다',()=>{
 const c=make(),id='bat-contact',initial=programProfile(c,[id]).efficiency;
 for(let i=0;i<5;i++)completeProgramSeason(c,programGrowth(c,[id],8),null,emptyBat());assert.ok(programProfile(c,[id]).efficiency<initial*.7);assert.ok(programProfile(c,['bat-approach']).efficiency>programProfile(c,[id]).efficiency);c.recoveryState={year:c.year,remainingDays:20};assert.ok(programProfile(c,['bat-approach']).efficiency<1);
 const young=make(),old=make();old.age=38;assert.ok(programOptions(old).every(p=>p.reason.includes('유지')));const y=progress(young,['bat-contact']),o=progress(old,['bat-contact']);assert.ok(y.totalGrowth>o.totalGrowth);assert.ok(y.aAfter[0]-y.aBefore[0]>o.aAfter[0]-o.aBefore[0]);
 const high=make(),low=make();high.potential=1.2;low.potential=.85;assert.ok(progress(high,['bat-contact']).totalGrowth>progress(low,['bat-contact']).totalGrowth);
});
test('복구·중단 선택·실제 성장과 화면 선택은 같은 프로그램 ID를 사용한다',()=>{
 const c=make('pitch');c.trainingPrograms=['pitch-breaking','pitch-command'];c.pendingTrainingPrograms=[...c.trainingPrograms];const loaded=restore(c);assert.deepEqual(loaded.trainingPrograms,c.trainingPrograms);assert.deepEqual(loaded.pendingTrainingPrograms,c.trainingPrograms);const row=progress(loaded,loaded.pendingTrainingPrograms);assert.deepEqual(row.trainingPrograms,c.trainingPrograms);assert.equal(loaded.pendingTrainingPrograms,undefined);assert.ok(row.trainingEffects[4].applied>row.trainingEffects[0].applied);assert.ok(loaded.trainingState.repertoire.mastery<30);assert.deepEqual(restore(loaded).trainingState,loaded.trainingState);
 const html=programOptionHtml(programOptions(c)[2],true,['구속','제구','구위','체력','변화구','위기관리']);assert.match(html,/data-program="pitch-breaking"/);assert.match(html,/aria-pressed="true"/);assert.match(html,/적응 기간/);
});
test('컨디셔닝은 위험을 완만하게 줄이되 부상을 보장하지 않고 피로·이력도 반영한다',()=>{
 let heavy=0,recovery=0;for(let seed=1;seed<=1200;seed++){const c=make('pitch');c.seed=seed;c.trainingPrograms=['pitch-power'];heavy+=+!!injuryForecast(c);c.trainingPrograms=['pitch-condition'];recovery+=+!!injuryForecast(c);}assert.ok(recovery>0&&heavy>recovery);const c=make('pitch');c.trainingState={fatigue:70};assert.ok(programProfile(c,['pitch-power']).riskAdjustment>programProfile(make('pitch'),['pitch-power']).riskAdjustment);
});
test('재활 직후와 다음 해 잔여 복귀 단계는 실제 달력에 따라 올라가며 2군 조정을 거친다',()=>{
 const c=make('pitch');c.player.a.fill(85);const roster=rosterPlan(c,{startDay:70,days:30});assert.equal(roster.recoveryScale[100],.82);assert.equal(roster.recoveryScale[114],.92);assert.equal(roster.recoveryScale[128],1);assert.equal(roster.calendar[100],'2군');c.recoveryState={year:2030,remainingDays:25};const carry=rosterPlan(restore(c));assert.equal(carry.opening,'2군');assert.ok(carry.recoveryScale[0]<carry.recoveryScale[25]);const config={seed:31,year:2030,games:20,player:{role:'pitch',position:'선발',team:0,a:Array(6).fill(75),opportunity:1}};const full=simulateSeason(config).players.find(x=>x.id==='user'),limited=simulateSeason({...config,player:{...config.player,recoveryScaleDays:Array(188).fill(.82)}}).players.find(x=>x.id==='user');assert.notDeepEqual(full.stat,limited.stat);assert.deepEqual(limited.a,config.player.a);
});
test('선구·주루·수비·장타와 투수의 보직·강점이 고정 직업 없이 다른 스타일로 갱신된다',()=>{
 const bat=(position,a,state={})=>playingStyle({role:'bat',position,a},null,state),pitch=(position,a,state={})=>playingStyle({role:'pitch',position,a},null,state);
 assert.equal(bat('유격수',[50,45,50,55,85,80]),'수비형 유격수');assert.equal(bat('포수',[50,45,50,55,85,80]),'포수 수비형');assert.equal(bat('좌익수',[55,80,50,45,55,55]),'장타형');assert.equal(bat('좌익수',[55,50,80,55,55,55]),'선구형');assert.equal(bat('중견수',[55,50,50,80,55,55]),'주루형');assert.equal(bat('2루수',Array(6).fill(65),{positionFamiliarity:{'2루수':50,'3루수':50}}),'유틸리티형');assert.equal(pitch('선발',[90,60,75,65,60,55]),'구속형');assert.equal(pitch('선발',[60,65,60,90,60,55]),'선발 내구형');assert.equal(pitch('마무리',[65,65,70,50,60,60]),'마무리형');assert.equal(pitch('중간계투',[65,65,70,50,60,60]),'짧은 이닝 불펜형');assert.equal(pitch('선발',[60,70,60,60,75,60],{repertoire:{name:'싱커',mastery:75}}),'땅볼 유도형');
});
test('수비형 유격수의 예상 기여·심한 타격 부진·경쟁자·피로가 기용에 반영된다',()=>{
 const defense={role:'bat',position:'유격수',a:[50,48,53,65,90,80]},weak={...defense,a:[30,30,30,50,55,50]},balanced={...defense,a:Array(6).fill(55)};assert.ok(expectedContribution(defense).score>expectedContribution(balanced).score);assert.ok(expectedContribution(weak).score<50);assert.ok(expectedContribution(defense,{fatigue:70}).score<expectedContribution(defense).score);
 const familiar=make();familiar.adapt=1;const unadapted=rosterPlan(familiar).score;familiar.trainingState={positionFamiliarity:{'유격수':100}};assert.ok(rosterPlan(familiar).score>unadapted);
 const c=make();c.player.a.fill(68);const before=rosterPlan(c).score;c.latest={level:'major',year:2030,teams:[],players:[{...defense,id:'rival',team:0,a:Array(6).fill(92)}]};assert.ok(rosterPlan(c).score<before);assert.ok(rosterPlan(c).calendar.includes('2군'));
});
