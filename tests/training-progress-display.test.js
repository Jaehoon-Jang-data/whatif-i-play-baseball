import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,availableTraining,progress,saveCareer,loadCareer} from '../src/engine.js';
import {SEASON_PLAYBACK_STEPS,SEASON_PLAYBACK_STEP_MS,SEASON_PLAYBACK_DURATION_MS,seasonPlaybackState} from '../src/progress-display.js';
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

test('진행 바는 계산 결과와 무관하게 고정 0.75배 속도로 이동하고 둘 다 끝나야 전환된다',()=>{
  assert.equal(SEASON_PLAYBACK_STEPS,24);
  assert.equal(SEASON_PLAYBACK_STEP_MS,180/.75);
  assert.equal(SEASON_PLAYBACK_DURATION_MS,5760);
  assert.deepEqual(seasonPlaybackState(0,false),{step:0,ready:false});
  assert.deepEqual(seasonPlaybackState(239,true),{step:0,ready:false});
  assert.deepEqual(seasonPlaybackState(240,true),{step:1,ready:false});
  assert.deepEqual(seasonPlaybackState(2880,true),{step:12,ready:false});
  assert.deepEqual(seasonPlaybackState(5759,true),{step:23,ready:false});
  assert.deepEqual(seasonPlaybackState(5760,false),{step:23,ready:false});
  assert.deepEqual(seasonPlaybackState(5760,true),{step:23,ready:true});
  assert.deepEqual(seasonPlaybackState(8000,false),{step:23,ready:false});
  assert.deepEqual(seasonPlaybackState(8000,true),{step:23,ready:true});
});
