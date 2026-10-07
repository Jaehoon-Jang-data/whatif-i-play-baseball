import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,availableTraining,progress,saveCareer,loadCareer} from '../src/engine.js';
import {displayedProgressStep} from '../src/progress-display.js';
import {trainingOptionHtml} from '../src/training-ui.js';

const sample=()=>createCareer({seed:118,name:'훈련 검증',school:'검증고',team:0,role:'bat',position:'우익수',type:'교타형'});

test('상한에 도달한 중점은 저장·복구 및 실제 성장에서 제외된다',()=>{
  const c=sample();c.training=[0,1];c.player.a[0]=c.potentialCaps[0];
  assert.deepEqual(availableTraining(c),[1]);
  let raw;saveCareer(c,{setItem:(_,value)=>raw=value});
  const restored=loadCareer({getItem:()=>raw});assert.deepEqual(restored.training,[1]);
  const row=progress(restored,[0,1]);assert.deepEqual(row.training,[1]);
  assert.ok(!restored.training.includes(0));
  assert.equal(row.aBefore[0],c.potentialCaps[0]);
});

test('상한 버튼은 선택 표시 없이 비활성화되고 미도달 항목만 선택 표시된다',()=>{
  const capped=trainingOptionHtml('컨택',0,75,75,true,50);
  assert.match(capped,/aria-pressed="false" disabled/);
  assert.doesNotMatch(capped,/class="training-option selected/);
  assert.match(capped,/상한 75/);
  const active=trainingOptionHtml('파워',1,74,75,true,100);
  assert.match(active,/aria-pressed="true"/);
  assert.match(active,/100% 배분/);
  assert.doesNotMatch(active,/ disabled/);
});

test('모든 능력치가 상한이면 중점 없이 시즌을 진행하고 새로고침해도 유지된다',()=>{
  const c=sample();c.player.a=[...c.potentialCaps];c.training=[0,1];
  const row=progress(c);assert.deepEqual(row.training,[]);assert.deepEqual(c.training,[]);
  assert.equal(row.totalGrowth>=0,true);
  let raw;saveCareer(c,{setItem:(_,value)=>raw=value});
  assert.deepEqual(loadCareer({getItem:()=>raw}).training,[]);
});

test('표시 진행률은 완료 경기보다 앞서지 않고 초반 속도가 약 0.8배이며 결과 직전 따라잡는다',()=>{
  const values=Array.from({length:99},(_,i)=>(i+1)/100);
  const steps=values.map(displayedProgressStep);
  assert.ok(steps.every((step,i)=>step>=0&&step<=23&&(i===0||step>=steps[i-1])));
  assert.ok(values.every((value,i)=>steps[i]/23<=Math.min(1,value/.98)+1e-9));
  assert.ok(Math.abs(displayedProgressStep(.49)/10-.8)<.03);
  assert.ok(displayedProgressStep(.98)>21);
  assert.equal(displayedProgressStep(1),23);
});
