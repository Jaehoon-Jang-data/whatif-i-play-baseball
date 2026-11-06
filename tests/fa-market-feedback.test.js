import test from'node:test';import assert from'node:assert/strict';
import{createCareer,emptyBat,offers,salaryOffer,saveCareer,loadCareer,sign}from'../src/engine.js';
const make=()=>{const c=createCareer({seed:19,name:'시장 평가',school:'가상고',role:'bat',position:'지명타자',type:'교타형',team:0});Object.assign(c,{stage:'프로',year:2048,age:39,phase:'fa_choice',proYears:20,faCount:1,contract:{kind:'reserved',annualMan:85000,left:0}});c.player.a.fill(60);c.history=[2045,2046,2047].map(year=>({year,stage:'프로',role:'bat',position:'지명타자',stat:{...emptyBat(),g:60,pa:100,ab:90,h:22,d:4,hr:1,bb:10},awards:[]}));return c;};
test('FA 권리만으로 인상을 보장하지 않고 계약금·옵션을 같은 시장 예산에 포함한다',()=>{
 const c=make(),old=structuredClone(c.contract),stay=salaryOffer(c),preview=offers(c,true);assert.equal(preview.length,3);assert.ok(preview.every(x=>x.guaranteedMan/x.years<stay));
 for(const o of preview){assert.equal(o.guaranteedMan,o.annualMan*o.years+o.signingBonusMan);assert.equal(o.totalMan,o.guaranteedMan+o.optionMan);assert.ok(o.budget.annualCostMan<=o.budget.roomMan+o.budget.playerCostMan);assert.ok(o.annualMan>=3300);}
 assert.deepEqual(c.contract,old);let raw;saveCareer(c,{setItem:(_,s)=>raw=s});const restored=loadCareer({getItem:()=>raw});assert.deepEqual(offers(restored,true),preview);
 // The same generated quote is valid after declaration and signing.
 c.phase='market';c.faDeclared=true;assert.deepEqual(offers(c),preview);sign(c,preview[0]);assert.equal(c.contract.annualMan,preview[0].annualMan);assert.equal(c.signingLedger.at(-1).amountMan,preview[0].signingBonusMan);
 const good=make();good.age=28;good.player.a.fill(90);for(const r of good.history)Object.assign(r.stat,{g:140,pa:600,ab:520,h:180,d:35,hr:35,bb:80});assert.ok(Math.max(...offers(good,true).map(o=>o.guaranteedMan/o.years))>Math.max(...preview.map(o=>o.guaranteedMan/o.years))*2);assert.ok(offers(good,true).some(o=>o.years>=5));
});
