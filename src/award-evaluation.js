import {leagueWarContext,seasonWAR} from './war.js?v=7.34';

export const AWARD_MODEL_VERSION=1;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const games=(p,s)=>s.teams?.find(t=>t.id===p.team)?.g??s.games??144;
export function createAwardEvaluation(season){
 const context=leagueWarContext(season),values=new Map(season.players.map(p=>[p.id,context?seasonWAR({...p,year:season.year,stage:'프로'},{context}).value:null]));
 const war=p=>Number.isFinite(values.get(p.id))?values.get(p.id):null;
 return {war,score(p,secondary,fallback){const value=war(p);return value===null?fallback:100*value+clamp(secondary,0,10);},candidate(p,score,extra={}){const value=war(p);const warPrimary=value!==null&&extra.warPrimary!==false;return{id:p.id,score,war:value,warPrimary,warPoints:warPrimary?value*100:null,secondary:warPrimary?score-value*100:null,...extra};}};
}
export function rookieAwardEligibility(p,season,war){
 const year=p.rookieYear,officialEligible=!!p.rookie&&p.stat.g>0&&!p.foreignProHistory&&(year!=null?season.year-year>=0&&season.year-year<=5&&(p.priorPa||0)<=60&&(p.priorOuts||0)<=90:p.age===undefined||p.age<=24);
 const g=games(p,season),sampleEligible=p.role==='bat'?p.stat.pa>=Math.ceil(Math.floor(g*3.1)*.5):p.stat.outs>=Math.ceil(g*3*(p.position==='선발'?.5:.25))&&(p.position==='선발'||p.stat.g>=30);
 // Game merit floor, distinct from official rookie eligibility.
 const valueEligible=war===null||war>=1;
 return {officialEligible,sampleEligible,valueEligible,awardEligible:officialEligible&&sampleEligible&&valueEligible};
}
export function goldenGloveEligible(p,season,titleWinners){
 if(!p.stat.g)return false;if(titleWinners.has(p.id))return true;
 const g=games(p,season),s=p.stat;
 if(p.role==='pitch')return s.outs>=g*3||s.w>=10||s.sv>=30||s.hold>=30;
 if(p.position==='지명타자')return s.pa>=Math.floor(Math.floor(g*3.1)*2/3);
 const usage=p.warUsage?.positionOuts;
 if(usage){const outfield=['좌익수','중견수','우익수'],positions=outfield.includes(p.position)?outfield:[p.position];return positions.reduce((n,pos)=>n+(usage[pos]||0),0)>=g*5*3;}
 // Old saves lack innings: retain their conservative games/chances proxy.
 return s.g>=Math.ceil(g*100/144)&&s.ch>=50;
}
