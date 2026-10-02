import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,progress,nextYear,beginDraft,revealDraft,finishDraft,acknowledgeEvent,loadCareer,saveCareer,offers,sign,retire} from '../src/engine.js';

const config={name:'흐름 확인',school:'경남고',role:'pitch',position:'선발',type:'제구형',team:0,seed:17,hand:'우투우타'};
const restore=c=>{let raw;saveCareer(c,{setItem:(_,value)=>raw=value});return loadCareer({getItem:()=>raw});};

test('고교 결과에서 드래프트 진행과 결과는 각각 저장되며 한 번만 추첨한다',()=>{
  let c=createCareer(config);progress(c);while(c.pendingEvent)acknowledgeEvent(c);nextYear(c);
  assert.equal(c.phase,'path');beginDraft(c);c=restore(c);assert.equal(c.phase,'draft_motion');assert.equal(c.draftAttempts.length,0);
  revealDraft(c);assert.equal(c.phase,'draft_result');assert.equal(c.draftAttempts.length,1);
  assert.throws(()=>revealDraft(c));c=restore(c);assert.equal(c.draftAttempts.length,1);finishDraft(c);
  assert.equal(c.phase,c.lastDraft.selected?'prepare':'path');
});

test('FA 계약 결과와 은퇴 상태가 저장되며 시즌 재진행을 막는다',()=>{
  let c=createCareer(config);c.stage='프로';c.phase='market';c.faDeclared=true;c.playerStatus='fa';c.age=30;c.year=2039;c.player.a.fill(80);
  const offer=offers(c)[0];sign(c,offer);assert.equal(c.phase,'contract_result');c=restore(c);
  assert.equal(c.lastContract.team,offer.team);assert.equal(c.lastContract.guaranteedMan,offer.guaranteedMan);
  assert.throws(()=>progress(c));retire(c,'본인 선택');c=restore(c);
  assert.equal(c.phase,'retired');assert.equal(c.retirementReason,'본인 선택');assert.throws(()=>progress(c));
});
