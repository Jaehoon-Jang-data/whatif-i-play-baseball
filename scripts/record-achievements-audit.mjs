// Isolated first-team seasons: checks record crossings, not full career balance.
import assert from 'node:assert/strict';
import {simulateSeason} from '../src/engine.js';
import {recordAchievements} from '../src/record-achievements.js';

const result={profiles:20,seasons:200,careerBadges:0,seasonBadges:0,repeatedCareerBadges:0,byRole:{}};
for(const role of ['bat','pitch']){
 const counts={profiles:10,seasons:100,careerBadges:0,seasonBadges:0,labels:{}};
 for(let seed=1;seed<=10;seed++){
  const history=[],seen=new Set(),position=role==='bat'?['포수','유격수','중견수','지명타자'][seed%4]:['선발','중간계투','마무리'][seed%3];
  for(let season=0;season<10;season++){
   const year=2030+season,league=simulateSeason({seed:seed*100+season,year,player:{name:'기록 감사',role,position,team:seed%10,a:Array(6).fill(65+seed*2),opportunity:1}}),stat=league.players.find(x=>x.id==='user').stat;
   const row={year,role,position,stage:'프로',stat,awards:[]};history.push(row);
   const records=recordAchievements(history,row);
   for(const record of records){
    const key=record.kind==='career'?'careerBadges':'seasonBadges';counts[key]++;result[key]++;
    counts.labels[record.label]=(counts.labels[record.label]||0)+1;
    if(record.kind==='career'){
     assert.ok(!seen.has(record.id),`Repeated ${seed} ${record.id}`);seen.add(record.id);
     assert.ok(record.before<record.threshold*record.scale&&record.after>=record.threshold*record.scale);
    }
   }
   assert.deepEqual(recordAchievements(JSON.parse(JSON.stringify(history)),JSON.parse(JSON.stringify(row))),records);
  }
 }
 result.byRole[role]=counts;
}
console.log(JSON.stringify(result,null,2));
