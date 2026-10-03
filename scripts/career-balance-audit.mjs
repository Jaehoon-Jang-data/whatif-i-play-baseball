import {pathToFileURL} from 'node:url';
const E=await import(pathToFileURL(process.argv[2]||new URL('../src/engine.js',import.meta.url).pathname));
const positions=['포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자','선발','중간계투','마무리'];
const trainings=[[0],[1],[0,1],[2,3],[4,5]];
const totals={n:100,criteria:{mvp:'정규시즌 MVP 1회 이상',regular:'22시즌 중 1군 주전 10시즌 이상'},mvp:0,regular:0,majorYears:0,minorYears:0,rookieMajor:0,byTraining:{},byRole:{},positionOffers:0,positionTargets:{},injuries:0,hamstrings:0,fa:[],salaryChanges:[],demotions:0};
for(let i=0;i<100;i++){
 const position=positions[i%positions.length],role=['선발','중간계투','마무리'].includes(position)?'pitch':'bat',seed=100+i*131,training=trainings[i%5];
 const c=E.createCareer({seed,name:'감사',school:'검증고',role,position,type:role==='bat'?'교타형':'변화구형',team:i%10});
 c.stage='프로';c.phase='prepare';c.age=19;c.year=2028;c.served=true;c.proYears=0;c.contract={kind:'reserved',annualMan:3300,years:1,left:1};c.reserved=true;c.playerStatus='reserved';c.lastDraft={selected:true,round:1+i%11,scout:{score:62+i%5*3}};c.history=[{year:2027,stage:'고교',role,position,stat:role==='bat'?{...E.emptyBat(),g:30,pa:120,ab:105,h:30}:{...E.emptyPitch(),g:20,gs:16,outs:100},awards:[]}];
 const offset=process.env.BALANCE_MODE==='natural'?0:[-8,-2,4,10][Math.floor(i/25)];c.player.a=c.player.a.map(v=>Math.max(30,Math.min(85,v+offset)));if(offset&&E.skillCaps)c.potentialCaps=E.skillCaps(c.player.a,c.seed,c.potential);
 let majors=0,minor=0,mvp=false,first=true;
 for(let season=0;season<22;season++){
  c.phase='prepare';c.pendingEvent=null;c.eventQueue=[];c.salaryPending=!c.contract||c.contract.left<=0;
  if(c.salaryPending){if(E.faStatus(c).eligible){c.phase='market';c.faDeclared=true;const o=E.offers(c)[i%3];totals.fa.push(o.totalMan);E.sign(c,o);c.phase='prepare';}else{const old=c.contract?.annualMan||3300;const result=E.negotiateSalary(c,i%4===0);totals.salaryChanges.push(result.annualMan-old);}}
  const offer=E.positionOffer(c);if(offer){totals.positionOffers++;const move=c.player.position+'→'+offer.target;totals.positionTargets[move]=(totals.positionTargets[move]||0)+1;}
  const row=E.progress(c,training);if(row.injury){totals.injuries++;if(row.injury.body==='햄스트링')totals.hamstrings++;}
  if(row.rosterMoves?.some(x=>x.from==='1군'&&x.to==='2군'))totals.demotions++;
  if(row.level==='1군 주전')majors++;if(row.minorStat?.g>0)minor++;if((row.awards||[]).includes('정규시즌 MVP'))mvp=true;
  if(first){totals.rookieMajor+=+(row.stat.g>0);first=false;}
  c.age++;c.year++;
 }
 E.retire(c,'41세 고정 관찰 종료');totals.mvp+=+mvp;totals.regular+=+(majors>=10);totals.majorYears+=majors;totals.minorYears+=minor;
 const group=totals.byTraining[training.join(',')]??={n:0,mvp:0,regular:0};group.n++;group.mvp+=+mvp;group.regular+=+(majors>=10);
 const rg=totals.byRole[role]??={n:0,mvp:0,regular:0};rg.n++;rg.mvp+=+mvp;rg.regular+=+(majors>=10);
 if(i%20===19)process.stderr.write(`completed ${i+1}\n`);
}
const summarize=a=>({n:a.length,min:Math.min(...a),median:a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)],max:Math.max(...a),mean:a.reduce((x,y)=>x+y,0)/a.length});
console.log(JSON.stringify({...totals,fa:summarize(totals.fa),salaryChanges:summarize(totals.salaryChanges)}));
