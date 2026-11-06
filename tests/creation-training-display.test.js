import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCreationDraft} from '../src/creation-flow.js';
import {programOptionHtml} from '../src/training-ui.js';
import {createCareer,programOptions} from '../src/engine.js';
test('구 생성 초안의 훈련 단계는 포지션 선택으로 이관하고 선택 포지션·후보는 보존한다',()=>{
 for(const [role,position]of [['bat','유격수'],['pitch','중간계투']]){
  const raw={step:'focus',profile:{role,position},position,selected:1,candidates:[{type:'가상'}],focus:[0,1]},draft=normalizeCreationDraft(raw);
  assert.equal(draft.step,'position');assert.equal(draft.position,position);assert.equal(draft.profile.position,position);assert.equal(draft.selected,1);assert.equal('focus'in draft,false);assert.deepEqual(normalizeCreationDraft(JSON.parse(JSON.stringify(draft))),draft);assert.deepEqual(raw.focus,[0,1]);
 }
 assert.equal(normalizeCreationDraft(null).step,'profile');
});
test('효과는 구체적 항목과 공통 색상 클래스로 나누고 추상 추천 멘트는 노출하지 않는다',()=>{
 for(const role of ['bat','pitch']){
  const c=createCareer({seed:17,name:'표시',school:'가상고',role,position:role==='bat'?'유격수':'선발',type:role==='bat'?'교타형':'제구형',team:0});
  for(const p of programOptions(c)){
   const html=programOptionHtml({...p,reason:'타격 전반의 안정성'},true,['컨택','파워','선구','주루','수비','송구']);assert.match(html,/class="program-main"/);assert.match(html,/class="program-secondary"/);assert.match(html,/class="program-burden"/);assert.doesNotMatch(html,/전반의 안정성|성장 방향 전환/);assert.ok(html.includes(p.main)&&html.includes(p.support)&&html.includes(p.burden));
  }
 }
});
