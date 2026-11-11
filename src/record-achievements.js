// Display achievements, independent of award voting and award/contract histories.
// Criteria and official references: docs/2026-11-11-record-achievements.md.
export const CAREER_RECORDS = {
  bat: [
    ['h','안타',[1000,1500,2000,2500]],
    ['hr','홈런',[100,200,300,400,500]],
    ['rbi','타점',[500,1000,1500]],
    ['r','득점',[500,1000,1500]],
    ['sb','도루',[100,200,300]],
    ['g','경기',[1000,1500,2000,2500]]
  ],
  pitch: [
    ['k','탈삼진',[1000,1500,2000,2200,2300]],
    ['w','승',[100,150,200]],
    ['outs','이닝',[1000,1500,2000,2500],3],
    ['sv','세이브',[100,150,200]],
    ['hold','홀드',[100,150,200]],
    ['g','등판',[500,700,1000]]
  ]
};
export const SEASON_RECORDS = {
  bat: [['h','안타',200],['rbi','타점',100],['r','득점',100]],
  pitch: [['k','탈삼진',200],['w','승',20],['outs','이닝',200,3],['sv','세이브',40],['hold','홀드',30]]
};
const number=value=>Number.isFinite(value)&&value>=0?value:null;
const eligible=row=>row?.stage==='프로'&&!row.military&&(!row.league?.level||row.league.level==='major')&&number(row.stat?.g)>0;
const label=(scope,value,name)=>`${scope} ${value.toLocaleString('ko-KR')}${name}`;

export function recordAchievements(history,row){
  if(!eligible(row)||!CAREER_RECORDS[row.role]||!Number.isInteger(row.year))return [];
  // A history row's stat is the whole regular season, including both trade stints.
  // Never add minorStat, teamSegments, postseason or international records to it.
  const prior=(history||[]).filter(x=>eligible(x)&&x.role===row.role&&x.year<row.year);
  const records=[];
  for(const [key,name,thresholds,scale=1] of CAREER_RECORDS[row.role]){
    const current=number(row.stat[key]),values=prior.map(x=>number(x.stat[key]));
    // Missing legacy fields are unknown, not invented zeroes.
    if(current===null||values.includes(null))continue;
    const before=values.reduce((sum,n)=>sum+n,0),after=before+current;
    for(const threshold of thresholds)if(before<threshold*scale&&after>=threshold*scale){
      records.push({id:`career-${row.role}-${key}-${threshold}`,kind:'career',label:label('통산',threshold,name),key,threshold,before,after,scale});
    }
  }
  if(row.role==='bat'){
    // Nested home-run/steal achievements: only the highest tier of the season.
    const tier=[40,30,20].find(n=>row.stat.hr>=n&&row.stat.sb>=n);
    if(tier)records.push({id:`season-hr-sb-${tier}`,kind:'season',label:`시즌 ${tier}홈런-${tier}도루`});
  }
  for(const [key,name,threshold,scale=1] of SEASON_RECORDS[row.role]){
    if(number(row.stat[key])!==null&&row.stat[key]>=threshold*scale)records.push({id:`season-${row.role}-${key}-${threshold}`,kind:'season',label:label('시즌',threshold,name),key,threshold,scale});
  }
  if(row.role==='bat'&&row.stat.rbi>=100&&row.stat.r>=100)records.push({id:'season-rbi-r-100',kind:'season',label:'시즌 100타점-100득점'});
  return records;
}
