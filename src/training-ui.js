export function trainingOptionHtml(name,index,value,cap,chosen,hoursEach){
  const capped=cap!==undefined&&value>=cap,selected=chosen&&!capped;
  return `<button class="training-option ${selected?'selected':''} ${capped?'cap-reached':''}" data-training="${index}" aria-pressed="${selected}" ${capped?'disabled':''}><span>${name}</span><strong>${Number(value.toFixed(1))}</strong><small>${capped?`상한 ${cap}`:selected?`${hoursEach}% 배분`:'선택 안 함'}</small></button>`;
}

const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function programOptionHtml(program,chosen,keys){
 const capped=program.capped?.map(i=>keys[i]).join('·'),status=program.status||'';
 return `<button class="training-option program-option ${chosen&&program.enabled?'selected':''}" data-program="${program.id}" aria-pressed="${chosen&&program.enabled}" ${program.enabled?'':'disabled'}><b>${esc(program.name)}</b><span class="program-main">${esc(program.main)}</span><span class="program-secondary">${esc(program.support)}</span><small class="program-burden">${esc(program.burden)}</small>${status||!program.enabled||capped?`<small class="program-status">${esc(program.enabled?status:'성장 가능한 능력치 없음')}${capped?` <em class="cap-label">${esc(capped)} 상한 도달</em>`:''}</small>`:''}</button>`;
}
