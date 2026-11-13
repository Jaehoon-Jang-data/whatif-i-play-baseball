// Game workload model. Risk grades are season forecasts, not medical probabilities.
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
export const HEALTH_VERSION=1;
export const TRAINING_INTENSITIES={
 recovery:{name:'회복 위주',growth:.7,load:-.22,risk:-.015,rest:8},
 standard:{name:'보통',growth:1,load:0,risk:0,rest:0},
 high:{name:'고강도',growth:1.18,load:.28,risk:.025,rest:-5}
};
export function trainingIntensity(c){return TRAINING_INTENSITIES[c.trainingIntensity]||TRAINING_INTENSITIES.standard;}
export function fatigue(c){
 if(c.health?.version===HEALTH_VERSION&&Number.isFinite(c.health.fatigue))return clamp(c.health.fatigue);
 const saved=c.trainingState?.fatigue;
 if(Number.isFinite(saved))return clamp(saved*(c.phase==='prepare'?.45:1));
 const recent=c.history?.at(-1)?.recentWorkload;
 return clamp(c.player?.role==='pitch'?(recent?.estimatedPitches7||0)/75*18:(recent?.pa14||0)/60*18,0,45);
}
export function initializeHealth(c){
 if(c.health?.version!==HEALTH_VERSION||!Number.isFinite(c.health.fatigue))c.health={version:HEALTH_VERSION,fatigue:fatigue(c),year:c.year,source:'저장된 훈련·출장 기록 재계산',recoveredForYear:c.phase==='prepare'?c.year:null};
 c.health.fatigue=clamp(c.health.fatigue);c.trainingIntensity=Object.hasOwn(TRAINING_INTENSITIES,c.trainingIntensity)?c.trainingIntensity:'standard';
 delete c.clubTrust;delete c.trustHistory;
 for(const row of c.history||[]){delete row.trust;delete row.trustChanges;}
 return c.health;
}
export function injuryRisk(c,{load=0,recovery=false,currentFatigue=fatigue(c)}={}){
 const injuries=(c.history||[]).filter(r=>r.injury),recent=injuries.filter(r=>r.year>=c.year-3),severe=recent.filter(r=>r.injury.days>=50).length;
 const stage=c.stage==='고교'?.10:c.stage==='대학'?.13:.15,age=c.age>=34?.025+(c.age-34)*.002:c.age<=20?-.01:0;
 const recovering=c.recoveryState?.year===c.year;
 const probability=c.service===2?0:clamp(stage+age+currentFatigue*.0012+Math.min(.10,(c.injuries||0)*.01)+severe*.008+(recovering?.035:0)+(c.recurrenceAdjustment||0)+load*.028+trainingIntensity(c).risk-(c.trainingState?.durability||0)*.0015-(recovery?.018:0),.02,.55);
 return {probability,level:probability<.13?'낮음':probability<.20?'보통':probability<.30?'높음':'매우 높음',fatigue:currentFatigue,recovering,severeRecent:severe,model:'season-risk-v1'};
}
export function completeSeasonHealth(c,profile,injury,stat,minorStat={},recent=null,observedFatigue=null){
 initializeHealth(c);
 const volume=c.player.role==='bat'?((stat?.pa||0)+(minorStat.pa||0)*.7)/650:((stat?.outs||0)+(minorStat.outs||0)*.7)/(c.player.position==='선발'?540:210);
 const intensity=trainingIntensity(c),shortLoad=c.player.role==='bat'?(recent?.pa14||0)/60:(recent?.estimatedPitches7||0)/75;
 const end=clamp((Number.isFinite(observedFatigue)?observedFatigue:profile.fatigue*.45)+volume*12+Math.min(2,shortLoad)*8+Math.max(0,profile.load)*18+(injury?10:0)-(profile.recovery?12:0)-intensity.rest);
 c.health={version:HEALTH_VERSION,fatigue:end,year:c.year,source:'시즌 출장·훈련·회복',recoveredForYear:null,workload:{volume,pa:stat?.pa||0,outs:stat?.outs||0,recent:recent||null}};
 return end;
}
export function recoverOffseason(c){
 initializeHealth(c);if(c.health.recoveredForYear===c.year)return;
 c.health.fatigue=clamp(c.health.fatigue*.4-5);c.health.year=c.year;c.health.recoveredForYear=c.year;
 if(c.trainingState)c.trainingState.fatigue=c.health.fatigue;
}
// Daily game load uses recorded pitches/PA. Days without appearances recover as well.
export function fatigueAfterDay(value,{role,pa=0,pitches=0,elapsedDays=1,load=0,recovery=false,durability=0}={}){
 const work=role==='pitch'?pitches*.12:pa*.9,rest=(2.8+durability*.035+(recovery?.7:0))*Math.max(1,elapsedDays);
 return clamp(value+work+Math.max(-1,load)*.8-rest);
}
