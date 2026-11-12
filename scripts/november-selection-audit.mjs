import * as E from '../src/engine.js';
const out={samples:0,complete:0,quotaErrors:0,teamLimitErrors:0,wildcardErrors:0,byAge:{}};
for(const seed of [11,83,313,571,977]){
 const league=E.simulateSeason({seed,year:2034});
 for(const age of [23,25,28,32])for(const position of ['포수','2루수','유격수','중견수','지명타자','선발','중간계투','마무리']){
  const role=['선발','중간계투','마무리'].includes(position)?'pitch':'bat',stat=role==='bat'?{...E.emptyBat(),g:135,pa:600,ab:530,h:175,d:30,t:3,hr:20,bb:65,hbp:3,sf:2}:{...E.emptyPitch(),g:position==='선발'?28:55,gs:position==='선발'?28:0,outs:position==='선발'?510:180,k:position==='선발'?170:65,bb:position==='선발'?40:15,hr:position==='선발'?15:4,r:position==='선발'?65:20,er:position==='선발'?60:18};
  const c=E.createCareer({seed,name:'선발 감사',role,position,team:seed%10});Object.assign(c,{stage:'프로',year:2034,age,proYears:6,latest:league});c.player.a.fill(75);c.history=[{year:2028,stage:'프로',role,stat,awards:[]}];
  const r=E.nationalSelectionChance(c,'아시안게임',stat),w=E.nationalSelectionChance(c,'WBC',stat),key=age+'-'+position,group=out.byAge[key]??={n:0,agExpected:0,wbcExpected:0};group.n++;group.agExpected+=r.chance;group.wbcExpected+=w.chance;out.samples++;
  if(r.roster){const a=r.roster.selected;out.complete+=+r.roster.complete;out.quotaErrors+=+(a.length>24||a.filter(p=>p.role==='pitch').length>11||a.filter(p=>p.position==='포수').length>2||a.filter(p=>['1루수','2루수','3루수','유격수','지명타자'].includes(p.position)).length>7||a.filter(p=>['좌익수','중견수','우익수'].includes(p.position)).length>4);out.wildcardErrors+=+(r.roster.wildcards>3);out.teamLimitErrors+=+[...new Set(a.map(p=>p.team))].some(t=>a.filter(p=>p.team===t).length>3);}
 }
}
if(out.quotaErrors||out.teamLimitErrors||out.wildcardErrors)throw Error('대표팀 정원·구성 위반');
console.log(JSON.stringify(out,null,2));
