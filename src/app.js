import {
  TEAMS,KEYS,TITLES,SAVE_KEY,LEGACY_SAVE_KEYS,HIGH_SCHOOLS,randomName,abilityCandidates,createCareer,skillCaps,trainingPlan,availableTraining,rosterPlan,coachChallenge,springEvaluation,careerScore,decideRetirementAdvice,
  injuryForecast,progress,nextYear,resolvePositionOffer,rates,emptyBat,emptyPitch,sumStats,ranking,statValue,preSeasonNationalInvitation,decideNationalInvitation,
  percentileReport,money,totalSalary,faStatus,draftAssessment,collegeEarlyStatus,enterCollege,
  runDraft,beginDraft,revealDraft,finishDraft,developmentalTryout,declareFA,deferFA,offers,sign,salaryOffer,negotiateSalary,requestTrade,
  positionOffer,changePosition,sangmuRecruitment,enlist,mandatoryEnlist,conversionOffer,convert,retire,saveCareer,loadCareer,
  overall,qualification,faGrade,faContractTerm,standings,visibleSalaryChange,teamBudget,decideTradeOffer,acknowledgeEvent,secondaryDraft,releasedSecondaryDraft,waiverCheck,advanceWaiverYear,freeAgentOffers,signFreeAgent,freeAgentTryout,hasChampionshipRing,awardSummary,canonicalAwardName,awardLine,careerRecordMarker,nationalTournamentYear,militaryOpportunities,upsertArchive,archiveSalaryTotal
} from './engine.js?v=7.5';
import {trainingOptionHtml} from './training-ui.js';
import {SEASON_PLAYBACK_STEPS,seasonPlaybackState} from './progress-display.js';

const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const validViews=['club','records','league','story','archive','help'];
let career=null,view=validViews.includes(location.hash.slice(1))?location.hash.slice(1):'club',busy=false,saveError='',recordMode='major',resultLevel='auto',chosenYear=null,playback=null,playbackTimer=null;
let startingSeed=Math.floor(Math.random()*2147483646)+1;
try {career=loadCareer();} catch(e) {saveError=e.message;}
function restoredPlayback(c){
  const saved=c?.playback;
  if(saved?.preview&&saved.pause==='injury')return saved;
  if(c)c.playback=null;
  return null;
}
playback=restoredPlayback(career);
const SETUP_KEY='charari-naega-kiunda-setup-v6';
let setup;
try{setup=JSON.parse(localStorage.getItem(SETUP_KEY)||'null')||{step:'profile',profile:null,candidates:null,selected:null,focus:[0]};}catch{setup={step:'profile',profile:null,candidates:null,selected:null,focus:[0]};}
const saveSetup=()=>localStorage.setItem(SETUP_KEY,JSON.stringify(setup));
const positions=role=>role==='bat'?['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자']:['선발','중간계투','마무리'];
const btn=(label,action,variant='primary',disabled=false)=>`<button type="button" class="${variant}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const options=(items,value)=>items.map(x=>`<option value="${esc(x)}" ${value===x?'selected':''}>${esc(x)}</option>`).join('');
const fresh=role=>role==='bat'?emptyBat():emptyPitch();
const teamName=(row)=>row.stage==='프로'?TEAMS[row.team]:row.stage==='고교'?career.player.school:row.collegeTeam||'대학 야구부';
const latest=()=>career?.history.at(-1);
function message(text){$('#notice').textContent=text;$('#notice').classList.add('show');setTimeout(()=>$('#notice').classList.remove('show'),4500);}
function navigate(target){view=target;if(location.hash.slice(1)!==target)history.pushState(null,'',`#${target}`);render();window.scrollTo(0,0);}
window.addEventListener('popstate',()=>{view=validViews.includes(location.hash.slice(1))?location.hash.slice(1):'club';render();});
const ARCHIVE_KEY='charari-naega-kiunda-careers';
function archives(){try{return JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'[]');}catch{return [];}}
function persist(){try{if(career.retired&&!career.archiveId)career.archiveId=`${career.seed}-${career.player.name}-${career.year}`;saveCareer(career);if(career.retired)localStorage.setItem(ARCHIVE_KEY,JSON.stringify(upsertArchive(archives(),career)));saveError='';}catch(e){saveError='자동 저장 실패. 저장 파일을 내보내세요.';message(saveError);}}
function confirmChoice(text){return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='confirm-dialog';dialog.setAttribute('aria-label','선택 확인');
  dialog.innerHTML=`<h2>선택 확인</h2><p>${esc(text)}</p><div class="actions"><button class="secondary" data-cancel>취소</button><button class="primary" data-confirm>확정</button></div>`;
  const finish=answer=>{dialog.close();dialog.remove();resolve(answer);};
  dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.querySelector('[data-confirm]').onclick=()=>finish(true);
  dialog.oncancel=e=>{e.preventDefault();finish(false);};document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').focus();
});}
function header(title,subtitle='',right=''){return `<div class="page-title"><div><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div>${right}</div>`;}
function shell(content){
  const c=career,p=c?.player,nav=[['club','선수'],['records','기록'],['league','리그'],['story','이력'],['archive','은퇴 순위'],['help','규칙']];

  return `<header class="site-header"><a class="brand" href="#" data-view="club"><span aria-hidden="true">⚾</span>차라리 내가 키운다</a><nav aria-label="주 메뉴">${nav.map(([key,label])=>`<button data-view="${key}" class="${view===key?'active':''}" ${view===key?'aria-current="page"':''}>${label}</button>`).join('')}</nav><div class="header-tools"><span class="save-state">${saveError?'저장 오류':c?'자동 저장':'선수 생성'}</span>${btn('내보내기','export','text',!c)}<label class="file-label">불러오기<input type="file" id="import" accept=".json,application/json"></label></div></header>
  ${c?`<section class="player-bar" aria-label="선수 상태"><div><strong>${esc(p.name)}</strong><span>${c.age}세</span><span>${c.year}년</span></div><div><b>${esc(c.playerStatus==='free_agent'?'소속 없음':c.stage==='프로'?TEAMS[p.team]:c.stage==='고교'?p.school:c.collegeTeam||'대학 야구부')}</b><span>${esc(p.position)}${c.developmental?' · 육성선수':''}</span></div><div class="health"><span>구단 신뢰도 <b>${c.clubTrust??70}/100</b></span>${c.stage==='프로'&&c.playerStatus!=='free_agent'?`<span>${c.salaryPending&&!(c.contract?.kind==='fa'&&c.contract.left>0)?'연봉 협상 대기':c.contract?.kind==='fa'&&c.contract.left>0?`FA · ${c.contract.left}년 남음`:`연봉 ${money(c.contract?.annualMan||0)}`}</span>`:''}</div></section>`:''}
  <main>${saveError?`<div class="alert" role="alert">${esc(saveError)}</div>`:''}${content}<div class="global-actions">${btn('은퇴 결정','retire','secondary',!c||c.retired)}${btn('새 선수 시작','reset','secondary')}</div></main>`;
}
function abilityList(player,before=null){return `<p><b>오버롤 ${overall(player).toFixed(1)}</b> · ${player.role==='bat'?'컨택·파워·선구 중심, 수비 포지션은 수비·송구 비중 증가':player.position==='선발'?'제구·구위·체력 중심':player.position==='마무리'?'구속·제구·구위 중심':'제구·구위·변화구 중심'}</p><div class="ability-list">${player.a.map((n,i)=>{const capped=player.potentialCaps?.[i]!==undefined&&n>=player.potentialCaps[i];return `<div class="${capped?'cap-reached':''}"><span>${KEYS[player.role][i]}</span><div class="ability-track"><i style="width:${n}%"></i></div><b>${Number(n.toFixed(1))}</b>${before?`<small class="${n>=before[i]?'up':'down'}">${n>before[i]?'+':''}${Number((n-before[i]).toFixed(1))}</small>`:''}${capped?`<small>상한 ${player.potentialCaps[i]}</small>`:''}</div>`;}).join('')}</div>`;}
function creation(){
  const p=setup.profile;
  if(setup.step==='profile')return `${header('새 선수 만들기','2027년 · 고교 3학년 · 18세',btn('랜덤 생성','random-profile','secondary'))}<section class="panel setup-card"><form id="new-form"><div class="form-grid">
    <label>이름<input name="name" maxlength="16" required value="${esc(p?.name||'')}"></label>
    <label>고교 이름<input name="school" maxlength="24" required value="${esc(p?.school||'')}"></label>
    <label>선수 구분<select name="role">${options(['타자','투수'],p?.role==='pitch'?'투수':'타자')}</select></label>
    <label>희망 포지션<select name="position">${options(positions(p?.role||'bat'),p?.position||setup.position||positions(p?.role||'bat')[0])}</select></label>
    <label>투타<select name="hand">${options(['우투우타','우투좌타','좌투좌타','우투양타'],p?.hand||'우투우타')}</select></label>
    <label>응원 구단<select name="team">${TEAMS.map((t,i)=>`<option value="${i}" ${p?.team===i?'selected':''}>${t}</option>`).join('')}</select><small>응원팀은 지명 구단을 정하지 않습니다.</small></label>
  </div><div class="actions"><button class="primary" type="submit">능력치 후보 확인 →</button></div></form></section>`;
  if(setup.step==='candidates')return `${header('능력치 후보 3명',`${esc(p.name)} · 2027년 · 18세 · 후보는 다시 추첨할 수 없습니다.`)}<div class="candidate-grid">${setup.candidates.map((candidate,i)=>`<button class="candidate ${setup.selected===i?'selected':''}" data-candidate="${i}" aria-pressed="${setup.selected===i}"><span class="candidate-index">0${i+1}</span><strong>${esc(candidate.type)}</strong><span class="candidate-overall">OVR ${overall({role:p.role,position:p.position||positions(p.role)[0],a:candidate.a}).toFixed(1)}</span>${candidate.a.map((n,j)=>`<span class="candidate-skill"><span>${KEYS[p.role][j]}</span><i><b style="width:${n}%"></b></i><em>${n}</em></span>`).join('')}</button>`).join('')}</div><div class="actions setup-actions">${btn('선택한 후보로 계속 →','candidate-next','primary',setup.selected===null)}${btn('기본 정보 수정','setup-profile','secondary')}</div>`;
  return `${header('성장 방향 결정',`${esc(p.name)} · 2027년 · 18세`)}<section class="panel setup-card"><div class="section-title"><h2>포지션</h2><span>선수 유형 · ${esc(setup.candidates[setup.selected].type)}</span></div><div class="choice-grid">${positions(p.role).map(x=>`<button class="option-tile ${(setup.position||p.position||positions(p.role)[0])===x?'selected':''}" data-position="${esc(x)}">${esc(x)}</button>`).join('')}</div><h2>고교 집중 육성</h2><p>최대 2개 능력치를 선택하세요.</p><div class="choice-grid">${KEYS[p.role].map((x,i)=>`<button class="option-tile ${setup.focus.includes(i)?'selected':''}" data-focus="${i}">${x} <strong>${setup.candidates[setup.selected].a[i]}</strong></button>`).join('')}</div><div class="actions">${btn('선수 생성 완료 →','start')}${btn('후보로 돌아가기','setup-candidates','secondary')}</div></section>`;
}
function awardSummaryHtml(rows){const entries=awardSummary(rows);return entries.length?entries.map(x=>`<span>${esc(x.name)} ${x.count}회: ${x.years.join(', ')}</span>`).join(''):'<p>주요 타이틀 없음</p>';}
function archivePanel(){
  const rows=archives().sort((a,b)=>b.score-a.score);
  return `${header('은퇴 선수 순위')}<section class="panel">${rows.length?`<ol class="archive-list">${rows.map(x=>{
    const history=x.history||x.career?.history||[],regular=history.filter(y=>y.stage==='프로'&&!y.military),post=sumStats(history.map(y=>y.postseason?.stat).filter(Boolean),x.role),titles=regular.flatMap(y=>y.awards||[]),wins=history.filter(hasChampionshipRing).length,salary=archiveSalaryTotal(x),ledger=x.salaryLedger||x.career?.salaryLedger;
    const tables=['bat','pitch'].filter(role=>regular.some(y=>y.role===role)).map(role=>{const seasons=regular.filter(y=>y.role===role),total=sumStats(seasons.map(y=>y.stat),role);return `<h4>${role==='bat'?'타격':'투구'} 시즌별 기록</h4>${statTable([{label:'통산',stat:total,total:true},...seasons.map(y=>({label:`${y.year} · ${TEAMS[y.team]||'소속 미기록'}${y.position?` · ${esc(y.position)}`:''}`,stat:y.stat}))],role)}`;}).join('');
    const minorTables=['bat','pitch'].filter(role=>regular.some(y=>y.role===role&&y.minorStat?.g)).map(role=>`<h4>${role==='bat'?'타격':'투구'} 2군 시즌별 기록</h4>${statTable(regular.filter(y=>y.role===role&&y.minorStat?.g).map(y=>({label:`${y.year} · ${TEAMS[y.team]||'소속 미기록'}`,stat:y.minorStat})),role)}`).join('');
    const salaryRows=ledger?.map(y=>`<tr><th>${y.year}</th><td>${TEAMS[y.team]||'소속 미기록'}</td><td>${money(y.salaryMan)}</td><td>${money(y.optionPaidMan||0)}</td><td>${money(y.allowanceMan||0)}</td></tr>`).join('');
    return `<li><details><summary><b>${esc(x.name)}</b> · ${esc(x.position)} · ${x.seasons}시즌 <strong>${x.score}점</strong></summary><p>통산 ${regular.reduce((n,y)=>n+(y.stat?.g||0),0)}경기 · 포스트시즌 ${post.g}경기 · 우승 반지 ${wins}개</p><p>타이틀 ${titles.length}개 · 누적 기본 연봉 ${salary===null?'미기록':money(salary)}</p><p>계약금 ${Number.isFinite(x.signingIncome)?money(x.signingIncome):'미기록'} · 성과 옵션·군 보류수당은 기본 연봉에서 제외</p>${x.legacySalaryYears?`<p>구버전 ${x.legacySalaryYears}시즌 연봉 미기록</p>`:''}<div class="awards">${awardSummaryHtml(regular)}</div>${tables||'<p>프로 시즌 기록 없음</p>'}${minorTables}${ledger?`<h4>시즌별 연봉 지급</h4><div class="table-scroll"><table><thead><tr><th>시즌</th><th>구단</th><th>기본 연봉</th><th>옵션</th><th>군 보류수당</th></tr></thead><tbody>${salaryRows}</tbody></table></div>`:'<p>기존 은퇴 보관 기록에는 시즌별 연봉이 없어 합산할 수 없습니다.</p>'}</details></li>`;
  }).join('')}</ol>`:'<p>은퇴 선수 기록 없음</p>'}</section>`;
}
const batColumns=[['g','경기'],['pa','타석'],['ab','타수'],['h','안타'],['d','2루타'],['t','3루타'],['hr','홈런'],['rbi','타점'],['r','득점'],['bb','볼넷'],['k','삼진'],['sb','도루'],['sba','도루 시도'],['cs','도루 실패'],['sf','희비'],['e','실책'],['avg','타율'],['obp','출루율'],['slg','장타율'],['ops','OPS']];
const pitchColumns=[['g','경기'],['gs','선발'],['outs','이닝'],['w','승'],['l','패'],['sv','세이브'],['hold','홀드'],['k','탈삼진'],['bb','볼넷'],['h','피안타'],['hr','피홈런'],['r','실점'],['er','자책'],['era','ERA'],['whip','WHIP']];
function displayStat(s,role,key){
  if(!s)return '—';
  if(key==='outs')return `${Math.floor(s.outs/3)}.${s.outs%3}`;
  if(['avg','obp','slg','ops'].includes(key))return s.ab?statValue(s,role,key).toFixed(3):'—';
  if(key==='winPct')return s.w>=10?statValue(s,role,key).toFixed(3):'—';
  if(['era','whip','k9','bb9'].includes(key))return s.outs?statValue(s,role,key).toFixed(2):'—';
  if(['bbRate','kRate'].includes(key))return s.pa?`${(statValue(s,role,key)*100).toFixed(1)}%`:'—';
  return s[key]??0;
}
function statTable(rows,role){const cols=role==='bat'?batColumns:pitchColumns;return `<div class="table-scroll" tabindex="0" aria-label="${role==='bat'?'타격':'투구'} 기록 표"><table><thead><tr><th>시즌 / 소속</th>${cols.map(([,name])=>`<th>${name}</th>`).join('')}</tr></thead><tbody>${rows.map(x=>`<tr class="${x.total?'total':''}"><th>${esc(x.label)}</th>${cols.map(([k])=>`<td>${k==='e'&&x.defenseUnrecorded?'—':displayStat(x.stat,role,k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function metrics(stat,role,position,row=null){
  row??=career?.history.find(x=>x.stat===stat&&x.stage==='프로');
  const roleStat=position==='마무리'?['sv','세이브']:position==='중간계투'?['hold','홀드']:['w','승'];
  const columns=role==='bat'?[['avg','타율'],['obp','출루율'],['slg','장타율'],['ops','OPS'],['h','안타'],['hr','홈런'],['rbi','타점'],['r','득점'],['sb','도루']]:[['era','ERA'],['whip','WHIP'],['k9','K/9'],['bb9','BB/9'],roleStat,['l','패'],['k','탈삼진'],['g','경기'],['outs','이닝']];
  const prior=row?career.history.filter(x=>x.stage==='프로'&&!x.military&&x.year<row.year&&x.role===role&&x.stat?.g>0):[];
  return `<div class="metrics season-metrics">${columns.map(([key,name],i)=>{const current=statValue(stat,role,key),values=prior.map(x=>statValue(x.stat,role,key)),qualified=stat.g>0&&(!['avg','obp','slg','ops','era','whip','k9','bb9'].includes(key)||(role==='bat'?stat.pa>=qualification(144,'bat')*.25:stat.outs>=qualification(144,'pitch')*.25)),marker=qualified?careerRecordMarker(key,current,values):'';const high=marker==='CH',worst=marker==='CL';return `<div class="${i<4?'rate-stat':'count-stat'}"><span>${name}${high?'<em class="career-high">CH</em>':worst?'<em class="career-low">CL</em>':''}</span><strong>${displayStat(stat,role,key)}</strong></div>`;}).join('')}</div>`;
}
function color(percent){if(percent===null)return '#9ca3af';const p=percent/100;return p<.5?`rgb(${Math.round(50+p*340)},${Math.round(80+p*290)},240)`:`rgb(235,${Math.round(225-(p-.5)*350)},${Math.round(240-(p-.5)*390)})`;}
function percentileChart(league,role){
  const data=percentileReport(league,role),mine=league?.players.find(p=>p.id==='user'&&p.role===role);
  if(!data.length)return `<div class="empty small-empty">비교할 출장 기록이 없습니다.</div>`;
  const population=role==='bat'?'타자':'투수';
  return `<section class="panel percentile-panel"><div class="section-title"><h2>${league.year} 시즌 백분위</h2><span>${league.level==='major'?'1군':league.level==='minor'?'2군':'아마추어'}</span></div>
  <div class="percentile-legend"><span><i class="blue"></i>낮음</span><span>50 · 중간</span><span><i class="red"></i>높음</span></div><p class="qualification-flag">${role==='bat'?'규정타석':'규정이닝'} 대비 ${data[0].qualification} 집단 · ${role==='bat'?mine.stat.pa+'타석':displayStat(mine.stat,role,'outs')+'이닝'} · 비교 선수 ${data[0].count}명</p>
  <div class="percentile-grid">${data.map(d=>{const n=d.percentile===null?null:Math.round(d.percentile);return `<article class="percentile-cell" aria-label="${d.label}: 백분위 ${n} · 기록 ${displayStat(mine.stat,role,d.key)}"><div class="percentile-label"><h3>${d.label}</h3><span>${displayStat(mine.stat,role,d.key)}</span></div><div class="percentile-axis"><span class="axis-dot start"></span><span class="axis-dot middle"></span><span class="axis-dot end"></span><span class="percentile-marker" style="left:${d.percentile}%;background:${color(d.percentile)};color:${n>35&&n<65?'#20232a':'white'}">${n}</span></div><div class="axis-labels"><span>0</span><span>50</span><span>100</span></div></article>`;}).join('')}</div>
  <p class="chart-note">같은 리그 ${population} 중 같은 표본 집단과 더 많이 출장한 집단을 비교합니다. 100이 최상위이며 ERA·WHIP·BB/9·타자 삼진%는 낮을수록 좋습니다. 누적 기록은 출장량의 영향을 받습니다.</p></section>`;
}
function scoutPanel(){const s=draftAssessment(career);return `<section class="panel scout-panel"><div class="section-title"><h2>드래프트 전망</h2><span>${s.provisional?'표본 부족 · 잠정 평가':'최근 아마추어 성적 반영'}</span></div><div class="scout-numbers"><div><span>지명 확률</span><strong>${Math.round(s.probability*100)}<small>%</small></strong></div><div><span>예상 라운드</span><strong>${s.roundLow}–${s.roundHigh}<small>라운드</small></strong></div></div><p>성적·출장량·능력·나이를 반영한 게임 내 추정치입니다. 미지명될 수 있습니다.</p></section>`;}
function contractPanel(){
  const c=career,fa=faStatus(c),term=faContractTerm(c),active=term?.active;
  const past=active?null:(c.contractHistory||[]).filter(x=>x.kind==='fa').at(-1)||c.lastContract;
  const progress=active?`<div class="fa-progress"><span>FA 계약 진행 <b>${term.elapsed} / ${term.years}년</b></span><div class="ability-track"><i style="width:${term.elapsed/term.years*100}%"></i></div><small>계약 기간 ${c.contract.startYear??c.lastContract?.year}–${c.contract.endYear??(c.lastContract?.year||c.year)+term.years-1} · 남은 ${term.remaining}시즌</small></div>`:'';
  const missingDays=Math.max(0,(fa.required-fa.seasons)*145-fa.partialDays);
  const eligibility=`<div class="fa-progress"><span>FA ${c.faCount?'재취득':'최초 취득'} <b>${fa.seasons}/${fa.required}시즌</b></span><div class="ability-track"><i style="width:${Math.min(100,fa.seasons/fa.required*100)}%"></i></div><small>미달 등록일 합산 ${fa.partialDays}/145일 · 자격까지 최소 ${missingDays}일${fa.contractBlocked?' · 계약 종료 후 행사 가능':''}</small></div>`;
  const expiredFa=c.contract?.kind==='fa'&&!active;
  const salaryType=active?'FA 계약 연봉':expiredFa?'종료된 FA 계약의 마지막 연봉':c.salaryPending?'직전 시즌 연봉 · 협상 전':'보류선수 단년 연봉';
  const salaryYear=expiredFa?c.contract.endYear??c.year-1:c.salaryPending?c.year-1:c.year;
  return `<section class="panel"><div class="section-title"><h2>계약 기록</h2><span>${active?'FA 계약':'구단 보류'}</span></div><div class="money-primary">${money(c.contract?.annualMan||0)}<small>${salaryType} · ${salaryYear}시즌</small></div>${active?`<p>${term.years}년 최대 ${money(c.contract.totalMan)} · 보장 ${money(c.contract.guaranteedMan)}</p>`:''}${progress}${past?`<p>지난 FA 계약 · ${past.startYear??past.year}–${past.endYear??(past.year+past.years-1)}시즌 · ${past.years}년 종료</p>`:''}${eligibility}<dl class="compact-info"><div><dt>지급받은 총 연봉</dt><dd>${money(totalSalary(c))}</dd></div><div><dt>받은 계약금</dt><dd>${money(c.signingIncome)}</dd></div></dl>${active&&c.contract?.options?.length?`<div class="contract-options">${c.contract.options.map(rule=>{const completed=c.salaryLedger.at(-1)?.optionResults?.find(x=>x.key===rule.key&&x.target===rule.target);return `<p>${rule.label} · ${money(rule.amountMan)} · ${completed?completed.earned?'달성':'미달':'시즌 종료 후 판정'}</p>`;}).join('')}</div>`:''}${c.legacySalaryYears?`<p class="notice-line">구버전 ${c.legacySalaryYears}시즌 연봉 미기록. 총액은 v2 기록부터 합산합니다.</p>`:''}</section>`;
}
function salaryPanel(){
  const c=career,term=faContractTerm(c),active=term?.active,pending=c.salaryPending&&!active,decision=c.salaryDecision?.year===c.year?c.salaryDecision:null;
  const old=c.contract?.annualMan||3300,base=pending?salaryOffer(c):old,change=visibleSalaryChange(old,base);
  const trade=c.tradeRequestYear===c.year?btn(c.tradeDecision?.outcome==='수락'?'이적 완료':'제안 없음','trade-request','secondary',true):btn('트레이드 요청','trade-request','secondary',!!c.service||c.proYears<2);
  const actions=active?`<div class="salary-actions single">${trade}</div>`:`<div class="salary-actions">${btn('수락','salary-accept','primary',!pending)}${decision?.renegotiated?`<button type="button" class="secondary ${decision.accepted?'result-success':'result-failure'}" disabled>${decision.accepted?'성공':'실패'}</button>`:btn('재협상','salary-counter','secondary',!pending)}${trade}</div>`;
  const finalized=decision?visibleSalaryChange(decision.oldMan,decision.annualMan):null;
  const salaryDelta=x=>x.kind==='동결'?'동결':`${money(Math.abs(x.new-x.old))} ${x.kind} · ${x.rate.toFixed(1)}% ${x.kind}`;
  const summary=active?`<h2>FA 연봉: ${money(old)}</h2>`:pending?`<h2>연봉 협상</h2><p>현재 연봉 <b>${money(old)}</b> → 구단 제안 <b>${money(base)}</b> · <span class="salary-change ${change.kind==='인상'?'raise':change.kind==='삭감'?'cut':''}">${salaryDelta(change)}</span></p>`:`<h2>연봉 ${money(old)}</h2><p>${decision?`확정 · ${money(decision.oldMan)} → ${money(decision.annualMan)} · <span class="salary-change ${finalized.kind==='인상'?'raise':finalized.kind==='삭감'?'cut':''}">${salaryDelta(finalized)}</span> · ${decision.year}시즌 보류선수 연봉`:'이번 시즌 연봉'}</p>`;
  return `<section class="panel salary-panel"><div class="salary-content">${summary}</div>${actions}</section>`;
}
function trainingPanel(){
  const c=career,plan=trainingPlan(availableTraining(c));
  const task=c.coachChallenge?.year===c.year?`<div class="coach-task"><strong>코치 성장 과제</strong><span>${KEYS[c.player.role][c.coachChallenge.index]} ${c.coachChallenge.target.toFixed(1)} 달성 시 다음 시즌 출전 기회 확대</span></div>`:'';
  return `<section class="panel training-panel"><div class="section-title"><h2>훈련 중점</h2><span>${c.servicePath==='regular'&&c.service===2?'현역 복무 중 선택 불가':`${plan.selected.length} / 2개 선택`}</span></div>${task}${c.servicePath==='regular'&&c.service===2?'<p>현역 복무 중에는 구단 훈련을 진행하지 않습니다.</p>':`<div class="training-grid">${KEYS[c.player.role].map((name,i)=>trainingOptionHtml(name,i,c.player.a[i],c.potentialCaps?.[i],plan.selected.includes(i),plan.hoursEach)).join('')}</div>`}<div class="training-footer">${btn('시즌 진행 화면으로','begin-season','primary',busy)}</div></section>`;
}
function rosterStateClass(state){return state==='1군'?'state-major':state==='2군'?'state-minor':state==='복무'||state==='상무'?'state-service':state==='재활군'?'state-rehab':'state-neutral';}
function seasonPanel(){const c=career,league=c.stage==='프로'?'KBO':c.stage==='고교'?'고교야구':'대학야구';return `<section class="panel season-gate"><h2>${league} ${c.year}년 시즌</h2><p>포지션: ${esc(c.player.position)}</p><p>주력 분야: ${availableTraining(c).map(i=>KEYS[c.player.role][i]).join(' · ')||'선택 없음'}</p>${c.stage==='프로'?`<p class="opening-roster">개막 로스터: <b>${rosterPlan(c).opening}</b></p>`:''}<div class="actions">${btn('시즌 진행','simulate')}${btn('준비로 돌아가기','back-prepare','secondary')}</div></section>`;}
function playbackPanel(){
  const c=career,calendar=c.stage==='프로'?rosterPlan(c,injuryForecast(c)).calendar:null,percent=Math.round(playback.step/playback.limit*100),day=Math.floor((calendar?.length||188)*percent/100);
  const months=c.stage==='프로'?['4월','5월','6월','7월','8월','9월','10월']:c.stage==='고교'?['전반기','황금사자기','후반기','청룡기','대통령배','봉황대기']:['U-리그','대통령기','전국선수권','왕중왕전'];
  const current=months[Math.min(months.length-1,Math.floor(percent/100*months.length))],status=playback.preview?'부상 시점 미리보기 · 재활 결정 대기':playback.computing?'시즌 기록 계산 중 · 진행 장면 재생':'시즌 기록 계산 완료 · 진행 장면 재생';
  return `<section class="panel season-playback" aria-live="polite"><span class="eyebrow">${c.stage==='프로'?'KBO 정규시즌':c.stage==='고교'?'고교야구':'대학야구'} · ${c.year}</span><h1>${c.year} 시즌 진행</h1><p>${esc(c.player.name)} · ${esc(c.player.position)} · 장면 ${percent}%</p><p>${status}</p><div class="season-months">${months.map(x=>`<span>${x}</span>`).join('')}</div><div class="roster-track" role="progressbar" aria-label="시즌 진행 장면" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="roster-segments">${calendar?calendar.slice(0,day).map(x=>`<span class="${rosterStateClass(x)}" style="width:${100/(calendar.length||188)}%"></span>`).join(''):`<span class="${c.service?'state-service':'state-major'}" style="width:${percent}%"></span>`}</div></div>${calendar?`<p><b>1군 등록 ${calendar.slice(0,day).filter(x=>x==='1군').length}일</b> · 현재 ${calendar[Math.max(0,day-1)]||'개막 전'}</p>`:`<p>${current}</p>`}</section>${playback.pause==='injury'?incidentPanel():''}`;
}
function startInjuryPreview(){
  const day=injuryForecast(career)?.startDay||1;
  playback={step:Math.max(1,Math.round(day/188*24)),limit:24,preview:true,pause:'injury',computing:false};
  career.playback=playback;persist();render();window.scrollTo(0,0);
}
function startSeasonCalculation(){
  clearInterval(playbackTimer);
  busy=true;playback={step:0,limit:SEASON_PLAYBACK_STEPS,preview:false,pause:null,computing:true};career.playback=playback;persist();render();window.scrollTo(0,0);
  const started=performance.now();let completedCareer=null;
  const finish=candidate=>{clearInterval(playbackTimer);playbackTimer=null;career=candidate;career.playback=null;playback=null;busy=false;resultLevel='auto';chosenYear=null;persist();render();window.scrollTo(0,0);};
  const fail=error=>{clearInterval(playbackTimer);playbackTimer=null;career.playback=null;playback=null;busy=false;persist();render();message(error.message||String(error));};
  const tick=()=>{
    if(!playback)return;
    const state=seasonPlaybackState(performance.now()-started,Boolean(completedCareer));
    if(state.ready){finish(completedCareer);return;}
    if(state.step>playback.step){playback.step=state.step;render();}
  };
  const calculated=candidate=>{completedCareer=candidate;playback.computing=false;tick();if(playback)render();};
  playbackTimer=setInterval(tick,50);
  if(typeof Worker==='undefined'){
    setTimeout(()=>{try{const candidate=structuredClone(career);progress(candidate,career.pendingTraining||career.training);calculated(candidate);}catch(error){fail(error);}},0);return;
  }
  let worker;
  try{
    worker=new Worker(new URL('./season-worker.js?v=7.6',import.meta.url),{type:'module'});
    worker.onmessage=event=>{
      worker.terminate();if(event.data.type==='done')calculated(event.data.career);else fail(Error(event.data.message||'시즌 계산 실패'));
    };
    worker.onerror=event=>{worker.terminate();fail(Error(event.message||'시즌 계산 실패'));};
    worker.postMessage({career,training:career.pendingTraining||career.training});
  }catch(error){worker?.terminate();fail(error);}
}
function preparePanel(){
  const c=career,p=c.player,roster=rosterPlan(c),recruit=sangmuRecruitment(c),conversion=conversionOffer(c);
  let info=c.stage==='프로'?`<section class="panel role-panel"><h2>개막 로스터</h2><strong class="role-name">${roster.opening==='1군'&&!c.service?'1군':'2군'}</strong></section>`:'';
  return `${!c.served&&!c.service&&c.stage!=='고교'?`<details class="panel management-panel" open><summary>병역 <span>${c.athleticTried===c.year?'상무 지원 완료':'입대 계획'}</span></summary><div class="two-columns">${c.age>27?'<p>상무 지원 가능 연령을 넘겨 현역 복무가 필요합니다.</p>':`<article class="choice"><h3>상무</h3><div class="choice-number">${recruit.slots}<small>명 · ${p.role==='bat'?'야수':'투수'} 모집</small></div><p>${recruit.eligible?`지원 가능`:'지원 조건: 만 27세 이하 · 프로 1시즌 이상'}${recruit.alreadyApplied?'<br>올해 재지원 불가. 현역 입대는 선택 가능합니다.':''}</p>${btn('상무 지원','athletic','secondary',!recruit.eligible||!recruit.slots||recruit.alreadyApplied)}</article>`}<article class="choice"><h3>현역</h3><div class="choice-number">2<small>시즌</small></div><p>선발 절차 없음 · 공식 경기 없음</p>${btn('현역 입대','military','secondary')}</article></div><p class="military-opportunities">27세 시즌까지 남은 아시안게임 금메달 기회 · ${militaryOpportunities(c).map(x=>`${x.year} ${x.name} (${x.age}세)`).join(' / ')||'없음'}</p></details>`:''}${c.stage==='프로'?`<div class="salary-roster">${salaryPanel()}${info}</div>`:''}${trainingPanel()}<div class="two-columns"><section class="panel"><div class="section-title"><h2>능력치</h2><span>${esc(p.type)}</span></div>${c.history.at(-1)?.year===c.year-1&&c.history.at(-1)?.overallBefore!==undefined?`<p>지난 시즌 오버롤 ${c.history.at(-1).overallBefore.toFixed(1)} → ${c.history.at(-1).overall.toFixed(1)} (${c.history.at(-1).overall-c.history.at(-1).overallBefore>0?'+':''}${(c.history.at(-1).overall-c.history.at(-1).overallBefore).toFixed(1)})</p>`:''}${abilityList({...p,potentialCaps:c.potentialCaps})}</section>${c.stage==='프로'?contractPanel():`<section class="panel"><h2>진로</h2><dl class="compact-info"><div><dt>소속</dt><dd>${esc(c.stage==='대학'?c.collegeTeam:c.player.school)}</dd></div>${c.stage==='대학'?`<div><dt>대학 시즌</dt><dd>${c.collegeSeasons} / 4시즌 완료</dd></div>`:''}</dl><p>${c.stage==='고교'?'시즌 종료 후 드래프트 참가 또는 대학 진학.':'2학년 시즌을 마치면 얼리드래프트 참가를 선택할 수 있습니다. 4시즌 이수 시 대졸 FA 기준을 적용합니다.'}</p></section>`}</div>
  ${conversion?`<section class="panel warning"><h2>전향 제안 · ${conversion.target}</h2><p>${conversion.reason}</p><p>${p.role==='bat'?'송구→구속, 선구의 70%→제구. 변화구 30부터 시작.':'제구의 70%→컨택, 구속의 65%→파워. 선구 35부터 시작.'} 적응 2시즌 · 성공 보장 없음 · 이전 기록 보존</p><div class="actions">${btn('전향','convert','secondary')}${btn('거절','decline-convert','text')}</div></section>`:''}
  `;
}
function pathPanel(){const c=career,attempted=c.draftAttempts.some(x=>x.year===c.year);return `${scoutPanel()}<section class="panel"><h2>고교 졸업 후 진로</h2><div class="two-columns"><article class="choice"><h3>신인 드래프트</h3><p>지명 구단으로 입단합니다.<br>구단 선택 불가 · 미지명 가능</p>${btn(attempted?'올해 미지명':'드래프트 참가','draft','primary',attempted)}${attempted?btn('육성 입단 테스트','tryout','secondary'):''}</article><article class="choice"><h3>대학 진학</h3><p>4시즌 이수 · 대졸 FA 인정 7시즌<br>2학년 수료 시 얼리드래프트 선택 가능</p>${btn('대학 진학','college','secondary')}</article></div></section>`;}
function draftResultPanel(){const d=career.lastDraft;return `<section class="panel draft-result"><span class="eyebrow">드래프트 결과</span><h2>${d.selected?TEAMS[d.team]:'미지명'}</h2>${d.selected?`<strong>${d.round}라운드 <span>전체 ${d.pick}순위</span></strong><div class="metrics"><div><span>연봉</span><strong>${money(career.contract.annualMan)}</strong></div><div><span>계약금</span><strong>${money(d.bonusMan)}</strong></div></div>`:`<p>${d.kind==='early'?'대학에 남아 다음 시즌을 준비합니다.':'대학 진학 또는 육성 입단 테스트를 선택할 수 있습니다.'}</p>`}${btn('확인','finish-draft')}</section>`;}
function faPanel(){const fa=faStatus(career),row=career.history.filter(x=>x.stage==='프로'&&!x.military).at(-1),p=career.player,projected=offers(career,true),best=projected.reduce((a,b)=>!a||b.guaranteedMan>a.guaranteedMan?b:a,null),stay=salaryOffer(career),recommended=best&&best.guaranteedMan/best.years>=stay*1.15;return `<section class="panel"><span class="eyebrow">FA 자격 획득 · ${career.age}세</span><h2>FA 권리 행사</h2><div class="scout-numbers"><div><span>인정 시즌</span><strong>${fa.seasons}<small>/ ${fa.required}</small></strong></div></div>${row?`<p>최근 시즌 · ${row.stat.g}경기 · ${p.role==='pitch'?`ERA ${displayStat(row.stat,'pitch','era')} · ${row.stat.k}탈삼진`:`타율 ${displayStat(row.stat,'bat','avg')} · ${row.stat.h}안타`}</p>`:''}<p><b>${recommended?'선언 권장':'선언 비권장'}</b> · 예상 최고 보장 ${best?money(best.guaranteedMan):'미확인'} / ${best?.years||0}년 · 미선언 예상 연봉 ${money(stay)}</p><div class="actions">${btn('FA 선언','declare-fa')}${btn('권리 유보','defer-fa','secondary')}</div></section>`;}
function marketPanel(){return `<section class="panel"><div class="section-title"><h2>FA 제안</h2><span>선수 FA ${faGrade(career)}등급 · 게임 내 급여 추정 순위</span></div><div class="offer-grid">${offers(career).map((o,i)=>`<article class="offer"><h3>${TEAMS[o.team]}</h3><strong>최대 가능 ${money(o.totalMan)}</strong><p>${o.years}년</p><dl class="compact-info"><div><dt>보장 총액</dt><dd>${money(o.guaranteedMan)}</dd></div><div><dt>기본 연봉</dt><dd>${money(o.annualMan)}</dd></div><div><dt>계약금</dt><dd>${money(o.signingBonusMan)}</dd></div><div><dt>성과 옵션 최대</dt><dd>${money(o.optionMan)}</dd></div><div><dt>구단 전력</dt><dd>${o.power} / 100</dd></div></dl>${o.options.map(rule=>`<p>${rule.label} 시 시즌마다 ${money(rule.amountMan)} 지급</p>`).join('')}${btn('계약','sign:'+i)}</article>`).join('')}</div><p class="chart-note">보상선수·보상금은 구단 간 절차입니다. 제안은 선수에게 지급되는 계약금과 조건만 보여줍니다.</p></section>`;}
function contractResultPanel(){const o=career.lastContract;return `<section class="panel contract-result"><span class="eyebrow">FA 계약 체결</span><h2>${TEAMS[o.team]}</h2><p>${o.oldTeam!==o.team?`${TEAMS[o.oldTeam]} → ${TEAMS[o.team]} 이적`:'원소속팀과 재계약'}</p><div class="contract-values"><div><span>계약 기간</span><strong>${o.years}년</strong></div><div><span>보장액</span><strong>${money(o.guaranteedMan)}</strong></div><div><span>조건부 옵션</span><strong>${money(o.optionMan)}</strong></div><div><span>최대 총액</span><strong>${money(o.totalMan)}</strong></div></div>${o.options.map(x=>`<p>${esc(x.label)} 달성 시 시즌마다 ${money(x.amountMan)}</p>`).join('')}${btn('스토브리그로 이동 →','contract-continue')}</section>`;}
function incidentPanel(){const injury=injuryForecast(career);return `<section class="panel major-event" role="alertdialog" aria-modal="true"><h2>${injury?.body} ${injury?.name}</h2><p>${injury?.severity} · 예상 재활 ${injury?.days||0}일</p><div class="two-columns"><article class="choice"><h3>충분한 재활</h3><p>재활 +14일 · 재발 위험 감소 · 복귀 후 2군 조정</p>${btn('충분한 재활','rehab:safe')}</article><article class="choice"><h3>조기 복귀</h3><p>재활 −10일 · 재발 위험과 경기력 저하 증가</p>${btn('조기 복귀','rehab:fast','secondary')}</article></div></section>`;}
function availableLevels(row){const list=[];if(row?.league&&row.stat?.g>0)list.push({key:'major',label:row.stage==='프로'?'1군':row.stage,league:row.league,stat:row.stat});if(row?.minorLeague&&row.minorStat?.g>0)list.push({key:'minor',label:row.military?'상무 · 2군':'2군',league:row.minorLeague,stat:row.minorStat});return list;}
function activeResult(row){const levels=availableLevels(row);return levels.find(x=>x.key===resultLevel)||levels.find(x=>x.stat?.g>0)||levels[0]||null;}
function levelTabs(row){return `<div class="segment">${availableLevels(row).map(x=>`<button data-result-level="${x.key}" class="${activeResult(row)?.key===x.key?'selected':''}">${x.label} <b>${x.stat.g}경기</b></button>`).join('')}</div>`;}
function leaderboards(league,role,compact=false){
  let specs=[...TITLES,['OPS','bat','ops',true],['WHIP','pitch','whip',true],['K/9','pitch','k9',true],['BB/9','pitch','bb9',true],['패배','pitch','l',false],['경기','pitch','g',false],['이닝','pitch','outs',false],['실책 (많은 순)','bat','e',false]].filter(x=>x[1]===role);
  if(compact)specs=specs.filter(x=>role==='bat'?['avg','obp','rbi','hr','sb','ops'].includes(x[2]):['w','era','k','sv','hold','whip'].includes(x[2]));
  const metricNames={avg:'타율',h:'안타',slg:'장타율',hr:'홈런',rbi:'타점',r:'득점',sb:'도루',obp:'출루율',era:'평균자책점',w:'승리',k:'탈삼진',sv:'세이브',hold:'홀드',winPct:'승률'};
  return `<div class="leaders">${specs.map(([name,,key,qualified])=>{
    const official=league.level==='major'&&qualified,rows=ranking(league,role,key,official),mine=rows.find(x=>x.id==='user'),lower=['era','whip','bb9'].includes(key);
    const rank=p=>1+rows.filter(x=>lower?x.value<p.value:x.value>p.value).length;
    const winner=league.awards?.find(x=>x.title===name);
    const user=league.players.find(p=>p.id==='user'&&p.role===role),required=qualification(league.teams?.find(t=>t.id===user?.team)?.g??league.games,role),actual=role==='bat'?user?.stat.pa:user?.stat.outs;
    return `<article class="leader-card"><div><h3>${metricNames[key]||name}</h3><small>${key==='e'?'수비 기록':league.level==='major'&&TITLES.some(x=>x[0]===name)?'시즌 타이틀':'기록 순위'}</small></div><ol>${rows.slice(0,3).map(p=>`<li class="${p.id==='user'?'mine':''}"><span>${rank(p)}</span><b>${esc(p.name)}<small>${esc(league.teams.find(t=>t.id===p.team)?.name)}</small></b><strong>${displayStat(p.stat,role,key)}</strong></li>`).join('')||'<li>규정 충족 선수 없음</li>'}</ol><p>내 순위 <b>${mine?`${rank(mine)}위 · ${displayStat(mine.stat,role,key)}`:user?`참고 기록 ${displayStat(user.stat,role,key)} · ${league.level==='major'?'공식 자격 미달':'해당 없음'}`:'출장 없음'}</b></p><small>${key==='winPct'?'10승 이상 · 규정이닝 불필요':official?role==='bat'?`${required}타석 이상 · 현재 ${actual||0}타석`:`${required/3}이닝 이상 · 현재 ${Math.floor((actual||0)/3)}.${(actual||0)%3}이닝`:'출장 선수 전체'}${winner?.winners.length>1?` · 공동 수상 ${winner.winners.length}명`:''}</small></article>`;
  }).join('')}</div>`;
}
function internationalPanel(row){
 if(row.stage!=='프로')return '';
 const names=['WBC','아시안게임','프리미어12'].filter(name=>nationalTournamentYear(row.year,name));
 if(!names.length)return '';
 return `<section class="panel international-summary"><h2>국제대회 결과</h2>${names.map(name=>{
  const team=row.tournamentResults?.find(x=>x.name===name);
  const personal=career.nationalHistory.find(x=>x.year===row.year&&x.name===name)||row.international?.find(x=>x.name===name);
  const detail=personal?.declined?'국가대표 초청 거절':!personal?.selected?'국가대표 미선발':personal.appeared===false?'국가대표 선발 · 개인 경기 미출장':personal.appeared===true?`국가대표 선발 · 개인 ${personal.stat.g}경기 · ${row.role==='bat'?`${personal.stat.h}안타 · ${personal.stat.hr}홈런 · 타율 ${displayStat(personal.stat,'bat','avg')}`:`${displayStat(personal.stat,'pitch','outs')}이닝 · ERA ${displayStat(personal.stat,'pitch','era')} · ${personal.stat.k}삼진`}`:'국가대표 선발 · 개인 기록 미기록';
  return `<p><b>${esc(name)} · 대한민국 ${esc(team?.result||'결과 미기록')}</b><br>${detail}</p>`;
 }).join('')}</section>`;
}
function resultPanel(row){
  const selected=activeResult(row);
  return `<section class="result-hero"><span>${row.year} · ${row.stage} ${row.stage==='대학'?`${career.collegeSeasons}학년`:''}</span><h2>${row.year} 시즌 결과</h2><p>${esc(teamName(row))} · ${row.age}세 · ${esc(row.position)} · ${esc(row.level)}</p></section><section class="panel result-summary"><div class="section-title"><h2>개인 기록</h2><span>${esc(row.level)}</span></div>${levelTabs(row)}${selected?metrics(selected.stat,row.role,row.position):'<p>현역 복무 · 공식 경기 기록 없음</p>'}${(selected?.league||row.league)?(()=>{const t=standings(selected?.league||row.league).find(x=>x.id===row.team);return t?`<div class="result-facts team-result"><span>${row.military&&!selected?'보류 소속 구단 · ':''}${esc(t.name)} <b>${t.rank}위</b></span><span>${t.g}경기 <b>${t.w}승 ${t.l}패 ${t.tie}무</b></span><span>승률 <b>${t.pct.toFixed(3)}</b></span></div>`:'';})():''}${selected?`<p>${selected.stat.g}경기${row.role==='bat'?` · ${selected.stat.pa}타석`:` · ${selected.stat.gs}선발 · ${displayStat(selected.stat,row.role,'outs')}이닝`} · 팀 ${selected.league.teams.find(x=>x.id===row.team)?.g||0}경기</p>`:''}${row.stage!=='프로'&&selected?.league.competitions?`<p>대회: ${Object.entries(selected.league.teams.find(x=>x.id===row.team)?.competitions||{}).map(([name,v])=>`${name} ${v.g}경기`).join(' · ')}</p>`:''}<div class="result-facts">${row.stage==='프로'?`<span>${row.registrationEstimated?'추정 등록':'1군 등록'} <b>${row.registeredDays||0}일</b></span><span>지급 연봉 <b>${money(row.salaryMan)}</b></span><span>성과 옵션 지급 <b>${row.optionResults?money(row.optionResults.reduce((n,x)=>n+x.paidMan,0)):'미기록'}</b></span>`:''}${row.military?`<span>군 보류수당 <b>${money(row.allowanceMan||0)}</b></span>`:''}<span>오버롤 <b>${row.overallBefore===undefined?'미기록':`${row.overallBefore.toFixed(1)} → `}${row.overall?.toFixed(1)|| (row.aAfter?overall({a:row.aAfter,role:row.role,position:row.position}).toFixed(1):'미기록')}${row.overallBefore===undefined?'':` (${row.overall-row.overallBefore>0?'+':''}${(row.overall-row.overallBefore).toFixed(1)})`}</b></span><span>구단 신뢰도 <b>${row.trust??'미기록'}/100</b></span></div>${row.trustChanges?.length?`<p>구단 신뢰도 변경: ${row.trustChanges.map(x=>`${esc(x.reason)} ${x.delta>0?'+':''}${x.delta}`).join(' · ')}</p>`:''}${row.awards.length?`<div class="awards"><span>${esc(awardLine(row.awards))}</span></div>`:''}${row.report?.length?`<ul class="report-list">${row.report.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${row.rosterMoves?.length?`<details><summary>1·2군 이동 기록 ${row.rosterMoves.length}건</summary>${row.rosterMoves.map(x=>`<p>${x.gameDay}번째 경기 전 · ${x.from} → ${x.to} · ${x.reason}</p>`).join('')}</details>`:''}<div class="actions">${btn(row.stage==='고교'?'진로 선택 →':row.stage==='대학'?'다음 단계 →':'다음 →','next')}${btn('전체 기록','records','secondary')}</div></section>
  ${internationalPanel(row)}
  ${row.postseason?`<section class="panel postseason-summary ${hasChampionshipRing(row)?'champion':''}"><h2>${row.postseason.regularRank>5?'포스트시즌 미진출':hasChampionshipRing(row)?'한국시리즈 우승!':'포스트시즌 결과'}</h2><p>정규시즌 ${row.postseason.regularRank}위 → 최종 ${row.postseason.finalRank}위${row.postseason.regularRank<=5?` · 우승팀 ${TEAMS[row.postseason.champion]}`:''}</p>${row.postseason.selected?`<p>${row.role==='bat'?`타율 ${displayStat(row.postseason.stat,'bat','avg')} · 안타 ${row.postseason.stat.h} · 홈런 ${row.postseason.stat.hr}`:`이닝 ${displayStat(row.postseason.stat,'pitch','outs')} · ERA ${displayStat(row.postseason.stat,'pitch','era')} · ${row.position==='마무리'?'세이브 '+row.postseason.stat.sv:row.position==='중간계투'?'홀드 '+row.postseason.stat.hold:'승 '+row.postseason.stat.w}`}</p>`:row.postseason.regularRank<=5?'<p>포스트시즌 로스터 미선발</p>':''}</section>`:''}
  ${selected?percentileChart(selected.league,row.role):''}
  ${selected?`<section class="panel"><div class="section-title"><h2>기록 순위</h2><span>${row.role==='bat'?'타격':'투구'}</span></div>${leaderboards(selected.league,row.role)}</section>`:''}
  ${row.aAfter?`<section class="panel"><div class="section-title"><h2>능력 변화</h2><span>훈련·출장·이벤트 합산</span></div>${abilityList({a:row.aAfter,role:row.role,position:row.position},row.aBefore)}</section>`:''}`;
}
function retirement(){
  const c=career,rows=c.history.filter(x=>x.stage==='프로'),awards=rows.flatMap(x=>x.awards),post=rows.map(x=>x.postseason?.stat).filter(Boolean),postGames=post.reduce((n,x)=>n+x.g,0),wins=rows.filter(hasChampionshipRing).length,teams=[...new Set(rows.map(x=>x.team))],postTotal=sumStats(post,c.player.role);
  return `<section class="panel retirement"><span class="eyebrow">커리어 종료 · ${esc(c.retirementReason||'은퇴')}</span><h2>${esc(c.player.name)} · ${esc(c.player.position)}</h2><p>${esc(c.player.type)} · ${c.age}세 · 최종 소속 ${esc(TEAMS[c.player.team])}</p><div class="retirement-stats"><div><span>커리어 점수</span><strong>${c.careerScore??careerScore(c)}</strong></div><div><span>누적 기본 연봉</span><strong>${money(totalSalary(c))}</strong></div><div><span>프로 시즌</span><strong>${c.proYears}</strong></div><div><span>주요 타이틀</span><strong>${awards.length}</strong></div><div><span>포스트시즌 출장</span><strong>${postGames}경기</strong></div><div><span>한국시리즈 우승</span><strong>${wins}회</strong></div></div><p>시즌별 지급 연봉 합계 · 계약금 ${money(c.signingIncome)}과 성과 옵션·군 보류수당은 별도${c.legacySalaryYears?` · 구버전 ${c.legacySalaryYears}시즌 연봉 미기록`:''}</p><div class="actions">${btn('시즌별 기록','records')}${btn('저장 파일 내보내기','export','secondary')}</div></section><section class="panel"><h2>소속팀과 주요 기록</h2><p>팀 이력 · ${teams.map(i=>esc(TEAMS[i])).join(' → ')||'프로 소속 없음'}</p><p>국가대표 · ${c.nationalHistory.filter(x=>x.selected).map(x=>`${x.year} ${esc(x.name)} ${esc(x.result)}`).join(' · ')||'선발 기록 없음'}</p><div class="awards">${awardSummaryHtml(rows)}</div></section><section class="panel"><h2>포스트시즌 통산</h2>${metrics(postTotal,c.player.role,c.player.position)}<p>정규시즌 통산에는 합산하지 않습니다.</p></section>${recordsBody('major')}`;
}
function majorEvent(){const e=career.pendingEvent;if(!e)return '';
  let title='주요 이벤트',content='';
  if(e.type==='postseason'){title=e.ring?'한국시리즈 우승!':'포스트시즌 결과';content=`<p>정규시즌 ${e.regularRank}위 → 최종 ${e.finalRank}위</p><p>${e.selected?'포스트시즌 로스터 선발':'포스트시즌 로스터 미선발'}</p>`;}
  if(e.type==='award'){title='개인 타이틀 수상';content=`<p>${esc(awardLine(e.titles))}</p>`;}
  if(e.type==='spring_evaluation'){title='스프링캠프 평가';content=`<p>${esc(e.text)}</p>`;}
  if(e.type==='military'){title=e.outcome==='합격'?'상무 선발 및 복무 시작':e.outcome==='탈락'?'상무 선발 탈락':'현역 복무 시작';content=`<p>${esc(e.outcome)} · ${e.path==='athletic'?'상무':'현역'}${e.path==='athletic'&&career.lastSangmuResult?` · ${career.lastSangmuResult.rank}/${career.lastSangmuResult.total}위`:''}</p><p>${e.outcome==='탈락'?'현역 입대 또는 다음 해 재지원을 선택할 수 있습니다.':'2시즌 복무 후 선수 생활로 복귀합니다.'}</p>`;}
  if(e.type==='discharge'){title='병역 복무 완료';content=`<p>${e.path==='athletic'?'상무':'현역'} 복무를 마치고 소속 구단으로 복귀합니다.</p>`;}
  if(e.type==='position_result'){title='보직·포지션 변경 결과';content=`<p>${esc(e.from)} → ${esc(e.to)}</p>`;}
  if(e.type==='trade'){title=e.outcome==='거절'?'트레이드 요청 거절':e.outcome==='보류'?'트레이드 요청 보류':`${TEAMS[e.newTeam]} 입단`;content=`<p>${TEAMS[e.oldTeam]}${e.newTeam!==e.oldTeam?` → ${TEAMS[e.newTeam]}`:''}</p><p>${esc(e.reason||'구단 결정')}</p>`;}
  if(e.type==='join'){title=`${TEAMS[e.team]} 입단`;content=`<p>${esc(e.reason||'프로 입단')}</p>`;}
  if(e.type==='salary'){title='연봉 협상 결과';content=`<p>${e.renegotiated?e.accepted?'재협상 성공':'재협상 실패 · 최초 제안 적용':'구단 제안 수락'}</p><p>기존 ${money(e.oldMan)} → 확정 ${money(e.annualMan)}</p>`;}
  if(e.type==='national_invitation'){title=e.name+' 대표팀 선발';content='<p>'+e.month+' 개최 · '+esc(e.category||'대표팀 후보')+' · 출전 여부를 선택하세요.</p><div class="actions">'+btn('출전','national-accept')+btn('거절','national-decline','secondary')+'</div>';return '<section class="panel major-event" role="alertdialog"><h2>'+title+'</h2>'+content+'</section>';}

  if(e.type==='national'){title='국가대표 대회 결과';content=e.items.map(x=>`<p>${x.name} 국가대표 선발 · ${x.result}${x.exemption?' · 병역특례 (게임 규칙)':''}</p>`).join('');}
  if(e.type==='position_result'){title='포지션 결정';content=`<p>${e.outcome} · ${e.from} → ${e.to}</p><p>${e.outcome==='수락'?'능력 변화와 1시즌 적응이 적용됐습니다.':'현재 포지션을 유지합니다.'}</p>`;}
  if(e.type==='release'||e.type==='waiver'){title=e.type==='waiver'?'웨이버 공시 결과':'보류선수 명단 제외';content=`${e.type==='waiver'?'<p>정규시즌 첫 경기 전 · 7일 신청 기간 경과</p>':''}<p>기존 구단: ${TEAMS[e.oldTeam]}</p><p>이유: ${esc(e.reason)}</p><p>현재 신분: ${e.status}</p><p>계약·연봉: ${e.contractTreatment}</p><p>${e.claimed?`${TEAMS[e.newTeam]} 영입 · 계약 승계`:e.type==='waiver'?'당해 연도 KBO 계약·출장은 불가합니다. 다음 해 구단 제안과 입단 테스트를 확인할 수 있습니다.':'다른 구단 제안, 입단 테스트 또는 은퇴를 선택할 수 있습니다.'}</p>`;}
  if(e.type==='secondary'){title=`${TEAMS[e.newTeam]} 입단`;content='<p>2차 드래프트 지명</p>';}
  if(e.type==='retirement_advice'){title='스토브리그 시작 · 구단의 은퇴 권고';content=`<p>${esc(e.reason)}</p><div class="actions">${btn('은퇴 수락','retirement-accept')}${btn('거부 · 다른 구단 제안 대기','retirement-decline','secondary')}</div>`;return `<section class="panel major-event" role="alertdialog"><h2>${title}</h2>${content}</section>`;}
  if(e.type==='rejoin'||e.type==='tryout'){title=e.type==='rejoin'?'자유계약 영입':'입단 테스트 결과';content=`<p>${e.type==='rejoin'||e.success?`${TEAMS[e.newTeam]} 입단 · 연봉 ${money(e.annualMan)}`:'불합격 · 다른 구단 제안 또는 은퇴를 선택할 수 있습니다.'}</p>`;}
  return `<section class="panel major-event ${e.type==='award'?'award-event':''}" role="alertdialog" aria-modal="true"><h2>${title}</h2>${content}<div class="actions">${btn('확인','ack-event')}</div></section>`;
}
function club(){
  if(!career)return creation();const c=career;
  if(c.pendingEvent)return majorEvent();
  const roleOffer=c.phase==='position_choice'?c.pendingPositionOffer:null;
  if(roleOffer)return header('스토브리그 직전 포지션 변경 제안',`${c.year}년 시즌 결과 · 다음 시즌 준비`)+`<section class="panel major-event"><p>이번 시즌 성적과 구단 운용 계획을 반영한 제안입니다.</p><div class="contract-values"><div><span>현재 ${c.player.role==='pitch'?'보직':'포지션'}</span><strong>${esc(c.player.position)}</strong></div><div><span>구단 제안</span><strong>${esc(roleOffer.target)}</strong></div></div><p>${esc(roleOffer.benefit)} · ${esc(roleOffer.cost)}</p><div class="actions">${btn('변경 수락','change-position')}${btn('현재 역할 유지','keep-position','secondary')}</div></section>`;
  const titles={prepare:c.stage==='프로'?'스토브리그':c.stage==='고교'?'고교 시즌 시작':'대학 시즌 시작',season:c.stage==='고교'?'고3 시즌 시작':c.stage==='대학'?'대학 시즌 시작':'정규시즌 시작',result:c.stage==='고교'?'고교 시즌 결과':c.stage==='대학'?'대학 시즌 결과':'프로 시즌 결과',path:'졸업 후 진로',draft:'신인 드래프트',draft_motion:'신인 드래프트 진행',draft_result:'지명 결과',college_choice:'얼리드래프트',fa_choice:'FA 권리 결정',market:'FA 계약 제안',contract_result:'FA 계약 결과',incident:'부상',retired:'은퇴 기록',undrafted:'미지명',secondary_wait:'2차 드래프트',free_agent:'자유계약 선수',waiver_wait:'웨이버 후 대기'};
  let body='';
  switch(c.phase){
    case 'prepare':body=preparePanel();break;
    case 'season':body=seasonPanel();break;
    case 'result':body=resultPanel(latest());break;
    case 'path':body=pathPanel();break;
    case 'draft':body=scoutPanel()+`<section class="panel"><h2>대학 졸업 · 드래프트</h2><p>4시즌 이수. 지명되면 해당 구단으로 입단합니다.</p>${btn('드래프트 참가','draft')}</section>`;break;
    case 'draft_motion':body=`<section class="panel draft-motion"><span class="eyebrow">${c.year} 신인 드래프트</span><h2>지명 심사 중</h2><p>${esc(c.player.name)}</p>${btn("결과 확인","reveal-draft")}</section>`;break;
    case 'draft_result':body=draftResultPanel();break;
    case 'college_choice':body=scoutPanel()+`<section class="panel"><h2>대학 2학년 · 조기 진출</h2><p>지명 시 프로 입단, 미지명 시 대학에 남습니다. 조기 입단자는 대졸 FA 단축 기준을 적용하지 않습니다.</p><div class="actions">${btn('얼리드래프트 참가','early')}${btn('대학 잔류','stay-college','secondary')}</div></section>`;break;
    case 'undrafted':body=`<section class="panel"><h2>드래프트 미지명</h2><p>육성 입단 테스트를 통해 한 구단에서 선수 생활을 이어갑니다.</p>${btn('육성 입단 테스트','tryout')}</section>`;break;
    case 'fa_choice':body=faPanel();break;
    case 'market':body=marketPanel();break;
    case 'contract_result':body=contractResultPanel();break;
    case 'incident':body=incidentPanel();break;
    case 'secondary_wait':body=`<section class="panel major-event"><h2>2차 드래프트 지명 대기</h2><p>${TEAMS[c.player.team]} 소속·보류 상태입니다. 35인 보호 명단 밖 선수 중 구단이 지명합니다. 선수의 참가 신청 절차가 아닙니다.</p>${btn('구단 지명 결과 확인','secondary-result')}</section>`;break;
    case 'waiver_wait':body=`<section class="panel major-event"><h2>웨이버 미영입</h2><p>이번 연도에는 KBO 구단과 선수계약을 체결할 수 없어 시즌 출전 기록이 생성되지 않습니다.</p><div class="actions">${btn('다음 해 재취업 기회 확인','waiver-next')}${btn('은퇴','retire','secondary')}</div></section>`;break;
    case 'release_choice':body=`<section class="panel major-event"><h2>보류선수 명단 제외</h2><p>다음 진로를 선택하세요.</p><div class="actions">${btn('2차 드래프트 참가','released-secondary')}${btn('은퇴','retire','secondary')}</div></section>`;break;
    case 'free_tryout_choice':body=`<section class="panel major-event"><h2>2차 드래프트 미지명</h2><div class="actions">${btn('입단 테스트','free-tryout')}${btn('은퇴','retire','secondary')}</div></section>`;break;
    case 'free_agent':body=`<section class="panel major-event"><h2>자유계약 선수</h2><div class="offer-grid">${freeAgentOffers(c).map((o,i)=>`<article class="offer"><h3>${TEAMS[o.team]}</h3><p>1년 · 연봉 ${money(o.annualMan)}</p>${btn('계약','free-sign:'+i)}</article>`).join('')}</div><div class="actions">${btn(c.tryoutYear===c.year?'올해 테스트 완료':'입단 테스트','free-tryout','secondary',c.tryoutYear===c.year)}${btn('은퇴','retire','text')}</div></section>`;break;
    case 'retired':body=retirement();break;
    default:body='<div class="alert">진행 상태를 확인할 수 없습니다. 저장 파일을 내보내세요.</div>';
  }
  return header(titles[c.phase]||'선수',`${c.year}년 · ${c.stage==='대학'?c.phase==='college_choice'?'대학 2학년 수료':`대학 ${Math.min(4,c.collegeSeasons+(c.phase==='result'?0:1))}학년`:esc(c.stage)}`)+body;
}
function recordsBody(mode=recordMode){
  const c=career,rows=c.history;
  if(mode==='salary')return `<section class="panel"><div class="section-title"><h2>연봉 지급 내역</h2><strong>${money(totalSalary(c))}</strong></div><p>기본 연봉 합계입니다. 계약금·군 보류수당·성과 옵션은 별도입니다.</p>${c.legacySalaryYears?`<p class="notice-line">구버전 ${c.legacySalaryYears}시즌은 연봉 미기록입니다.</p>`:''}<div class="table-scroll"><table><thead><tr><th>시즌</th><th>구단</th><th>기본 연봉</th><th>옵션 지급</th><th>군 보류수당</th></tr></thead><tbody>${c.salaryLedger.map(x=>`<tr><th>${x.year}</th><td>${TEAMS[x.team]}</td><td>${money(x.salaryMan)}</td><td>${money(x.optionPaidMan||0)}</td><td>${money(x.allowanceMan)}</td></tr>`).join('')||'<tr><td colspan="5">지급 기록 없음</td></tr>'}</tbody></table></div>${c.salaryLedger.flatMap(x=>(x.optionResults||[]).map(o=>`<p>${x.year} · ${o.label} · 실적 ${o.actual} · ${o.earned?'달성':'미달'} · 지급 ${money(o.paidMan)}</p>`)).join('')}</section><section class="panel"><h2>계약 내역</h2><div class="table-scroll"><table><thead><tr><th>시즌</th><th>구단</th><th>구분</th><th>기본 연봉</th><th>계약금</th><th>보장액</th><th>옵션 최대</th><th>최대 총액</th></tr></thead><tbody>${(c.contractHistory||[]).map(x=>`<tr><th>${x.year}</th><td>${TEAMS[x.team]}</td><td>${x.kind==='fa'?'FA':'연봉 협상'}</td><td>${money(x.annualMan)}</td><td>${money(x.signingBonusMan||0)}</td><td>${money(x.guaranteedMan)}</td><td>${money(x.optionMan||0)}</td><td>${money(x.totalMan)}</td></tr>`).join('')||'<tr><td colspan="8">기록된 계약 없음</td></tr>'}</tbody></table></div>${(c.contractHistory||[]).flatMap(x=>(x.options||[]).map(o=>`<p>${x.year} 계약 · ${o.label} 시 시즌마다 ${money(o.amountMan)}</p>`)).join('')}</section>`;
  return ['bat','pitch'].filter(role=>rows.some(x=>x.role===role)).map(role=>{
    const filtered=rows.filter(x=>x.role===role&&(mode==='major'?x.stage==='프로'&&!x.military&&x.stat?.g>0:mode==='minor'?x.stage==='프로'&&x.minorStat?.g>0:x.stage!=='프로'&&!x.military&&x.stat?.g>0));
    const entries=filtered.map(x=>({defenseUnrecorded:x.defenseUnrecorded,label:`${x.year} · ${x.military?'상무':teamName(x)} · ${x.position}`,stat:mode==='minor'?x.minorStat:x.stat,leagueGames:mode==='major'?x.league?.games:null}));
    const counted=filtered.filter(x=>!x.military).map(x=>mode==='minor'?x.minorStat:x.stat).filter(Boolean);
    return `<section class="panel"><div class="section-title"><h2>${role==='bat'?'타격':'투구'} 기록</h2><span>${mode==='major'?'1군':mode==='minor'?'2군 · 상무':'고교 · 대학'}</span></div>${entries.length?statTable([{label:mode==='minor'?'2군 통산 (상무 제외)':'통산',stat:sumStats(counted,role),total:true,defenseUnrecorded:filtered.some(x=>x.defenseUnrecorded)},...entries],role):'<div class="empty small-empty">해당 기록 없음</div>'}${mode==='minor'?'<p class="chart-note">상무 시즌은 별도 행으로 표시하며 구단 2군 통산에서는 제외합니다. 구버전 2군 기록은 —로 표시합니다.</p>':''}</section>`;
  }).join('');
}
function records(){if(!career)return header('기록')+'<div class="empty">선수 기록 없음</div>';return `${header('커리어 기록',`${career.history.length}시즌`,btn('내보내기','export','secondary'))}<div class="segment record-tabs">${[['major','1군'],['minor','2군 · 상무'],['amateur','아마추어'],['salary','연봉']].map(([key,name])=>`<button data-record-mode="${key}" class="${recordMode===key?'selected':''}">${name}</button>`).join('')}</div>${career.history.length?recordsBody():'<div class="empty">시즌 기록 없음</div>'}<section class="panel"><h2>1군 수상</h2><div class="awards">${career.history.filter(x=>x.stage==='프로'&&!x.military).flatMap(x=>x.awards.map(a=>`<span>${x.year} ${esc(canonicalAwardName(a))}</span>`)).join('')||'<p>수상 기록 없음</p>'}</div></section>`;}
function leaguePage(){
  if(!career?.history.length)return header('리그')+'<div class="empty">확정된 시즌 없음</div>';
  const row=career.history.find(x=>x.year===Number(chosenYear))||latest(),selected=activeResult(row),league=selected?.league||row.league;
  const selector=`<label class="season-selector">시즌<select id="season-select">${career.history.map(x=>`<option value="${x.year}" ${x.year===row.year?'selected':''}>${x.year} · ${x.stage}${x.military?' / 복무':''}</option>`).join('')}</select></label>`;
  if(!league)return header('리그','',selector)+'<div class="empty">현역 복무 · 비교할 기록 없음</div>';
  const teamRows=standings(league);
  return `${header('리그 기록',`${league.year}년 · ${league.level==='amateur'?'소속팀':'팀당'} ${league.teams.find(t=>t.id===row.team)?.g??league.games}경기`,selector)}${levelTabs(row)}<section class="panel"><h2>팀 순위</h2>${row.postseason&&league.level==='major'?`<div class="post-ranks"><strong>정규시즌 ${row.postseason.regularRank}위</strong><strong>최종 ${row.postseason.finalRank}위</strong></div><h3>${TEAMS[row.postseason.champion]} · 한국시리즈 우승</h3>`:''}<div class="table-scroll"><table><thead><tr><th>순위</th><th>구단</th><th>경기</th><th>승</th><th>패</th><th>무</th><th>승률</th><th>득점</th><th>실점</th></tr></thead><tbody>${teamRows.map(t=>`<tr class="${t.id===row.team?'mine':''}"><th>${t.rank}</th><td>${esc(t.name)}</td><td>${t.g}</td><td>${t.w}</td><td>${t.l}</td><td>${t.tie}</td><td>${t.pct.toFixed(3)}</td><td>${t.r}</td><td>${t.ra}</td></tr>`).join('')}</tbody></table></div></section>${selected?percentileChart(league,row.role):''}${selected?`<section class="panel"><h2>${league.level==='major'?'타이틀 · 수비 기록 순위':'기록 순위'} · ${row.role==='bat'?'타자':'투수'}</h2><p class="section-note">${row.position} 기록 기준 · 원값 동률은 공동 순위</p>${leaderboards(league,row.role)}</section>`:''}${league.level==='major'?`<section class="panel"><h2>투표형 수상</h2><div class="vote-grid">${league.awards.filter(x=>x.candidates&&(!x.title.startsWith('베스트글러브')||x.title.endsWith(row.position))).map(x=>`<article><h3>${x.title}</h3>${x.candidates.map((a,i)=>`<p><span>${i+1}. ${esc(league.players.find(p=>p.id===a.id)?.name)}</span><b>${a.score.toFixed(3)}점</b></p>`).join('')}</article>`).join('')}</div></section>`:''}`;
}
function story(){return `${header('커리어 이력')}<section class="panel timeline">${career?.events.length?career.events.map(x=>`<article><strong>${x.year}</strong><p>${esc(x.text.replace(/(\d+(?:\.\d+)?)백만원/g,(_,n)=>money(Number(n)*100)))}</p></article>`).join(''):'<div class="empty small-empty">기록된 사건 없음</div>'}</section>`;}
function help(){return `${header('규칙')}<div class="rules-grid">
<section class="panel prose"><h2>드래프트 · FA</h2><p>신인 드래프트에서는 구단 선택이 없습니다. 지명 구단으로 입단하며, 응원 구단은 지명에 영향을 주지 않습니다. 지명 확률과 라운드는 아마추어 성적·출장량·능력·나이를 반영한 게임 추정치입니다.</p><p>보류선수는 소속 구단을 유지합니다. 매년 연봉을 조정해도 자유계약 선수가 되지 않습니다. 타 구단 복수 제안은 FA 권리를 행사한 뒤에만 열립니다.</p><p>FA는 1군 등록 145일 이상을 1시즌으로 인정합니다. 미달 시즌 등록일은 합산합니다. 고졸·얼리드래프트 입단은 8시즌, 대학 4시즌 이수 졸업자는 7시즌, 재취득은 4시즌입니다. 다년계약이 남으면 선언할 수 없습니다.</p><p>대학 2학년을 마치면 얼리드래프트 선택이 열립니다. 신청은 게임에서 버튼으로 압축하며 1학년 조기 드래프트는 구현하지 않습니다. 조기 진출 미지명 시 대학에 남습니다.</p><p class="source-links"><a href="https://6ptotvmi5753.edge.naverncp.com/KBO_FILE/ebook/pdf/2025_%EC%95%BC%EA%B5%AC%EA%B7%9C%EC%95%BD.pdf" target="_blank" rel="noreferrer">KBO 규약 · 보류 / FA</a><a href="https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=12024" target="_blank" rel="noreferrer">KBO 2027 신인드래프트 신청</a></p></section>
<section class="panel prose"><h2>훈련 · 출전</h2><p>능력치 최대 2개를 선택합니다. 경기 경험과 역할에 따른 성장량을 선택 분야에 더 배분합니다.</p><p>시즌 종료 후 실제 출장량으로 2군 → 1군 백업 → 1군 준주전 → 1군 주전을 산정합니다. 1군 백업 타자는 경기 후반에 교체 출전합니다.</p><p>1군 144경기와 2군 108경기를 따로 시뮬레이션합니다. 같은 날짜에 1군과 2군에 중복 출전하지 않습니다. 등록일은 188일 가상 시즌의 등록 상태로 계산하며 출장 경기 수와 구분합니다.</p></section>
<section class="panel prose"><h2>백분위 · 수상</h2><p>0·50·100 축 위에 선수의 위치를 표시합니다. 100은 최상위입니다. 같은 값은 중간 순위를 적용합니다. ERA·WHIP·BB/9·타자 삼진%는 낮을수록 좋은 것으로 계산합니다.</p><p>규정타석·규정이닝의 25%·50%·75%·충족 구간으로 나눕니다. 자신과 같거나 더 높은 표본 구간의 선수만 비교하며, 비교 선수 수를 함께 표시하며 두 명이어도 백분위를 계산합니다.</p><p>WAR·wRC+·WPA는 계산에 필요한 세부 기록을 모델링하지 않아 임의 값을 표시하지 않습니다. 현재 원기록으로 계산 가능한 항목만 제공합니다.</p><p>타이틀은 1군에만 수여합니다. 비율 타이틀은 규정 타석(팀 경기×3.1 버림) 또는 규정 이닝(경기×1)을 충족해야 합니다. 원값이 같으면 공동 수상입니다. 비율 타이틀은 규정 자격 미달 시 기록을 참고값으로 보여줍니다.</p></section>
<section class="panel prose"><h2>병역 · 전향</h2><p>상무는 만 27세 이하·프로 1시즌 이상이라는 게임 내 최소 조건으로 매년 한 번 지원할 수 있습니다. 투수 8명·야수 10명의 게임 내 슬롯에 대한 경쟁 심사를 진행하며 탈락할 수 있습니다. 이는 실제 연도별 공고 정원이나 자격이 아닙니다. 탈락 후에도 현역 입대는 가능합니다.</p><p>상무는 2군 경기와 훈련을 진행합니다. 현역 첫 시즌은 구단 훈련과 공식 출전이 없습니다. 첫 시즌은 1군 결장, 두 번째 시즌 후반에는 복귀 기회가 열립니다. 27세 시즌이 마지막 대회 기회이며 28세 시즌에 미필이면 게임 규칙상 자동으로 현역 입대합니다. 게임에서는 아시안게임 대표팀에 선발되고 우승하면 병역특례가 적용됩니다. WBC와 프리미어12 우승은 특례 대상이 아닙니다. 실제 추천·심사 절차는 생략합니다.</p><p>투타 전향은 만 24세 이상, 최근 프로 3시즌 내내 충분한 표본에서 극심한 부진일 때만 제안합니다. 타자 OPS .530 미만(각 80타석 이상), 투수 ERA 7.50·WHIP 1.80 이상(각 20이닝 이상), 1·2군 합산 기준입니다. 커리어당 1회, 2시즌 적응, 거절하면 재제안하지 않습니다.</p></section>
<section class="panel prose"><h2>연봉 · 저장</h2><p>금액은 만원과 억으로 표시합니다. 2027년 최저 연봉 3300만원을 적용합니다. 통산 연봉은 실제 완료한 시즌에 지급된 연봉만 합산합니다. 계약금·군 보류수당·남은 계약액은 별도입니다.</p><p>같은 시드·저장·선택은 같은 결과를 냅니다. v1~v4 저장도 불러올 수 있습니다. v1에 없던 과거 2군 성적과 연봉은 만들어 넣지 않고 미기록으로 표시합니다. 과거 1군 등록일은 출장량 추정치로 표시하므로 v1 경력자의 FA 시점에는 오차가 있습니다. v1 원본은 그대로 유지됩니다.</p><p class="source-links"><a href="https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=11814" target="_blank" rel="noreferrer">2027 최저 연봉 · KBO 발표</a></p></section>
<section class="panel prose"><h2>국가대표 · 이적 · 자유계약</h2><p>개최 연도는 게임 내 주기로 단순화합니다. WBC는 3월, 아시안게임은 9월, 프리미어12는 11월입니다. 선발을 거절할 수 있고, 아시안게임 출전 기간에는 소속팀 경기를 비웁니다. 아시안게임 대표팀 선발과 우승에만 병역특례를 적용합니다. 실제 제도는 올림픽 3위 이상·아시안게임 1위입니다.</p><p>2차 드래프트는 게임 내 짝수년도에 시행하고 구단 보류선수 중 35인 보호 명단 밖 선수만 대상으로 합니다. 구단의 실제 보호명단·라운드별 지명권·양도금은 생성하지 않습니다. 보류선수 명단 제외와 웨이버는 별개의 신분 전환입니다. 입단 테스트는 게임 내 재취업 과정이며 공식 2차 드래프트가 아닙니다.</p><p>FA 등급은 최근 3년 본인 연봉과 게임 내 다른 선수 급여 추정 순위로 산정합니다. 실제 KBO는 구단·리그 순위와 별도 제외 규정을 적용합니다. 보상 방식은 구단 간 절차라 선수 선택에서 생략합니다.</p><p class="source-links"><a href="https://www.wbsc.org/ko/calendar/2026/baseball" target="_blank" rel="noreferrer">WBSC 국제대회 일정</a><a href="https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=8750" target="_blank" rel="noreferrer">KBO 2차 드래프트 제도</a><a href="https://www.koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx" target="_blank" rel="noreferrer">KBO 투수 기록실</a><a href="https://www.law.go.kr/LSW/flDownload.do?bylClsCd=110202&flSeq=142224205&gubun=" target="_blank" rel="noreferrer">병역법 시행규칙 · 아시아경기대회</a></p></section><section class="panel prose"><h2>경기 모형</h2><p>각 타석의 볼넷·삼진·안타·홈런·아웃을 누적합니다. AVG·OBP·SLG·OPS·ERA·WHIP는 원기록으로 계산합니다. 이닝은 정수 아웃 수로 보관합니다.</p><p>승리투수는 최종 리드를 얻은 시점의 투수입니다. 선발은 5이닝을 채워야 하며 미충족 시 구원진의 최소 실점·최다 아웃 순으로 선정합니다. 투수 교체는 이닝 사이에만 하며 상대 타자 수·실점·체력·휴식과 점수 차를 반영합니다.</p><p>세이브는 승리투수가 아닌 마지막 투수가 1~3점 리드를 지킨 경우입니다. 홀드는 선발·마무리·승리투수를 제외한 구원진의 1~3점 리드 유지입니다. 연장은 12회까지 진행하며 병살·사구·승계주자는 생략합니다. 실책은 안타와 구분하며 수비 기회는 근사 계산합니다.</p><p>정규시즌 MVP 등은 공개 점수로 선정합니다. 타자: (OPS−.55)×2.4와 홈런·타점·안타·득점에 출장량을 반영합니다. 투수: ERA·투구 아웃·삼진·세이브·홀드를 반영합니다. 양쪽 모두 팀 성적과 타이틀을 소폭 반영하고, 타자는 수비 능력도 반영합니다. 신인 후보와 포지션 후보를 구분합니다. 투수 골든글러브는 한 명에게 주며, 최동원상은 별도 투수상입니다.</p></section></div>`;}
function tidyResultLogs(){const root=$('.result-summary');if(!root)return;const nodes=[...root.children].filter(x=>x.classList.contains('report-list')||x.tagName==='DETAILS'||x.textContent.startsWith('구단 신뢰도 변경:'));if(!nodes.length)return;const details=document.createElement('details');details.className='season-log';details.innerHTML='<summary>상세 로그</summary>';nodes.forEach(x=>details.append(x));root.append(details);}
function render(){const content=playback?playbackPanel():career?.pendingEvent?majorEvent():view==='club'?club():view==='records'?records():view==='league'?leaguePage():view==='story'?story():view==='archive'?archivePanel():help();$('#app').innerHTML=shell(content);tidyResultLogs();bind();}
function bind(){
  document.querySelectorAll('[data-view]').forEach(el=>el.onclick=e=>{e.preventDefault();if(playback){message('진행 중인 시즌을 먼저 확인하세요.');return;}navigate(el.dataset.view);});
  document.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>act(el.dataset.action));
  document.querySelectorAll('[data-training]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.training),selected=availableTraining(career);if(el.disabled||career.player.a[i]>=career.potentialCaps[i])return;if(selected.includes(i))selected.splice(selected.indexOf(i),1);else{if(selected.length===2){message('최대 2개까지 선택할 수 있습니다.');return;}selected.push(i);}career.training=selected;persist();render();});
  document.querySelectorAll('[data-candidate]').forEach(el=>el.onclick=()=>{setup.selected=Number(el.dataset.candidate);saveSetup();render();});
  document.querySelectorAll('[data-position]').forEach(el=>el.onclick=()=>{setup.position=el.dataset.position;setup.profile.position=setup.position;saveSetup();render();});
  document.querySelectorAll('[data-focus]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.focus);setup.focus=setup.focus.includes(i)?setup.focus.filter(x=>x!==i):setup.focus.length<2?[...setup.focus,i]:[setup.focus[1],i];saveSetup();render();});
  document.querySelectorAll('[data-record-mode]').forEach(el=>el.onclick=()=>{recordMode=el.dataset.recordMode;render();});
  document.querySelectorAll('[data-result-level]').forEach(el=>el.onclick=()=>{resultLevel=el.dataset.resultLevel;render();});
  const year=$('#season-select');if(year)year.onchange=()=>{chosenYear=year.value;resultLevel='auto';render();};
  const form=$('#new-form');if(form){
    form.querySelector('[name="role"]').onchange=()=>{const p=Object.fromEntries(new FormData(form));p.role=p.role==='투수'?'pitch':'bat';if(setup.candidates&&p.role!==setup.profile?.role){message('후보 생성 후 선수 구분은 변경할 수 없습니다.');render();return;}p.team=Number(p.team);p.position=positions(p.role)[0];setup.profile={...setup.profile,...p};setup.position=p.position;saveSetup();render();};
    form.onsubmit=e=>{e.preventDefault();const p=Object.fromEntries(new FormData(form));p.role=p.role==='투수'?'pitch':'bat';p.team=Number(p.team);p.name=p.name.trim();p.school=p.school.trim();if(!p.name||!p.school){message('이름과 학교 이름을 입력하세요.');return;}if(setup.candidates&&p.role!==setup.profile.role){message('후보 생성 후 선수 구분은 변경할 수 없습니다.');return;}p.seed=setup.profile?.seed||Math.floor(Math.random()*4294967295);p.position=p.position||setup.position||positions(p.role)[0];if(!setup.candidates||setup.position!==p.position){setup.candidates=abilityCandidates(p.role,p.seed,p.position);setup.selected=null;}setup.profile=p;setup.selected??=null;setup.position=p.position;setup.focus??=[0];setup.step='candidates';saveSetup();render();};
  }
  $('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const raw=await file.text(),incoming=loadCareer({getItem:()=>raw});if(career&&!await confirmChoice('현재 커리어를 불러온 파일로 바꿉니다. 기존 기록을 보관하려면 먼저 내보내세요.'))return;career=incoming;playback=restoredPlayback(career);view='club';chosenYear=null;resultLevel='auto';persist();render();message('불러오기 완료');}catch(err){message(`불러오기 실패: ${err.message}`);}};
}
async function act(action){
  if(busy)return;
  try{
    if(validViews.includes(action)){navigate(action);return;}
    if(action==='export'){if(!career)return;const url=URL.createObjectURL(new Blob([JSON.stringify(career)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`charari-naega-kiunda-${career.year}.json`;a.click();URL.revokeObjectURL(url);return;}
    if(action==='reset'){if(career&&!await confirmChoice('새 선수를 만들면 현재 자동 저장을 교체합니다. 필요한 기록은 먼저 내보내세요.'))return;localStorage.removeItem(SAVE_KEY);localStorage.removeItem(SETUP_KEY);for(const key of LEGACY_SAVE_KEYS){const raw=localStorage.getItem(key);if(raw)localStorage.setItem(`${key}-archive`,raw);localStorage.removeItem(key);}career=null;setup={step:'profile',profile:null,candidates:null,selected:null,focus:[0]};view='club';render();return;}
    if(action==='random-profile'){const form=$('#new-form'),current=form?Object.fromEntries(new FormData(form)):setup.profile||{},seed=setup.profile?.seed||Math.floor(Math.random()*4294967295),role=setup.profile?.role||(current.role==='투수'?'pitch':'bat'),position=positions(role)[Math.floor(Math.random()*positions(role).length)];setup.profile={...setup.profile,...current,name:randomName(Math.floor(Math.random()*4294967295)),school:HIGH_SCHOOLS[Math.floor(Math.random()*HIGH_SCHOOLS.length)],role,position,team:Math.floor(Math.random()*10),seed};setup.position=position;saveSetup();render();return;}
    if(action==='setup-profile'){setup.step='profile';saveSetup();render();return;}
    if(action==='setup-candidates'){setup.step='candidates';saveSetup();render();return;}
    if(action==='candidate-next'){if(setup.selected===null)throw Error('후보를 선택하세요.');setup.step='focus';saveSetup();render();return;}
    if(action==='start'){if(setup.step!=='focus'||setup.selected===null)return;const p=setup.profile,picked=setup.candidates[setup.selected],position=setup.position||positions(p.role)[0];if(p.hand==='좌투좌타'&&['포수','2루수','3루수','유격수'].includes(position))throw Error('좌투 선수는 1루수·외야수·지명타자를 선택하세요.');career=createCareer({...p,position,type:picked.type});career.player.a=[...picked.a];career.potentialCaps=skillCaps(career.player.a,career.seed,career.potential,p.role);career.training=availableTraining(career,[...setup.focus]);career.archiveId=crypto.randomUUID();localStorage.removeItem(SETUP_KEY);persist();render();return;}
    if(!career)return;
    if(career.pendingEvent&&!['ack-event','retirement-accept','retirement-decline','national-accept','national-decline'].includes(action))throw Error('주요 이벤트를 먼저 확인하세요.');
    if(action==='national-accept'||action==='national-decline'){decideNationalInvitation(career,action==='national-accept');persist();render();return;}
    if(action==='ack-event'){acknowledgeEvent(career);persist();render();return;}
    if(action==='begin-season'){if(career.phase!=='prepare')throw Error('시즌 준비 단계가 아닙니다.');if(mandatoryEnlist(career)){persist();render();return;}if(career.tradeOffer)throw Error('새 구단 연봉 제안을 먼저 결정하세요.');if(career.salaryPending&&!(career.contract?.kind==='fa'&&career.contract.left>0))throw Error('연봉 협상을 먼저 마치세요.');const challenge=coachChallenge(career);if(challenge){persist();render();return;}if(preSeasonNationalInvitation(career)){persist();render();return;}career.phase='season';if(waiverCheck(career)){persist();render();return;}persist();render();window.scrollTo(0,0);return;}
    if(action==='back-prepare'){career.phase='prepare';persist();render();return;}
    if(action==='salary-accept'||action==='salary-counter')negotiateSalary(career,action==='salary-counter');
    else if(action==='trade-request')requestTrade(career);
    else if(action==='trade-accept'||action==='trade-decline')decideTradeOffer(career,action==='trade-accept');
    if(action==='simulate'||action.startsWith('rehab:')){
      if(action==='simulate'&&injuryForecast(career)&&!career.rehabChoice){career.pendingTraining=[...career.training];startInjuryPreview();return;}
      if(action.startsWith('rehab:'))career.rehabChoice=action.split(':')[1];
      startSeasonCalculation();return;
    }else if(action==='next'){nextYear(career);resultLevel='auto';}
    else if(action==='reveal-draft')revealDraft(career);
    else if(action==='contract-continue'){if(career.phase!=='contract_result')throw Error('계약 결과 화면이 아닙니다.');career.phase='prepare';}
    else if(action==='secondary-result')secondaryDraft(career);
    else if(action==='released-secondary')releasedSecondaryDraft(career);
    else if(action==='retirement-accept')decideRetirementAdvice(career,true);
    else if(action==='retirement-decline')decideRetirementAdvice(career,false);
    else if(action==='waiver-next')advanceWaiverYear(career);
    else if(action==='free-tryout')freeAgentTryout(career);
    else if(action.startsWith('free-sign:'))signFreeAgent(career,freeAgentOffers(career)[Number(action.split(':')[1])]);
    else if(action==='draft'){beginDraft(career);}
    else if(action==='early'){if(!await confirmChoice('얼리드래프트에서 지명되면 해당 구단으로 입단합니다. 대졸 FA 단축 혜택은 적용되지 않습니다.'))return;beginDraft(career,'early');}
    else if(action==='finish-draft'){const selected=career.lastDraft?.selected;finishDraft(career);if(selected)career.pendingEvent={type:'join',year:career.year,team:career.player.team,reason:'신인 드래프트 지명'};}
    else if(action==='college')enterCollege(career);
    else if(action==='stay-college'){career.phase='prepare';career.events.push({year:career.year,text:'얼리드래프트 불참 · 대학 잔류'});}
    else if(action==='tryout'){developmentalTryout(career);const spring=springEvaluation(career);career.pendingEvent={type:'join',year:career.year,team:career.player.team,reason:'육성선수 입단 테스트'};if(spring)career.eventQueue.push(spring);}
    else if(action==='declare-fa'){if(!await confirmChoice('FA 권리를 행사하고 구단 제안을 받습니다.'))return;declareFA(career);}
    else if(action==='defer-fa')deferFA(career);
    else if(action.startsWith('sign:')){const offer=offers(career)[Number(action.split(':')[1])];if(!await confirmChoice(`${TEAMS[offer.team]} · ${offer.years}년 최대 ${money(offer.totalMan)} · 보장 ${money(offer.guaranteedMan)} 계약을 확정합니다.`))return;sign(career,offer);}
    else if(action==='military'||action==='athletic'){if(!await confirmChoice(action==='athletic'?'상무에 지원합니다. 합격하면 2시즌 복무하며, 탈락하면 현역 입대 또는 다음 해 재지원을 선택할 수 있습니다.':'현역으로 입대합니다. 2시즌 동안 나이가 흐르고 공식 경기에는 출전하지 않습니다.'))return;const success=enlist(career,action==='athletic'?'athletic':'regular');career.pendingEvent={type:'military',year:career.year,path:action==='athletic'?'athletic':'regular',outcome:action==='athletic'?success?'합격':'탈락':'입대'};}
    else if(action==='change-position'){resolvePositionOffer(career,true);}
    else if(action==='keep-position'){resolvePositionOffer(career,false);}
    else if(action==='convert'){if(!await confirmChoice('투타 전향은 커리어당 한 번입니다. 능력치가 변환되고 2시즌 적응이 필요합니다.'))return;convert(career);}
    else if(action==='decline-convert'){career.conversionDeclined=true;career.events.push({year:career.year,text:'투타 전향 제안 거절'});}
    else if(action==='retire'){if(!await confirmChoice('은퇴하면 진행을 재개할 수 없습니다. 기록과 지급 연봉은 보존됩니다.'))return;retire(career,career.playerStatus==='free_agent'?'재취업 시장 종료':'본인 선택');}
    persist();render();if(!['salary-accept','salary-counter','trade-request','trade-accept','trade-decline','change-position','keep-position'].includes(action))window.scrollTo(0,0);
  }catch(e){busy=false;message(e.message);}
}
render();
