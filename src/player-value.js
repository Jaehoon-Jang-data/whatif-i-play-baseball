// Conservative ability-based projections for selection; these are not measured defensive WAR.
import {POSITION_RUNS} from './war.js?v=7.28';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function expectedContribution(p,{stat=p.stat,fatigue=p.fatigue||0,adapt=0,strategy='중립'}={}){
 const a=p.a||Array(6).fill(50);let batting=0,running=0,defense=0,position=0,pitching=0,innings=0,score;
 if(p.role==='bat'){
  batting=(a[0]-55)*.60+(a[1]-55)*.55+(a[2]-55)*.52;running=(a[3]-55)*.12;
  const weight={'포수':1.25,'유격수':1.2,'중견수':1.1,'2루수':1.05,'3루수':.95,'1루수':.55,'좌익수':.7,'우익수':.8,'지명타자':0}[p.position]??.8;
  defense=clamp(((a[4]-55)*.30+(a[5]-55)*.12)*weight,-12,12);position=(POSITION_RUNS[p.position]||0)*144/162;
  score=55+(batting+running+defense+position*.35)/2.2;
 }else{
  const starter=p.position==='선발',era=4.8-(a[0]-55)*.015-(a[1]-55)*.030-(a[2]-55)*.026-(a[4]-55)*.018-(a[5]-55)*.005;
  innings=starter?clamp(130+(a[3]-55)*2,65,195):clamp(52+(a[3]-55)*.35,30,75);pitching=(5.7-era)*innings/9;
  score=55+(4.8-era)*9+(a[3]-55)*(starter?.12:.035);
 }
 let recent=0;
 if(stat){const sample=p.role==='bat'?clamp((stat.pa||0)/350,0,1):clamp((stat.outs||0)/(p.position==='선발'?300:120),0,1);const form=p.role==='bat'?(stat.ab?((stat.h+stat.bb+(stat.hbp||0))/(stat.ab+stat.bb+(stat.hbp||0)+(stat.sf||0))+(stat.h+(stat.d||0)+2*(stat.t||0)+3*stat.hr)/stat.ab):.72):(stat.outs?4.5-stat.er*27/stat.outs:0);recent=p.role==='bat'?clamp((form-.72)*18,-6,6)*sample:clamp(form*1.6,-6,6)*sample;}
 const strategyBonus=strategy==='리빌딩'&&(p.age||28)<=24?(p.potential||1)>=1.08?4:2.5:strategy==='윈나우'&&(p.age||28)>=28&&(p.age||28)<=35?1:0;
 score+=recent+strategyBonus-fatigue*.08-Math.min(1,adapt)*8;
 return {score:clamp(score,15,99),runsAboveReplacement:p.role==='bat'?batting+running+defense+position+20:pitching,projectedWar:(p.role==='bat'?batting+running+defense+position+20:pitching)/10.5,components:{batting,running,defense,position,pitching},innings,recent,defenseMethod:'능력치 기반 제한적 예상 · 기록 WAR 아님'};
}
export function playingStyle(p,stat=p.stat,development={}){
 const a=[...p.a];
 if(p.role==='bat'&&stat?.pa>=200){if(stat.ab&&stat.h/stat.ab>=.3)a[0]+=2;if(stat.bb/stat.pa>=.12)a[2]+=2;if(stat.hr/stat.pa>=.05)a[1]+=2;if(stat.sba>=12&&stat.sb/stat.sba>=.75)a[3]+=2;}
 if(p.role==='pitch'&&stat?.outs>=120){if(stat.k*27/stat.outs>=9)a[2]+=2;if(stat.bb*27/stat.outs<2.5)a[1]+=2;if(stat.gs>=20&&stat.outs>=480)a[3]+=2;}
 const max=Math.max(...a),avg=a.reduce((n,v)=>n+v,0)/6;
 if(p.role==='bat'){
  if((a[4]+a[5])/2>Math.max(a[0],a[1],a[2])+4)return p.position==='포수'?'포수 수비형':p.position==='유격수'?'수비형 유격수':'수비형';
  if(Object.values(development.positionFamiliarity||{}).filter(v=>v>=45).length>=2&&max-Math.min(...a)<20)return '유틸리티형';
  if(a[3]>=Math.max(a[0],a[1],a[2])+4)return '주루형';
  if(a[2]>=Math.max(a[0],a[1])+3)return '선구형';
  if(a[1]>=a[0]+4)return '장타형';return a[0]>=avg+3?'컨택형':'균형형';
 }
 if(p.position==='마무리')return '마무리형';
 if(p.position==='중간계투'&&a[2]>=avg+3&&a[3]<a[2]-8)return '짧은 이닝 불펜형';
 if(p.position==='선발'&&a[3]>=Math.max(a[0],a[2])+4)return '선발 내구형';
 if(p.battedBall?.ground+p.battedBall?.air>=30&&p.battedBall.ground/(p.battedBall.ground+p.battedBall.air)>=.52&&a[1]>=65&&a[4]>=65)return '땅볼 유도형';
 if(a[0]>=Math.max(a[1],a[4])+3)return '구속형';if(a[4]>=a[1]+3)return '변화구형';return '제구형';
}
