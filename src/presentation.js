import {canonicalAwardName} from './engine.js?v=7.16';

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
