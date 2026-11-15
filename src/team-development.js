import {PROGRAMS} from './training-programs.js?v=7.35';
import {expectedContribution} from './player-value.js?v=7.35';
const names={bat:['컨택','파워','선구','주루','수비','송구'],pitch:['구속','제구','구위','체력','변화구','위기관리']};
export function teamDevelopment(c){
 const p=c.player,pool=c.phase==='prepare'&&c.leagueRoster?.length?c.leagueRoster:c.latest?.level==='major'?c.latest.players:c.leagueRoster||[],peers=pool.filter(x=>x.id!=='user'&&x.team===p.team&&x.role===p.role&&x.position===p.position&&x.a?.length===6),base=expectedContribution(p).score;
 const benchmark=names[p.role].map((_,i)=>peers.length?peers.reduce((n,x)=>n+x.a[i],0)/peers.length:55),edges=p.a.map((v,i)=>({index:i,edge:v-benchmark[i],value:v}));
 const strengths=[...edges].sort((a,b)=>b.edge-a.edge||b.value-a.value).slice(0,2).map(x=>names[p.role][x.index]);
 const programs=PROGRAMS[p.role].map(program=>{const a=p.a.map((v,i)=>Math.max(v,Math.min(c.potentialCaps?.[i]??95,v+(program.weights[i]>=2?3:program.weights[i]>=.7?1:0)))),gain=expectedContribution({...p,a}).score-base;
 const focus=edges.filter(x=>program.weights[x.index]>=2),edge=focus.length?focus.reduce((n,x)=>n+x.edge,0)/focus.length:0,room=a.reduce((n,v,i)=>n+v-p.a[i],0);
 return {id:program.id,name:program.name,effect:program.weights.map((w,i)=>({w,i})).filter(x=>a[x.i]>p.a[x.i]).sort((a,b)=>b.w-a.w).slice(0,2).map(x=>names[p.role][x.i]).join('·'),gain,edge,room,score:gain+Math.max(0,Math.min(10,edge))*.04};}).filter(x=>x.room>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const best=programs.slice(0,2);
 return {compared:peers.length,hasEdge:edges.some(x=>x.edge>0),strengths,programs:best,focus:best[0]?.effect||'',role:p.role==='bat'&&['포수','유격수','2루수','중견수'].includes(p.position)&&(p.a[4]+p.a[5])/2>=62?'수비·백업 경쟁':p.role==='pitch'?`${p.position} 경쟁`:'타석 경쟁'};
}
