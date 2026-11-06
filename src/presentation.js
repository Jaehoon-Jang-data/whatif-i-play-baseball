import {careerWAR,bestWarSeasons} from './war.js?v=7.25';
import {canonicalAwardName} from './engine.js?v=7.25';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function awardBadgesHtml(titles){
  return `<div class="awards">${titles.map(raw=>awardBadgeHtml(raw)).join('')}</div>`;
}
export function awardBadgeHtml(raw,detail=''){
  const title=canonicalAwardName(raw).split(' · ').join('·');
  return `<span class="award-badge"><b>${escapeHtml(title)}</b>${detail?`<small class="award-detail">${escapeHtml(detail)}</small>`:''}</span>`;
}
export function noAppearanceText(row){
  if(row.military)return `${row.servicePath==='athletic'?'상무':'현역'} 복무 · 공식 경기 기록 없음`;
  return row.injury?'부상·재활 · 출전 기록 없음':'이번 시즌 출전 기록 없음';
}

export const formatWAR=value=>value===null||!Number.isFinite(value)?'—':(Math.abs(value)<.05?0:value).toFixed(1);
export function warMetricHtml(result){
 return `<div class="rate-stat war-stat"><span>WAR</span><strong>${formatWAR(result.value)}</strong></div>`;
}
export function warNoteHtml(result){
 const text=result.value===null?result.reason:result.method==='FIP 계열 기록 기반'?'시뮬레이션 WAR · FIP 기반':'시뮬레이션 WAR · 수비 득점 중립';
 const estimated=result.value!==null&&result.notes.some(x=>x.includes('출장')||x.includes('구 기록'))?' · 일부 기록 추정':'';
 return `<p class="chart-note war-note">${escapeHtml(text+estimated)}</p>`;
}
export function warCareerHtml(rows,teamNames){
 const summary=careerWAR(rows),best=bestWarSeasons(rows);
 const teams=row=>[...new Set(row.teamSegments?.length?row.teamSegments.map(x=>x.team):[row.team])].map(t=>teamNames[t]||'소속 미기록').join(' → ');
 const main=row=>row.role==='bat'?`${row.stat.g}경기 · 타율 ${row.stat.ab?(row.stat.h/row.stat.ab).toFixed(3):'—'} · ${row.stat.hr}홈런 · ${row.stat.sb||0}도루`:`${Math.floor(row.stat.outs/3)}.${row.stat.outs%3}이닝 · ERA ${row.stat.outs?(row.stat.er*27/row.stat.outs).toFixed(2):'—'} · ${row.stat.k}삼진${row.position==='마무리'?` · ${row.stat.sv}세이브`:row.position==='중간계투'?` · ${row.stat.hold}홀드`:''}`;
 return `<section class="war-career"><h3>최고의 시즌 TOP 3 · WAR</h3><p>${summary.missing?'계산 가능한 시즌 합계':'통산'} WAR <b>${summary.known?formatWAR(summary.value):'—'}</b> · 정규시즌 1군${summary.missing?` · 리그 자료 없는 ${summary.missing}시즌 제외`:''}</p>${best.length?`<ol class="war-best-list">${best.map(({row,war,rank})=>`<li><div><b>${rank}위 · ${row.year}년</b><strong>WAR ${formatWAR(war.value)}</strong></div><p>${escapeHtml(teams(row))} · ${escapeHtml(row.position||'포지션 미기록')}</p><p>${escapeHtml(main(row))}</p>${warNoteHtml(war)}</li>`).join('')}</ol>`:'<p>WAR를 계산할 수 있는 프로 시즌 기록이 없습니다.</p>'}</section>`;
}

export function careerWarLabel(rows){
 const c=careerWAR(rows);return `${c.missing?'확인된 WAR':'통산 WAR'} ${formatWAR(c.known?c.value:null)}${c.missing?` · ${c.known}/${c.known+c.missing}시즌`:''}`;
}
