import {readFileSync} from 'node:fs';
export function loadAGFixture(){const f=JSON.parse(readFileSync(new URL('./ag-final-roster.json',import.meta.url)));f.career.latest.players=f.career.latest.players.map(values=>{const p=Object.fromEntries(f.playerFields.map((key,i)=>[key,values[i]]));p.stat=Object.fromEntries(f.statFields[p.role].map((key,i)=>[key,p.stat[i]]));return p;});return f;}
