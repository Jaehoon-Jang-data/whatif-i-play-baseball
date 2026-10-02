import {
  TEAMS,KEYS,TYPES,TITLES,LEVELS,SAVE_KEY,abilities,createCareer,trainingPlan,rosterPlan,
  injuryForecast,progress,nextYear,rates,emptyBat,emptyPitch,sumStats,ranking,statValue,
  percentileReport,money,totalSalary,faStatus,draftAssessment,collegeEarlyStatus,enterCollege,
  runDraft,finishDraft,developmentalTryout,declareFA,deferFA,offers,sign,salaryOffer,negotiateSalary,requestTrade,
  positionOffer,changePosition,sangmuRecruitment,enlist,conversionOffer,convert,retire,saveCareer,loadCareer
} from './engine.js?v=2.3';

const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const validViews=['club','records','league','story','help'];
let career=null,view=validViews.includes(location.hash.slice(1))?location.hash.slice(1):'club',prospect=null,rerolls=3,busy=false,saveError='',recordMode='major',resultLevel='auto',chosenYear=null,playback=null,playbackTimer=null;
let startingSeed=Math.floor(Math.random()*2147483646)+1;
try {career=loadCareer();} catch(e) {saveError=e.message;}
const positions=role=>role==='bat'?['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자']:['선발','중간계투','마무리'];
const btn=(label,action,variant='primary',disabled=false)=>`<button type="button" class="${variant}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const options=(items,value)=>items.map(x=>`<option value="${esc(x)}" ${value===x?'selected':''}>${esc(x)}</option>`).join('');
const fresh=role=>role==='bat'?emptyBat():emptyPitch();
const teamName=(row)=>row.stage==='프로'?TEAMS[row.team]:row.stage==='고교'?career.player.school:'대학';
const latest=()=>career?.history.at(-1);
function message(text){$('#notice').textContent=text;$('#notice').classList.add('show');setTimeout(()=>$('#notice').classList.remove('show'),4500);}
function navigate(target){view=target;if(location.hash.slice(1)!==target)history.pushState(null,'',`#${target}`);render();window.scrollTo(0,0);}
window.addEventListener('popstate',()=>{view=validViews.includes(location.hash.slice(1))?location.hash.slice(1):'club';render();});
function persist(){try{saveCareer(career);saveError='';}catch(e){saveError='자동 저장 실패. 저장 파일을 내보내세요.';message(saveError);}}
function confirmChoice(text){return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='confirm-dialog';dialog.setAttribute('aria-label','선택 확인');
  dialog.innerHTML=`<h2>선택 확인</h2><p>${esc(text)}</p><div class="actions"><button class="secondary" data-cancel>취소</button><button class="primary" data-confirm>확정</button></div>`;
  const finish=answer=>{dialog.close();dialog.remove();resolve(answer);};
  dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.querySelector('[data-confirm]').onclick=()=>finish(true);
  dialog.oncancel=e=>{e.preventDefault();finish(false);};document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').focus();
});}
function header(title,subtitle='',right=''){return `<div class="page-title"><div><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div>${right}</div>`;}
function shell(content){
  const c=career,p=c?.player,nav=[['club','선수'],['records','기록'],['league','리그'],['story','이력'],['help','규칙']];
  const status=c?(c.retired?'은퇴':c.service?(c.servicePath==='athletic'?'상무':'현역'):c.stage==='프로'?(c.phase==='result'?latest()?.level:rosterPlan(c).label):c.stage==='대학'?`대학 ${Math.min(4,c.collegeSeasons+1)}학년`:(c.age>18?'고교 졸업':'고교 3학년')):'';
  return `<header class="site-header"><a class="brand" href="#" data-view="club"><span>D.</span>다이아몬드 데이즈</a><nav aria-label="주 메뉴">${nav.map(([key,label])=>`<button data-view="${key}" class="${view===key?'active':''}" ${view===key?'aria-current="page"':''}>${label}</button>`).join('')}</nav><div class="header-tools"><span class="save-state">${saveError?'저장 오류':c?'자동 저장':'v2'}</span>${btn('내보내기','export','text',!c)}<label class="file-label">불러오기<input type="file" id="import" accept=".json,application/json"></label>${c?btn('새 선수','reset','text'):''}</div></header>
  ${c?`<section class="player-bar" aria-label="선수 상태"><div><strong>${esc(p.name)}</strong><span>${c.age}세</span><span>${c.year}년</span></div><div><b>${esc(c.stage==='프로'?TEAMS[p.team]:c.stage==='고교'?p.school:'대학 야구부')}</b><span>${esc(p.position)}</span><span class="badge">${status}</span><span>${c.phase==='season'?'시즌 진행':c.phase==='result'?'결과 확인':c.phase==='prepare'?'시즌 준비':''}</span></div><div class="health"><span>컨디션 <b>${c.condition}</b></span><span>경기감각 <b>${Math.round(c.gameSense)}</b></span>${c.stage==='프로'?`<span>${c.salaryPending?'연봉 협상 대기':c.contract?.kind==='fa'?`FA · ${c.contract.left}년 남음`:`연봉 ${money(c.contract?.annualMan||0)}`}</span>`:''}</div></section>`:''}
  <main>${saveError?`<div class="alert" role="alert">${esc(saveError)}</div>`:''}${content}</main><footer><span>다이아몬드 데이즈 · v2</span><span>선수·성적은 시뮬레이션 데이터</span></footer>`;
}
function abilityList(player,before=null){return `<div class="ability-list">${player.a.map((n,i)=>`<div><span>${KEYS[player.role][i]}</span><div class="ability-track"><i style="width:${n}%"></i></div><b>${Number(n.toFixed(1))}</b>${before?`<small class="${n>=before[i]?'up':'down'}">${n>=before[i]?'+':''}${Number((n-before[i]).toFixed(1))}</small>`:''}</div>`).join('')}</div>`;}
function creation(){
  const p=prospect;
  return `${header('새 선수','고교 3학년 · 18세 · 2027년')}<div class="two-columns creation"><section class="panel"><h2>프로필</h2><form id="new-form"><div class="form-grid">
    <label>이름<input name="name" maxlength="16" required value="${esc(p?.name||'강도윤')}"></label>
    <label>고교<input name="school" maxlength="24" required value="${esc(p?.school||'한빛고등학교')}"></label>
    <label>선수 구분<select name="role">${options(['타자','투수'],p?.role==='pitch'?'투수':'타자')}</select></label>
    <label>포지션<select name="position">${options(positions(p?.role||'bat'),p?.position||'중견수')}</select></label>
    <label>투타<select name="hand">${options(['우투우타','우투좌타','좌투좌타','우투양타'],p?.hand||'우투우타')}</select></label>
    <label>성향<select name="type">${options(TYPES[p?.role||'bat'],p?.type)}</select></label>
    <label>응원 구단<select name="team">${TEAMS.map((t,i)=>`<option value="${i}" ${p?.team===i?'selected':''}>${t}</option>`).join('')}</select><small>지명 구단을 선택하는 항목이 아닙니다.</small></label>
    <label>시드<input name="seed" type="number" min="1" max="4294967295" required value="${p?.seed||startingSeed}"></label>
  </div><button class="${p?'secondary':'primary'} full" type="submit">${p?'프로필 반영':'능력치 생성'}</button></form></section>
  <section class="panel"><div class="section-title"><h2>초기 능력치</h2><span>0–100</span></div>${p?`<div class="prospect-title"><strong>${esc(p.name)}</strong><span>${esc(p.position)} · ${esc(p.type)}</span></div>${abilityList(p)}<div class="actions">${btn(`재추첨 ${rerolls}회`,'reroll','secondary',!rerolls)}${btn('시작','start')}</div>`:'<div class="empty"><b>능력치 생성 전</b><p>성향별 강점과 약점 반영 · 재추첨 3회</p></div>'}</section></div>`;
}
const batColumns=[['g','경기'],['pa','타석'],['ab','타수'],['h','안타'],['d','2루타'],['t','3루타'],['hr','홈런'],['rbi','타점'],['r','득점'],['bb','볼넷'],['k','삼진'],['sb','도루'],['sf','희비'],['avg','타율'],['obp','출루율'],['slg','장타율'],['ops','OPS']];
const pitchColumns=[['g','경기'],['gs','선발'],['outs','이닝'],['w','승'],['l','패'],['sv','세이브'],['hold','홀드'],['k','탈삼진'],['bb','볼넷'],['h','피안타'],['hr','피홈런'],['r','실점'],['er','자책'],['era','ERA'],['whip','WHIP']];
function displayStat(s,role,key){
  if(!s)return '—';
  if(key==='outs')return `${Math.floor(s.outs/3)}.${s.outs%3}`;
  if(['avg','obp','slg','ops'].includes(key))return s.ab?statValue(s,role,key).toFixed(3):'—';
  if(['era','whip','k9','bb9'].includes(key))return s.outs?statValue(s,role,key).toFixed(2):'—';
  if(['bbRate','kRate'].includes(key))return s.pa?`${(statValue(s,role,key)*100).toFixed(1)}%`:'—';
  return s[key]??0;
}
function statTable(rows,role){const cols=role==='bat'?batColumns:pitchColumns;return `<div class="table-scroll" tabindex="0" aria-label="${role==='bat'?'타격':'투구'} 기록 표"><table><thead><tr><th>시즌 / 소속</th>${cols.map(([,name])=>`<th>${name}</th>`).join('')}</tr></thead><tbody>${rows.map(x=>`<tr class="${x.total?'total':''}"><th>${esc(x.label)}</th>${cols.map(([k])=>`<td>${displayStat(x.stat,role,k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function metrics(stat,role){const columns=role==='bat'?[['avg','타율'],['h','안타'],['hr','홈런'],['ops','OPS']]:[['era','ERA'],['whip','WHIP'],['w','승'],['k','탈삼진']];return `<div class="metrics">${columns.map(([key,name])=>`<div><span>${name}</span><strong>${displayStat(stat,role,key)}</strong></div>`).join('')}</div>`;}
function color(percent){if(percent===null)return '#9ca3af';const p=percent/100;return p<.5?`rgb(${Math.round(50+p*340)},${Math.round(80+p*290)},240)`:`rgb(235,${Math.round(225-(p-.5)*350)},${Math.round(240-(p-.5)*390)})`;}
function percentileChart(league,role){
  const data=percentileReport(league,role),mine=league?.players.find(p=>p.id==='user'&&p.role===role);
  if(!data.length)return `<div class="empty small-empty">비교할 출장 기록이 없습니다.</div>`;
  const population=role==='bat'?'타자':mine.position==='선발'?'선발투수':'구원투수';
  return `<section class="panel percentile-panel"><div class="section-title"><h2>${league.year} 시즌 백분위</h2><span>${league.level==='major'?'1군':league.level==='minor'?'2군':'아마추어'}</span></div>
  <div class="percentile-legend"><span><i class="blue"></i>낮음</span><span>50 · 중간</span><span><i class="red"></i>높음</span></div>
  <div class="percentile-grid">${data.map(d=>{const n=d.percentile===null?null:Math.round(d.percentile);return `<article class="percentile-cell" aria-label="${d.label}: ${n===null?'표본 부족':`백분위 ${n}`} · 기록 ${displayStat(mine.stat,role,d.key)}"><div class="percentile-label"><h3>${d.label}</h3><span>${displayStat(mine.stat,role,d.key)}</span></div><div class="percentile-axis"><span class="axis-dot start"></span><span class="axis-dot middle"></span><span class="axis-dot end"></span>${n===null?'<span class="insufficient">표본 부족</span>':`<span class="percentile-marker" style="left:${d.percentile}%;background:${color(d.percentile)};color:${n>35&&n<65?'#20232a':'white'}">${n}</span>`}</div><div class="axis-labels"><span>0</span><span>50</span><span>100</span></div><small>${d.cumulative?'누적':'비율'} · ${d.count}명 · 최소 ${role==='bat'?`${d.threshold}타석`:`${d.threshold/3}이닝`}</small></article>`;}).join('')}</div>
  <p class="chart-note">같은 리그 ${population}끼리 비교합니다. 표본 10명 미만이면 백분위를 숨깁니다. 100이 최상위이며 ERA·WHIP·볼넷/9·타자 삼진%는 낮을수록 좋습니다. 누적 기록은 출장량의 영향을 받습니다.</p></section>`;
}
function scoutPanel(){const s=draftAssessment(career);return `<section class="panel scout-panel"><div class="section-title"><h2>드래프트 전망</h2><span>${s.provisional?'표본 부족 · 잠정 평가':'최근 아마추어 성적 반영'}</span></div><div class="scout-numbers"><div><span>지명 확률</span><strong>${Math.round(s.probability*100)}<small>%</small></strong></div><div><span>예상 라운드</span><strong>${s.roundLow}–${s.roundHigh}<small>라운드</small></strong></div></div><p>성적·출장량·능력·나이를 반영한 게임 내 추정치입니다. 미지명될 수 있습니다.</p></section>`;}
function contractPanel(){const c=career,fa=faStatus(c);return `<section class="panel"><div class="section-title"><h2>연봉 · FA</h2><span>${c.contract?.kind==='fa'?'FA 계약':'구단 보류'}</span></div><div class="money-primary">${money(c.contract?.annualMan||0)}<small>${c.salaryPending?'지난 시즌 연봉':'이번 시즌 연봉'}</small></div>${c.contract?.kind==='fa'?`<p>${c.contract.years}년 최대 ${money(c.contract.totalMan)} · 보장 ${money(c.contract.guaranteedMan)} · 잔여 ${c.contract.left}년</p>`:'<p>소속 유지 · 시즌 종료 후 연봉 조정</p>'}<div class="fa-progress"><span>FA 인정 시즌 <b>${fa.seasons} / ${fa.required}</b></span><div class="ability-track"><i style="width:${Math.min(100,fa.seasons/fa.required*100)}%"></i></div><small>미달 시즌 합산 잔여 ${fa.partialDays}일 / 145일${fa.contractBlocked?' · 다년계약 만료 후 선언 가능':''}</small></div><dl class="compact-info"><div><dt>지급받은 총 연봉</dt><dd>${money(totalSalary(c))}</dd></div><div><dt>받은 계약금</dt><dd>${money(c.signingIncome)}</dd></div></dl>${c.legacySalaryYears?`<p class="notice-line">구버전 ${c.legacySalaryYears}시즌 연봉 미기록. 총액은 v2 기록부터 합산합니다.</p>`:''}</section>`;}
function salaryPanel(){const base=salaryOffer(career);return `<section class="panel salary-panel"><span class="eyebrow">스토브리그 의사결정</span><h2>연봉 협상</h2><p>구단 제안 ${money(base)} · 1년 보류선수 계약</p><div class="actions">${btn('제안 수락','salary-accept')}${btn('13% 인상 요청','salary-counter','secondary')}</div><p class="chart-note">인상 요청은 거절될 수 있습니다. 거절되면 기본 제안으로 계약합니다.</p></section>`;}
function trainingPanel(){
  const c=career,plan=trainingPlan(c.training);
  return `<section class="panel training-panel"><div class="section-title"><h2>훈련 중점</h2><span>${c.servicePath==='regular'&&c.service?'현역 복무 중 선택 불가':`${plan.selected.length} / 3개 선택`}</span></div>${c.servicePath==='regular'&&c.service?'<p>현역 복무 중에는 구단 훈련을 진행하지 않습니다.</p>':`<div class="training-grid">${KEYS[c.player.role].map((name,i)=>`<button class="training-option ${plan.selected.includes(i)?'selected':''}" data-training="${i}" aria-pressed="${plan.selected.includes(i)}"><span>${name}</span><strong>${Number(c.player.a[i].toFixed(1))}</strong><small>${plan.selected.includes(i)?`${(100/plan.selected.length).toFixed(plan.selected.length===3?1:0)}% · 훈련 +${Number(plan.gainEach.toFixed(1))}`:'선택 안 함'}</small></button>`).join('')}</div>`}<div class="training-footer"><p>${c.servicePath==='regular'&&c.service?'경기 출전과 구단 훈련 없이 복무합니다.':'훈련량 100%를 선택한 능력에 균등 배분합니다.'}</p>${btn('시즌 진행 화면으로','begin-season','primary',busy)}</div></section>`;
}
function seasonPanel(){const c=career,service=c.servicePath==='regular'&&c.service;return `<section class="panel season-gate"><span class="eyebrow">${c.stage==='고교'?'고교 3학년':c.service?'복무':c.stage==='대학'?'대학':'프로'} 시즌</span><h2>${c.year}년 ${esc(c.player.name)}의 시즌</h2><p>${service?'현역 복무 기간입니다. 공식 경기에 출전하지 않습니다.':`${esc(c.player.position)} · ${c.stage==='프로'?esc(rosterPlan(c).label):esc(c.stage)} · 선택 훈련 ${c.training.map(i=>KEYS[c.player.role][i]).join(' · ')}`}</p><div class="actions">${btn(service?'복무 기간 진행':'시즌 플레이','simulate')}${btn('준비로 돌아가기','back-prepare','secondary')}</div><p class="chart-note">시즌 결과가 계산되면 주요 경기와 사건을 짧게 보여줍니다. 언제든 건너뛸 수 있습니다.</p></section>`;}
function playbackPanel(){const row=latest(),step=playback?.step||0,league=row?.league,events=[`${row.year} 시즌 개막`,`${row.stage==='프로'?'1군':'시즌'} ${row.stat.g}경기 · ${row.role==='bat'?`${row.stat.h}안타`:`${Math.floor(row.stat.outs/3)}이닝`}`,row.minorStat?.g?`2군 ${row.minorStat.g}경기 소화`:row.report?.[0]||'시즌 중반',row.report?.at(-1)||`${row.level} 시즌 마무리`];return `<section class="panel season-playback" aria-live="polite"><span class="eyebrow">${row.year} 시즌 진행</span><h2>${esc(events[Math.min(step,events.length-1)])}</h2><div class="season-diamond" aria-hidden="true"><span>1회</span><span>5회</span><span>9회</span></div><div class="playback-track"><i style="width:${(step+1)*25}%"></i></div><p>${league?`${league.games}경기 일정 · ${row.level}`:'공식 경기 없음 · 복무 진행'}</p><div class="actions">${btn('결과 바로 보기','skip-playback')}${btn('빠르게 진행','fast-playback','secondary')}</div></section>`;}
function startPlayback(){playback={step:0};render();if(matchMedia('(prefers-reduced-motion: reduce)').matches){finishPlayback();return;}document.querySelector('[data-action="skip-playback"]')?.focus();playbackTimer=setInterval(()=>{if(!playback)return;const focus=document.activeElement?.dataset.action;playback.step++;if(playback.step>=4)finishPlayback();else{render();if(focus)document.querySelector(`[data-action="${focus}"]`)?.focus();}},600);}
function finishPlayback(){clearInterval(playbackTimer);playbackTimer=null;playback=null;render();document.querySelector('[data-action="next"]')?.focus();}
function preparePanel(){
  const c=career,p=c.player,roster=rosterPlan(c),recruit=sangmuRecruitment(c),conversion=conversionOffer(c),positionChange=positionOffer(c);
  let info=c.stage==='프로'?`<section class="panel role-panel"><div class="section-title"><h2>${c.service?'복무':'출전 등급'}</h2><span>${c.service?`잔여 ${c.service}시즌`:'시즌 준비 평가'}</span></div>${c.service?`<strong class="role-name">${c.servicePath==='athletic'?'상무':'현역'}</strong><p>${c.servicePath==='athletic'?'2군 경기 출전 · 경기감각 유지':'공식 경기 없음 · 경기감각 감소'}</p>`:`<div class="tier-steps">${LEVELS.map((x,i)=>`<span class="${i===roster.tier?'active':''}">${x}</span>`).join('')}</div><p>${p.position}${roster.cameo?' / 백업 교체 출장':''}${c.adapt?` · 적응 ${c.adapt}시즌`:''}</p>`}</section>`:scoutPanel();
  return `${c.salaryPending?salaryPanel():''}${info}${trainingPanel()}<div class="two-columns"><section class="panel"><div class="section-title"><h2>능력치</h2><span>${esc(p.type)}</span></div>${abilityList(p)}</section>${c.stage==='프로'?contractPanel():`<section class="panel"><h2>진로</h2><dl class="compact-info"><div><dt>소속</dt><dd>${c.stage}</dd></div>${c.stage==='대학'?`<div><dt>대학 시즌</dt><dd>${c.collegeSeasons} / 4시즌 완료</dd></div>`:''}</dl><p>${c.stage==='고교'?'시즌 종료 후 드래프트 참가 또는 대학 진학.':'2학년 성적 우수자는 얼리드래프트에 참가할 수 있습니다. 4시즌 이수 시 대졸 FA 기준을 적용합니다.'}</p></section>`}</div>
  ${c.stage==='프로'&&!c.service&&c.proYears>=2?`<section class="panel"><h2>소속 구단 결정</h2><p>트레이드를 요청하면 구단이 전력과 계약을 검토합니다. 요청이 거절될 수도 있습니다.</p>${btn(c.tradeRequestYear===c.year?'올해 요청 완료':'트레이드 요청','trade-request','secondary',c.tradeRequestYear===c.year)}</section>`:''}
  ${!c.served&&!c.service&&c.stage!=='고교'?`<details class="panel management-panel"><summary>병역 <span>${c.athleticTried===c.year?'상무 지원 완료':'입대 계획'}</span></summary><div class="two-columns"><article class="choice"><h3>상무</h3><div class="choice-number">${recruit.slots}<small>명 · ${p.role==='bat'?'야수':'투수'} 모집</small></div><p>${recruit.eligible?`예상 합격률 ${Math.round(recruit.probability*100)}%`:'지원 조건: 만 27세 이하 · 프로 1시즌 이상'}${recruit.alreadyApplied?'<br>올해 재지원 불가. 현역 입대는 선택 가능합니다.':''}</p><p class="small">2시즌 · 2군 출전 · 경기감각 유지<br>모집 인원과 경쟁률은 게임 내 가상 심사입니다.</p>${btn('상무 지원','athletic','secondary',!recruit.eligible||!recruit.slots||recruit.alreadyApplied)}</article><article class="choice"><h3>현역</h3><div class="choice-number">2<small>시즌</small></div><p>선발 절차 없음 · 공식 경기 없음<br>경기감각 감소, 체력 단련 이벤트 가능</p>${btn('현역 입대','military','secondary')}</article></div></details>`:''}
  ${positionChange?`<section class="panel"><h2>코치 제안 · ${positionChange.target}</h2><p>${positionChange.benefit}<br>${positionChange.cost}<br>${positionChange.opportunity}</p><div class="actions">${btn('포지션 변경','change-position','secondary')}${btn('현재 포지션 유지','keep-position','text')}</div></section>`:''}
  ${conversion?`<section class="panel warning"><h2>전향 제안 · ${conversion.target}</h2><p>${conversion.reason}</p><p>${p.role==='bat'?'송구→구속, 선구의 70%→제구. 변화구 30부터 시작.':'제구의 70%→컨택, 구속의 65%→파워. 선구 35부터 시작.'} 적응 2시즌 · 성공 보장 없음 · 이전 기록 보존</p><div class="actions">${btn('전향','convert','secondary')}${btn('거절','decline-convert','text')}</div></section>`:''}
  <div class="bottom-actions">${btn(c.age>=35?'은퇴 검토':'은퇴','retire','text')}</div>`;
}
function pathPanel(){const c=career,attempted=c.draftAttempts.some(x=>x.year===c.year);return `${scoutPanel()}<section class="panel"><h2>고교 졸업 후 진로</h2><div class="two-columns"><article class="choice"><h3>신인 드래프트</h3><p>지명 구단으로 입단합니다.<br>구단 선택 불가 · 미지명 가능</p>${btn(attempted?'올해 미지명':'드래프트 참가','draft','primary',attempted)}${attempted?btn('육성 입단 테스트','tryout','secondary'):''}</article><article class="choice"><h3>대학 진학</h3><p>4시즌 이수 · 대졸 FA 인정 7시즌<br>2학년 성적 우수 시 얼리드래프트 가능</p>${btn('대학 진학','college','secondary')}</article></div></section>`;}
function draftResultPanel(){const d=career.lastDraft;return `<section class="panel draft-result"><span class="eyebrow">드래프트 결과</span><h2>${d.selected?TEAMS[d.team]:'미지명'}</h2>${d.selected?`<strong>${d.round}라운드 <span>전체 ${d.pick}순위</span></strong><div class="metrics"><div><span>연봉</span><strong>${money(career.contract.annualMan)}</strong></div><div><span>계약금</span><strong>${money(d.bonusMan)}</strong></div></div><p>지명 구단이 계약교섭권을 보유합니다.</p>`:`<p>${d.kind==='early'?'대학에 남아 다음 시즌을 준비합니다.':'대학 진학 또는 육성 입단 테스트를 선택할 수 있습니다.'}</p>`}${btn('확인','finish-draft')}</section>`;}
function faPanel(){const fa=faStatus(career);return `<section class="panel"><h2>FA 자격 취득</h2><div class="scout-numbers"><div><span>인정 시즌</span><strong>${fa.seasons}<small>/ ${fa.required}</small></strong></div></div><p>권리를 행사하면 다른 구단과 협상할 수 있습니다. 유보하면 소속 구단의 보류 상태와 FA 자격을 유지합니다.</p><div class="actions">${btn('FA 선언','declare-fa')}${btn('선언 유보 · 잔류','defer-fa','secondary')}</div></section>`;}
function marketPanel(){return `<section class="panel"><div class="section-title"><h2>FA 제안</h2><span>금액: 만원 / 억</span></div><div class="offer-grid">${offers(career).map((o,i)=>`<article class="offer"><h3>${TEAMS[o.team]}</h3><strong>최대 ${money(o.totalMan)}</strong><p>${o.years}년 · ${o.grade}등급 추정</p><dl class="compact-info"><div><dt>보장 총액</dt><dd>${money(o.guaranteedMan)}</dd></div><div><dt>연봉</dt><dd>${money(o.annualMan)}</dd></div><div><dt>계약금</dt><dd>${money(o.signingBonusMan)}</dd></div><div><dt>성과 옵션</dt><dd>${money(o.optionMan)}</dd></div><div><dt>예상 역할</dt><dd>${o.role}</dd></div><div><dt>구단 전력</dt><dd>${o.power} / 100</dd></div><div><dt>등록 시 출장률</dt><dd>${Math.round(o.opportunity*100)}%</dd></div></dl><p class="chart-note">이적 보상: ${o.team===career.player.team?'해당 없음':o.compensation}</p>${btn('계약','sign:'+i)}</article>`).join('')}</div><p class="chart-note">등급은 전체 구단의 실제 연봉 순위가 없는 게임 내 추정치입니다. 이적 보상은 구단 제안 금액에 반영됩니다.</p></section>`;}
function incidentPanel(){const injury=injuryForecast(career);return `<section class="panel"><h2>${injury?.name||'부상'} · 복귀 계획</h2><p>기본 예상 결장 ${injury?.days||0}경기. 선택 후 시즌 기록을 확정합니다.</p><div class="two-columns"><article class="choice"><h3>충분한 재활</h3><p>결장 +14경기 · 복귀 컨디션 90<br>다음 부상 확률 −4%p</p>${btn('재활 후 복귀','rehab:safe')}</article><article class="choice"><h3>조기 복귀</h3><p>결장 −10경기 · 복귀 컨디션 72<br>다음 부상 확률 +6%p</p>${btn('조기 복귀','rehab:fast','secondary')}</article></div></section>`;}
function availableLevels(row){const list=[];if(row?.league)list.push({key:'major',label:row.stage==='프로'?'1군':row.stage,league:row.league,stat:row.stat});if(row?.minorLeague)list.push({key:'minor',label:row.military?'상무 · 2군':'2군',league:row.minorLeague,stat:row.minorStat});return list;}
function activeResult(row){const levels=availableLevels(row);return levels.find(x=>x.key===resultLevel)||levels.find(x=>x.stat?.g>0)||levels[0]||null;}
function levelTabs(row){return `<div class="segment">${availableLevels(row).map(x=>`<button data-result-level="${x.key}" class="${activeResult(row)?.key===x.key?'selected':''}">${x.label} <b>${x.stat.g}경기</b></button>`).join('')}</div>`;}
function leaderboards(league,role,compact=false){
  let specs=TITLES.filter(x=>x[1]===role);
  if(role==='pitch')specs.splice(1,0,['WHIP','pitch','whip',true]);
  if(compact)specs=specs.filter(x=>role==='bat'?['avg','h','hr','obp'].includes(x[2]):['w','era','whip','sv'].includes(x[2]));
  return `<div class="leaders">${specs.map(([name,,key,qualified])=>{
    const rows=ranking(league,role,key,qualified),mine=rows.find(x=>x.id==='user'),lower=['era','whip'].includes(key);
    const rank=p=>1+rows.filter(x=>lower?x.value<p.value:x.value>p.value).length;
    const winner=league.awards?.find(x=>x.title===name);
    return `<article class="leader-card"><div><h3>${name}</h3><small>${key==='whip'?'비교 지표 · 수상 없음':league.level==='major'?'시즌 타이틀':'기록 비교'}</small></div><ol>${rows.slice(0,3).map(p=>`<li class="${p.id==='user'?'mine':''}"><span>${rank(p)}</span><b>${esc(p.name)}<small>${esc(league.teams.find(t=>t.id===p.team)?.name)}</small></b><strong>${displayStat(p.stat,role,key)}</strong></li>`).join('')||'<li>규정 충족 선수 없음</li>'}</ol><p>내 순위 <b>${mine?`${rank(mine)}위 · ${displayStat(mine.stat,role,key)}`:'자격 미달 / 출장 없음'}</b></p><small>${qualified?role==='bat'?`${Math.ceil(league.games*3.1)}타석 이상`:`${league.games}이닝 이상`:'출장 선수 전체'}${winner?.winners.length>1?` · 공동 수상 ${winner.winners.length}명`:''}</small></article>`;
  }).join('')}</div>`;
}
function resultPanel(row){
  const selected=activeResult(row);
  return `<section class="panel result-summary"><div class="section-title"><h2>${row.year} 시즌 결과</h2><span>${esc(row.level)}</span></div>${levelTabs(row)}${selected?metrics(selected.stat,row.role):'<p>현역 복무 · 공식 경기 기록 없음</p>'}<div class="result-facts">${row.stage==='프로'?`<span>${row.registrationEstimated?'추정 등록':'1군 등록'} <b>${row.registeredDays||0}일</b></span><span>지급 연봉 <b>${money(row.salaryMan)}</b></span>`:''}${row.military?`<span>군 보류수당 <b>${money(row.allowanceMan||0)}</b></span>`:''}<span>경기감각 <b>${Math.round(row.gameSense??career.gameSense)}</b></span></div>${row.awards.length?`<div class="awards">${row.awards.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${row.report?.length?`<ul class="report-list">${row.report.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<div class="actions">${btn('다음 시즌','next')}${btn('전체 기록','records','secondary')}</div></section>
  ${selected?percentileChart(selected.league,row.role):''}
  ${career.stage!=='프로'&&!row.military?scoutPanel():''}
  ${selected?`<section class="panel"><div class="section-title"><h2>${selected.league.level==='major'?'주요 타이틀':'주요 기록'}</h2><span>${row.role==='bat'?'타격':'투구'}</span></div>${leaderboards(selected.league,row.role,true)}</section>`:''}
  <section class="panel"><div class="section-title"><h2>능력 변화</h2><span>훈련·출장·이벤트 합산</span></div>${abilityList({a:row.aAfter||career.player.a,role:row.role},row.aBefore)}</section>`;
}
function retirement(){const c=career;return `<section class="panel retirement"><h2>${esc(c.player.name)} · 은퇴</h2><div class="retirement-stats"><div><span>프로 시즌</span><strong>${c.proYears}</strong></div><div><span>지급받은 총 연봉</span><strong>${money(totalSalary(c))}</strong></div><div><span>계약금 합계</span><strong>${money(c.signingIncome)}</strong></div><div><span>군 보류수당</span><strong>${money(c.allowanceIncome)}</strong></div></div><p>미지급 잔여 계약액은 총 연봉에 포함하지 않습니다.${c.legacySalaryYears?` 구버전 ${c.legacySalaryYears}시즌 연봉은 미기록입니다.`:''}</p><div class="actions">${btn('커리어 기록','records')}${btn('저장 파일 내보내기','export','secondary')}</div></section>${recordsBody('major')}`;}
function club(){
  if(!career)return creation();const c=career;
  const titles={prepare:'스토브리그',season:c.stage==='고교'?'고3 시즌 진행':c.stage==='대학'?'대학 시즌 진행':'정규시즌 진행',result:c.stage==='고교'?'고3 시즌 결과':'시즌 결과',path:'진로 선택',draft:'신인 드래프트',draft_result:'지명 결과',college_choice:'얼리드래프트',fa_choice:'스토브리그 · FA 자격',market:'스토브리그 · FA 시장',incident:'부상',retired:'은퇴 기록',undrafted:'미지명'};
  let body='';
  switch(c.phase){
    case 'prepare':body=preparePanel();break;
    case 'season':body=seasonPanel();break;
    case 'result':body=resultPanel(latest());break;
    case 'path':body=pathPanel();break;
    case 'draft':body=scoutPanel()+`<section class="panel"><h2>대학 졸업 · 드래프트</h2><p>4시즌 이수. 지명되면 해당 구단으로 입단합니다.</p>${btn('드래프트 참가','draft')}</section>`;break;
    case 'draft_result':body=draftResultPanel();break;
    case 'college_choice':body=scoutPanel()+`<section class="panel"><h2>대학 2학년 · 조기 진출</h2><p>지명 시 프로 입단, 미지명 시 대학에 남습니다. 조기 입단자는 대졸 FA 단축 기준을 적용하지 않습니다.</p><div class="actions">${btn('얼리드래프트 참가','early')}${btn('대학 잔류','stay-college','secondary')}</div></section>`;break;
    case 'undrafted':body=`<section class="panel"><h2>드래프트 미지명</h2><p>육성 입단 테스트를 통해 한 구단에서 선수 생활을 이어갑니다.</p>${btn('육성 입단 테스트','tryout')}</section>`;break;
    case 'fa_choice':body=faPanel();break;
    case 'market':body=marketPanel();break;
    case 'incident':body=incidentPanel();break;
    case 'retired':body=retirement();break;
    default:body='<div class="alert">진행 상태를 확인할 수 없습니다. 저장 파일을 내보내세요.</div>';
  }
  return header(titles[c.phase]||'선수',`${c.year}년 · ${c.stage==='대학'?`대학 ${Math.min(4,c.collegeSeasons+1)}학년`:esc(c.stage)}`)+body;
}
function recordsBody(mode=recordMode){
  const c=career,rows=c.history;
  if(mode==='salary')return `<section class="panel"><div class="section-title"><h2>연봉 지급 내역</h2><strong>${money(totalSalary(c))}</strong></div><p>계약금·군 보류수당·미지급 계약액은 연봉 합계에서 제외합니다.</p>${c.legacySalaryYears?`<p class="notice-line">구버전 ${c.legacySalaryYears}시즌은 연봉 미기록입니다.</p>`:''}<div class="table-scroll"><table><thead><tr><th>시즌</th><th>구단</th><th>지급 연봉</th><th>군 보류수당</th></tr></thead><tbody>${c.salaryLedger.map(x=>`<tr><th>${x.year}</th><td>${TEAMS[x.team]}</td><td>${money(x.salaryMan)}</td><td>${money(x.allowanceMan)}</td></tr>`).join('')||'<tr><td colspan="4">지급 기록 없음</td></tr>'}</tbody></table></div></section><section class="panel"><h2>계약 내역</h2><div class="table-scroll"><table><thead><tr><th>시즌</th><th>구단</th><th>구분</th><th>보장액</th><th>옵션</th><th>최대 총액</th></tr></thead><tbody>${(c.contractHistory||[]).map(x=>`<tr><th>${x.year}</th><td>${TEAMS[x.team]}</td><td>${x.kind==='fa'?'FA':'연봉 협상'}</td><td>${money(x.guaranteedMan)}</td><td>${money(x.optionMan||0)}</td><td>${money(x.totalMan)}</td></tr>`).join('')||'<tr><td colspan="6">기록된 계약 없음</td></tr>'}</tbody></table></div></section>`;
  return ['bat','pitch'].filter(role=>rows.some(x=>x.role===role)).map(role=>{
    const filtered=rows.filter(x=>x.role===role&&(mode==='major'?x.stage==='프로'&&!x.military:mode==='minor'?x.stage==='프로':x.stage!=='프로'&&!x.military));
    const entries=filtered.map(x=>({label:`${x.year} · ${x.military?'상무':teamName(x)} · ${x.position}`,stat:mode==='minor'?x.minorStat:x.stat}));
    const counted=filtered.filter(x=>!x.military).map(x=>mode==='minor'?x.minorStat:x.stat).filter(Boolean);
    return `<section class="panel"><div class="section-title"><h2>${role==='bat'?'타격':'투구'} 기록</h2><span>${mode==='major'?'1군':mode==='minor'?'2군 · 상무':'고교 · 대학'}</span></div>${entries.length?statTable([{label:mode==='minor'?'2군 통산 (상무 제외)':'통산',stat:sumStats(counted,role),total:true},...entries],role):'<div class="empty small-empty">해당 기록 없음</div>'}${mode==='minor'?'<p class="chart-note">상무 시즌은 별도 행으로 표시하며 구단 2군 통산에서는 제외합니다. 구버전 2군 기록은 —로 표시합니다.</p>':''}</section>`;
  }).join('');
}
function records(){if(!career)return header('기록')+'<div class="empty">선수를 먼저 생성하세요.</div>';return `${header('커리어 기록',`${career.history.length}시즌`,btn('내보내기','export','secondary'))}<div class="segment record-tabs">${[['major','1군'],['minor','2군 · 상무'],['amateur','아마추어'],['salary','연봉']].map(([key,name])=>`<button data-record-mode="${key}" class="${recordMode===key?'selected':''}">${name}</button>`).join('')}</div>${career.history.length?recordsBody():'<div class="empty">시즌 기록 없음</div>'}<section class="panel"><h2>1군 수상</h2><div class="awards">${career.history.filter(x=>x.stage==='프로'&&!x.military).flatMap(x=>x.awards.map(a=>`<span>${x.year} ${esc(a)}</span>`)).join('')||'<p>수상 기록 없음</p>'}</div></section>`;}
function leaguePage(){
  if(!career?.history.length)return header('리그')+'<div class="empty">확정된 시즌 없음</div>';
  const row=career.history.find(x=>x.year===Number(chosenYear))||latest(),selected=activeResult(row),league=selected?.league;
  const selector=`<label class="season-selector">시즌<select id="season-select">${career.history.map(x=>`<option value="${x.year}" ${x.year===row.year?'selected':''}>${x.year} · ${x.stage}${x.military?' / 복무':''}</option>`).join('')}</select></label>`;
  if(!league)return header('리그','',selector)+'<div class="empty">현역 복무 · 비교할 기록 없음</div>';
  const teamRows=[...league.teams].sort((a,b)=>b.w/(b.w+b.l||1)-a.w/(a.w+a.l||1));
  return `${header('리그 기록',`${league.year}년 · 팀당 ${league.games}경기`,selector)}${levelTabs(row)}${percentileChart(league,row.role)}<section class="panel"><h2>${league.level==='major'?'타이틀 순위':'기록 순위'} · ${row.role==='bat'?'타자':'투수'}</h2><p class="section-note">${row.position} 기록 기준 · 원값 동률은 공동 순위</p>${leaderboards(league,row.role)}</section><section class="panel"><h2>팀 순위</h2><div class="table-scroll"><table><thead><tr><th>순위</th><th>구단</th><th>경기</th><th>승</th><th>패</th><th>무</th><th>승률</th><th>득점</th><th>실점</th></tr></thead><tbody>${teamRows.map(t=>`<tr class="${t.id===row.team?'mine':''}"><th>${1+teamRows.filter(u=>u.w/(u.w+u.l||1)>t.w/(t.w+t.l||1)).length}</th><td>${esc(t.name)}</td><td>${t.g}</td><td>${t.w}</td><td>${t.l}</td><td>${t.tie}</td><td>${(t.w/(t.w+t.l||1)).toFixed(3)}</td><td>${t.r}</td><td>${t.ra}</td></tr>`).join('')}</tbody></table></div></section>${league.level==='major'?`<section class="panel"><h2>투표형 수상</h2><div class="vote-grid">${league.awards.filter(x=>x.candidates&&(!x.title.startsWith('베스트글러브')||x.title.endsWith(row.position))).map(x=>`<article><h3>${x.title}</h3>${x.candidates.map((a,i)=>`<p><span>${i+1}. ${esc(league.players.find(p=>p.id===a.id)?.name)}</span><b>${a.score.toFixed(3)}점</b></p>`).join('')}</article>`).join('')}</div></section>`:''}`;
}
function story(){return `${header('커리어 이력')}<section class="panel timeline">${career?.events.length?[...career.events].reverse().map(x=>`<article><strong>${x.year}</strong><p>${esc(x.text.replace(/(\d+(?:\.\d+)?)백만원/g,(_,n)=>money(Number(n)*100)))}</p></article>`).join(''):'<div class="empty small-empty">기록된 사건 없음</div>'}</section>`;}
function help(){return `${header('규칙')}<div class="rules-grid">
<section class="panel prose"><h2>드래프트 · FA</h2><p>신인 드래프트에서는 구단 선택이 없습니다. 지명 구단으로 입단하며, 응원 구단은 지명에 영향을 주지 않습니다. 지명 확률과 라운드는 아마추어 성적·출장량·능력·나이를 반영한 게임 추정치입니다.</p><p>보류선수는 소속 구단을 유지합니다. 매년 연봉을 조정해도 자유계약 선수가 되지 않습니다. 타 구단 복수 제안은 FA 권리를 행사한 뒤에만 열립니다.</p><p>FA는 1군 등록 145일 이상을 1시즌으로 인정합니다. 미달 시즌 등록일은 합산합니다. 고졸·얼리드래프트 입단은 8시즌, 대학 4시즌 이수 졸업자는 7시즌, 재취득은 4시즌입니다. 다년계약이 남으면 선언할 수 없습니다.</p><p>대학 2학년을 마치고 스카우트 평가 58 이상이면 얼리드래프트 선택이 열립니다. 1학년 조기 드래프트는 구현하지 않습니다. 조기 진출 미지명 시 대학에 남습니다.</p><p class="source-links"><a href="https://6ptotvmi5753.edge.naverncp.com/KBO_FILE/ebook/pdf/2025_%EC%95%BC%EA%B5%AC%EA%B7%9C%EC%95%BD.pdf" target="_blank" rel="noreferrer">KBO 규약 · 보류 / FA</a><a href="https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=8052" target="_blank" rel="noreferrer">KBO 얼리드래프트 안내</a></p></section>
<section class="panel prose"><h2>훈련 · 출전</h2><p>능력치 1~3개를 선택합니다. 훈련 보너스 총 3을 균등 배분합니다. 1개 +3, 2개 각각 +1.5, 3개 각각 +1입니다. 나이·부상·경기 경험·코치 변화는 별도입니다.</p><p>출전 등급은 2군 준주전 → 2군 주전 → 1군 백업 → 1군 준주전 → 1군 주전입니다. 능력·최근 성적·적응·경기감각으로 결정합니다. 1군 백업 타자는 경기 후반에 교체 출전합니다.</p><p>1군 144경기와 2군 108경기를 따로 시뮬레이션합니다. 같은 날짜에 1군과 2군에 중복 출전하지 않습니다. 등록일은 188일 가상 시즌의 등록 상태로 계산하며 출장 경기 수와 구분합니다.</p></section>
<section class="panel prose"><h2>백분위 · 수상</h2><p>0·50·100 축 위에 선수의 위치를 표시합니다. 100은 최상위입니다. 같은 값은 중간 순위를 적용합니다. ERA·WHIP·볼넷/9·타자 삼진%는 낮을수록 좋은 것으로 계산합니다.</p><p>타자는 비율 기록에서 최소 팀 경기의 1.5배 타석, 누적 기록에서 규정 타석을 기준으로 비교합니다. 투수는 선발과 구원을 나누며 기록마다 최소 이닝을 적용합니다. 비교 표본이 10명 미만이거나 내 표본이 부족하면 백분위를 표시하지 않습니다.</p><p>WAR·wRC+·WPA는 계산에 필요한 세부 기록을 모델링하지 않아 임의 값을 표시하지 않습니다. 현재 원기록으로 계산 가능한 항목만 제공합니다.</p><p>타이틀은 1군에만 수여합니다. 비율 타이틀은 규정 타석(경기×3.1 올림) 또는 규정 이닝(경기×1)을 충족해야 합니다. 원값이 같으면 공동 수상입니다. WHIP는 비교 지표이며 수상을 만들지 않습니다.</p></section>
<section class="panel prose"><h2>병역 · 전향</h2><p>상무는 만 27세 이하·프로 1시즌 이상이라는 게임 내 최소 조건으로 매년 한 번 지원할 수 있습니다. 투수 8명·야수 10명의 게임 내 슬롯에 대한 경쟁 심사를 진행하며 탈락할 수 있습니다. 이는 실제 연도별 공고 정원이나 자격이 아닙니다. 탈락 후에도 현역 입대는 가능합니다.</p><p>상무는 2군 경기와 훈련으로 경기감각을 유지합니다. 현역은 구단 훈련·공식 출전 없이 경기감각이 감소하고 기초 체력 유지·훈련 공백 이벤트만 적용됩니다. 두 경로 모두 2시즌 단위입니다.</p><p>투타 전향은 만 24세 이상, 최근 프로 3시즌 내내 충분한 표본에서 극심한 부진일 때만 제안합니다. 타자 OPS .530 미만(각 80타석 이상), 투수 ERA 7.50·WHIP 1.80 이상(각 20이닝 이상), 1·2군 합산 기준입니다. 커리어당 1회, 2시즌 적응, 거절하면 재제안하지 않습니다.</p></section>
<section class="panel prose"><h2>연봉 · 저장</h2><p>금액은 만원과 억으로 표시합니다. 2027년 최저 연봉 3300만원을 적용합니다. 통산 연봉은 실제 완료한 시즌에 지급된 연봉만 합산합니다. 계약금·군 보류수당·남은 계약액은 별도입니다.</p><p>같은 시드·저장·선택은 같은 결과를 냅니다. v1 저장도 불러올 수 있습니다. v1에 없던 과거 2군 성적과 연봉은 만들어 넣지 않고 미기록으로 표시합니다. 과거 1군 등록일은 출장량 추정치로 표시하므로 v1 경력자의 FA 시점에는 오차가 있습니다. v1 원본은 그대로 유지됩니다.</p><p class="source-links"><a href="https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=11814" target="_blank" rel="noreferrer">2027 최저 연봉 · KBO 발표</a></p></section>
<section class="panel prose"><h2>경기 모형</h2><p>각 타석의 볼넷·삼진·안타·홈런·아웃을 누적합니다. AVG·OBP·SLG·OPS·ERA·WHIP는 원기록으로 계산합니다. 이닝은 정수 아웃 수로 보관합니다.</p><p>승리투수는 최종 리드를 얻은 시점의 투수입니다. 선발은 5이닝을 채워야 하며 미충족 시 구원진의 최소 실점·최다 아웃 순으로 선정합니다. 투수 교체는 이닝 사이에만 하며 상대 타자 수·실점·체력·휴식과 점수 차를 반영합니다.</p><p>세이브는 승리투수가 아닌 마지막 투수가 1~3점 리드를 지킨 경우입니다. 홀드는 선발·마무리·승리투수를 제외한 구원진의 1~3점 리드 유지입니다. 끝내기·연장·실책·병살·사구·승계주자는 생략합니다. 실점은 모두 자책점입니다.</p><p>MVP 등은 공개 점수로 선정합니다. 타자: (OPS×.7+HR×.006+RBI×.002)×PA/600+수비×G/14400+팀승×.001. 투수: (4.7−ERA)×아웃/540+K×.002+SV×.02+HLD×.012+팀승×.001. 신인 후보와 포지션 후보를 구분합니다.</p></section></div>`;}
function render(){const content=playback?playbackPanel():view==='club'?club():view==='records'?records():view==='league'?leaguePage():view==='story'?story():help();$('#app').innerHTML=shell(content);bind();}
function bind(){
  document.querySelectorAll('[data-view]').forEach(el=>el.onclick=e=>{e.preventDefault();if(playback)finishPlayback();navigate(el.dataset.view);});
  document.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>act(el.dataset.action));
  document.querySelectorAll('[data-training]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.training),selected=[...career.training];if(selected.includes(i)){if(selected.length===1){message('최소 1개를 선택하세요.');return;}selected.splice(selected.indexOf(i),1);}else{if(selected.length===3){message('최대 3개까지 선택할 수 있습니다.');return;}selected.push(i);}career.training=selected;persist();render();});
  document.querySelectorAll('[data-record-mode]').forEach(el=>el.onclick=()=>{recordMode=el.dataset.recordMode;render();});
  document.querySelectorAll('[data-result-level]').forEach(el=>el.onclick=()=>{resultLevel=el.dataset.resultLevel;render();});
  const year=$('#season-select');if(year)year.onchange=()=>{chosenYear=year.value;resultLevel='auto';render();};
  const form=$('#new-form');if(form){
    form.elements.namedItem('role').onchange=()=>{const role=form.elements.namedItem('role').value==='투수'?'pitch':'bat';form.elements.namedItem('position').innerHTML=options(positions(role));form.elements.namedItem('type').innerHTML=options(TYPES[role]);};
    form.onsubmit=e=>{e.preventDefault();const p=Object.fromEntries(new FormData(form));p.role=p.role==='투수'?'pitch':'bat';p.team=Number(p.team);p.seed=Number(p.seed);p.name=p.name.trim();p.school=p.school.trim();if(!p.name||!p.school){message('이름과 고교를 입력하세요.');return;}if(p.hand==='좌투좌타'&&['포수','2루수','3루수','유격수'].includes(p.position)){message('좌투 선수는 1루수·외야수·지명타자를 선택하세요.');return;}prospect={...p,a:abilities(p.type,p.role,p.seed)};rerolls=3;render();};
  }
  $('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const raw=await file.text(),incoming=loadCareer({getItem:()=>raw});if(career&&!await confirmChoice('현재 커리어를 불러온 파일로 바꿉니다. 기존 기록을 보관하려면 먼저 내보내세요.'))return;career=incoming;view='club';chosenYear=null;resultLevel='auto';persist();render();message('불러오기 완료');}catch(err){message(`불러오기 실패: ${err.message}`);}};
}
async function act(action){
  if(busy)return;
  try{
    if(validViews.includes(action)){navigate(action);return;}
    if(action==='skip-playback'){finishPlayback();return;}
    if(action==='fast-playback'){clearInterval(playbackTimer);playbackTimer=setInterval(()=>{if(!playback)return;playback.step++;if(playback.step>=4)finishPlayback();else{render();document.querySelector('[data-action="fast-playback"]')?.focus();}},120);return;}
    if(action==='export'){if(!career)return;const url=URL.createObjectURL(new Blob([JSON.stringify(career)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`diamond-days-${career.year}.json`;a.click();URL.revokeObjectURL(url);return;}
    if(action==='reset'){if(!await confirmChoice('새 선수를 만들면 현재 자동 저장을 교체합니다. 필요한 기록은 먼저 내보내세요.'))return;localStorage.removeItem(SAVE_KEY);if(localStorage.getItem('diamond-days-v1'))localStorage.setItem('diamond-days-v1-archive',localStorage.getItem('diamond-days-v1'));localStorage.removeItem('diamond-days-v1');career=null;prospect=null;view='club';startingSeed=Math.floor(Math.random()*2147483646)+1;render();return;}
    if(action==='reroll'&&prospect&&rerolls){rerolls--;prospect.a=abilities(prospect.type,prospect.role,prospect.seed+(3-rerolls)*137);render();return;}
    if(action==='start'){career=createCareer(prospect);career.player.a=[...prospect.a];career.rerollsUsed=3-rerolls;persist();render();return;}
    if(!career)return;
    if(action==='begin-season'){if(career.salaryPending)throw Error('연봉 협상을 먼저 마치세요.');career.phase='season';persist();render();window.scrollTo(0,0);return;}
    if(action==='back-prepare'){career.phase='prepare';persist();render();return;}
    if(action==='salary-accept'||action==='salary-counter'){const result=negotiateSalary(career,action==='salary-counter');message(action==='salary-counter'?(result.accepted?'인상 요청이 수용됐습니다.':'인상 요청이 거절되어 기본 제안으로 계약했습니다.'):'연봉 계약을 확정했습니다.');}
    else if(action==='trade-request'){const accepted=requestTrade(career);message(accepted?'트레이드 요청이 수용됐습니다.':'구단이 트레이드 요청을 거절했습니다.');}
    if(action==='simulate'||action.startsWith('rehab:')){
      if(action==='simulate'&&injuryForecast(career)){career.pendingTraining=[...career.training];career.phase='incident';persist();render();window.scrollTo(0,0);return;}
      if(action.startsWith('rehab:'))career.rehabChoice=action.split(':')[1];
      busy=true;const trigger=$('[data-action="simulate"]');if(trigger){trigger.disabled=true;trigger.textContent='계산 중…';}
      await new Promise(resolve=>setTimeout(resolve,30));
      try{const candidate=structuredClone(career);progress(candidate,career.pendingTraining||career.training);career=candidate;resultLevel='auto';chosenYear=null;persist();startPlayback();return;}finally{busy=false;}
    }else if(action==='next'){nextYear(career);resultLevel='auto';}
    else if(action==='draft'){runDraft(career);}
    else if(action==='early'){if(!await confirmChoice('얼리드래프트에서 지명되면 해당 구단으로 입단합니다. 대졸 FA 단축 혜택은 적용되지 않습니다.'))return;runDraft(career,'early');}
    else if(action==='finish-draft')finishDraft(career);
    else if(action==='college')enterCollege(career);
    else if(action==='stay-college'){career.phase='prepare';career.events.push({year:career.year,text:'얼리드래프트 불참 · 대학 잔류'});}
    else if(action==='tryout')developmentalTryout(career);
    else if(action==='declare-fa'){if(!await confirmChoice('FA 권리를 행사하고 구단 제안을 받습니다.'))return;declareFA(career);}
    else if(action==='defer-fa')deferFA(career);
    else if(action.startsWith('sign:')){const offer=offers(career)[Number(action.split(':')[1])];if(!await confirmChoice(`${TEAMS[offer.team]} · ${offer.years}년 ${money(offer.totalMan)} 계약을 확정합니다.`))return;sign(career,offer);}
    else if(action==='military'||action==='athletic'){if(!await confirmChoice(action==='athletic'?'상무에 지원합니다. 합격하면 2시즌 복무하며, 탈락하면 현역 입대 또는 다음 해 재지원을 선택할 수 있습니다.':'현역으로 입대합니다. 2시즌 동안 나이가 흐르고 공식 경기에는 출전하지 않습니다.'))return;const success=enlist(career,action==='athletic'?'athletic':'regular');if(!success)message('상무 탈락. 현역 입대 선택은 유지됩니다.');}
    else if(action==='change-position'){if(!await confirmChoice('포지션과 능력이 바뀌며 한 시즌 적응이 필요합니다. 과거 기록은 유지됩니다.'))return;changePosition(career);}
    else if(action==='keep-position'){career.positionDecisionYear=career.year;}
    else if(action==='convert'){if(!await confirmChoice('투타 전향은 커리어당 한 번입니다. 능력치가 변환되고 2시즌 적응이 필요합니다.'))return;convert(career);}
    else if(action==='decline-convert'){career.conversionDeclined=true;career.events.push({year:career.year,text:'투타 전향 제안 거절'});}
    else if(action==='retire'){if(!await confirmChoice('은퇴하면 진행을 재개할 수 없습니다. 기록과 지급 연봉은 보존됩니다.'))return;retire(career);}
    persist();render();window.scrollTo(0,0);
  }catch(e){busy=false;message(e.message);}
}
render();
