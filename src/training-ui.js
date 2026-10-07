export function trainingOptionHtml(name,index,value,cap,chosen,hoursEach){
  const capped=cap!==undefined&&value>=cap,selected=chosen&&!capped;
  return `<button class="training-option ${selected?'selected':''} ${capped?'cap-reached':''}" data-training="${index}" aria-pressed="${selected}" ${capped?'disabled':''}><span>${name}</span><strong>${Number(value.toFixed(1))}</strong><small>${capped?`상한 ${cap}`:selected?`${hoursEach}% 배분`:'선택 안 함'}</small></button>`;
}
