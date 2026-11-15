import {readFileSync} from 'node:fs';
export function loadMarketDefenseFixture(){
 const data=JSON.parse(readFileSync(new URL('./nov15-market-defense.json',import.meta.url)));
 for(const key of ['pitcher','defender'])data[key].career.latest.players=data[key].career.latest.players.map(values=>{const p=Object.fromEntries(data.playerFields.map((key,i)=>[key,values[i]]));if(Array.isArray(p.stat))p.stat=Object.fromEntries(data.statFields[p.role].map((key,i)=>[key,p.stat[i]]));return p;});
 // Retain the original saved WAR context; this reference table supplies team demand, not a new league environment.
 for(const key of ['pitcher','defender']){const c=data[key].career;c.history.at(-1).league={year:c.latest.year,level:'major',games:144,players:c.latest.players,teams:c.latest.teams.map(({id,w,l})=>({id,w,l})),awards:[]};}
 return {pitcher:data.pitcher,defender:data.defender};
}
