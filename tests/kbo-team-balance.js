import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {simulateSeason,rates,sumStats,qualification} from '../src/engine.js';

const source=JSON.parse(readFileSync(new URL('./data/kbo-team-history.json',import.meta.url)));
const official=Object.entries(source.years).map(([year,teams])=>({year:Number(year),teams}));
const completed=official.filter(x=>x.year<=2025);
const comparable=completed.filter(x=>x.teams.length===10&&x.teams.every(t=>t.g===144));
const recent=comparable.filter(x=>x.year>=2019);
const keys=['avg','era','pct','w','l','tie'];
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const variance=values=>mean(values.map(x=>(x-mean(values))**2));
const fixed=(n,d=5)=>Number(n.toFixed(d));
function describe(values){return {mean:fixed(mean(values)),variance:fixed(variance(values),8),min:fixed(Math.min(...values)),max:fixed(Math.max(...values))};}
function league(teams){return Object.fromEntries(keys.map(key=>[key,describe(teams.map(t=>t[key]))]));}

const officialYears=completed.map(({year,teams})=>({year,teamCount:teams.length,games:[Math.min(...teams.map(t=>t.g)),Math.max(...teams.map(t=>t.g))],league:league(teams)}));
const seasons=[],teamSeasons=[],individual={qualifiedAt500:0,smallSampleAt500:0,qualifiedCount:0,smallSampleCount:0};
for(let seed=1;seed<=200;seed++){
  const year=2027+(seed-1)%5;
  const environment=.985+(year%5)*.0125;
  const season=simulateSeason({seed,year,environment});
  const teams=season.teams.map(t=>{
    const bat=sumStats(season.players.filter(p=>p.team===t.id&&p.role==='bat').map(p=>p.stat),'bat');
    const pitch=sumStats(season.players.filter(p=>p.team===t.id&&p.role==='pitch').map(p=>p.stat),'pitch');
    assert.equal(t.g,t.w+t.l+t.tie,`games: seed ${seed}, team ${t.id}`);
    assert.equal(t.r,bat.r,`runs scored: seed ${seed}, team ${t.id}`);
    assert.equal(t.ra,pitch.r,`runs allowed: seed ${seed}, team ${t.id}`);
    assert.equal(t.w,pitch.w,`pitcher wins: seed ${seed}, team ${t.id}`);
    assert.equal(t.l,pitch.l,`pitcher losses: seed ${seed}, team ${t.id}`);
    assert.ok(bat.h<=bat.ab&&pitch.er<=pitch.r&&pitch.outs>0);
    return {seed,year,environment,team:t.name,g:t.g,w:t.w,l:t.l,tie:t.tie,
      avg:bat.h/bat.ab,era:pitch.er*27/pitch.outs,pct:t.w/(t.w+t.l),
      internal:{pa:bat.pa,ab:bat.ab,h:bat.h,r:bat.r,ipOuts:pitch.outs,er:pitch.er,ra:pitch.r}};
  });
  assert.equal(teams.reduce((n,t)=>n+t.w,0),teams.reduce((n,t)=>n+t.l,0));
  assert.equal(teams.reduce((n,t)=>n+t.internal.r,0),teams.reduce((n,t)=>n+t.internal.ra,0));
  assert.equal(teams.reduce((n,t)=>n+t.internal.h,0),season.players.filter(p=>p.role==='pitch').reduce((n,p)=>n+p.stat.h,0));
  for(const p of season.players.filter(p=>p.role==='bat'&&p.stat.ab)){
    const qualified=p.stat.pa>=qualification(144,'bat');
    individual[qualified?'qualifiedCount':'smallSampleCount']++;
    if(rates(p.stat,'bat').avg>=.5)individual[qualified?'qualifiedAt500':'smallSampleAt500']++;
  }
  teamSeasons.push(...teams);
  seasons.push({seed,year,environment,league:league(teams)});
}

function pooled(years){return Object.fromEntries(keys.map(key=>[key,describe(years.flatMap(y=>y.teams.map(t=>t[key])))]));}
function seasonShape(years){return Object.fromEntries(keys.map(key=>[key,{
  mean:describe(years.map(y=>league(y.teams)[key].mean)),
  teamVariance:describe(years.map(y=>league(y.teams)[key].variance))
}]));}
const simulation={pooled:Object.fromEntries(keys.map(key=>[key,describe(teamSeasons.map(t=>t[key]))])),
  seasonShape:Object.fromEntries(keys.map(key=>[key,{
    mean:describe(seasons.map(s=>s.league[key].mean)),
    teamVariance:describe(seasons.map(s=>s.league[key].variance))
  }])),
  outsideOfficial144:Object.fromEntries(keys.map(key=>{
    const range=pooled(comparable)[key];
    return [key,teamSeasons.filter(t=>t[key]<range.min||t[key]>range.max).length];
  })),individual};
const result={official:{source:source.source,retrieved:source.retrieved,extractedYears:[official[0].year,official.at(-1).year],
  completedYears:[completed[0].year,completed.at(-1).year],
  excludedCurrentYear:official.at(-1).year,fields:source.fields,eraTabs:source.eraTabs,
  comparable144Years:comparable.map(x=>x.year),yearly:officialYears,
  comparable144:{pooled:pooled(comparable),seasonShape:seasonShape(comparable)},
  recent144:{years:recent.map(x=>x.year),pooled:pooled(recent),seasonShape:seasonShape(recent)}},
  simulation:{years:[2027,2031],seeds:200,teamSeasons:teamSeasons.length,...simulation,seasons,teams:teamSeasons}};

assert.ok(simulation.pooled.avg.mean>=result.official.comparable144.seasonShape.avg.mean.min);
assert.ok(simulation.pooled.avg.mean<=result.official.comparable144.seasonShape.avg.mean.max);
assert.ok(simulation.pooled.era.mean>=result.official.comparable144.seasonShape.era.mean.min);
assert.ok(simulation.pooled.era.mean<=result.official.comparable144.seasonShape.era.mean.max);
assert.equal(teamSeasons.filter(t=>t.avg>=.5).length,0);
writeFileSync(process.env.BALANCE_OUTPUT||new URL('./kbo-team-balance-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({officialYears:result.official.extractedYears,comparable144Years:result.official.comparable144Years,
  seeds:200,official144:result.official.comparable144.pooled,recent144:result.official.recent144.pooled,
  simulated:simulation.pooled,leagueShape:simulation.seasonShape,outsideOfficial144:simulation.outsideOfficial144,
  individual},null,2));
