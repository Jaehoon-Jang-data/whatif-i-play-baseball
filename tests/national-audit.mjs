import {createCareer,nationalInvitation} from '../src/engine.js';
const results=[];
for(const name of ['WBC','프리미어12','아시안게임'])for(const age of [23,28,32,38])for(const position of ['중견수','선발','중간계투','마무리'])for(const quality of ['ordinary','elite']){
  let invited=0;const role=position==='중견수'?'bat':'pitch',year=name==='프리미어12'?2031:2030;
  for(let seed=1;seed<=200;seed++){
    const c=createCareer({seed,name:'검증',school:'가명고',role,position,type:role==='bat'?'교타형':'제구형',team:0});
    c.stage='프로';c.year=year;c.age=age;c.proYears=age<=23?3:9;c.player.a.fill(quality==='elite'?85:65);
    const stat=role==='bat'?{g:140,pa:quality==='elite'?580:440,ab:quality==='elite'?500:385,h:quality==='elite'?180:110,d:25,t:3,hr:quality==='elite'?28:12,bb:quality==='elite'?65:40,sf:7,hbp:0}:position==='선발'?{g:28,gs:28,outs:quality==='elite'?500:400,er:quality==='elite'?60:85,h:quality==='elite'?130:155,bb:quality==='elite'?35:55,k:quality==='elite'?170:115,sv:0,hold:0}:{g:55,gs:0,outs:quality==='elite'?175:125,er:quality==='elite'?18:33,h:quality==='elite'?40:55,bb:quality==='elite'?15:25,k:quality==='elite'?70:45,sv:position==='마무리'?(quality==='elite'?32:15):0,hold:position==='중간계투'?(quality==='elite'?25:12):0};
    invited+=Boolean(nationalInvitation(c,name,stat));
  }
  results.push({name,age,position,quality,invited,rate:invited/200});
}
console.log(JSON.stringify({seeds:'1–200 per cell',results},null,2));
