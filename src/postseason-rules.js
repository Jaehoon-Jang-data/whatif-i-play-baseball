// KBO 2025/2026 리그 규정 제45조. Later seasons repeat the latest verified rule as a game assumption.
export function postseasonRules(year){
 return {sourceYear:year<=2025?2025:2026,assumed:year!==2025&&year!==2026,registered:30,gameEligible:28,clubDeadline:`${year}-07-31`,foreignDeadline:`${year}-08-15`,foreignLimit:year<=2025?3:4,asianQuota:year<=2025?0:1,seriesSubmissionDays:1,gameSubmissionMinutes:60};
}
export function postseasonEligibility(row,player={}){
 const year=row.year||2026,rules=postseasonRules(year),registration=row.clubRegistration||player.clubRegistration;
 const foreign=Boolean(player.foreign||row.foreign),discharged=Boolean(row.servicePath&&!row.military||registration?.discharged);
 const date=registration?.date||row.teamSegments?.at(-1)?.from||`${year}-03-28`,estimated=Boolean(registration?.estimated)||!registration?.date&&!row.teamSegments?.at(-1)?.from;
 const regularEnd=row.regularSeasonEnd||`${year}-10-07`,deadline=foreign?rules.foreignDeadline:discharged?regularEnd:rules.clubDeadline;
 const eligible=/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=deadline&&!(registration?.type==='developmental'&&!registration.converted);
 return {eligible,reason:eligible?'소속선수 등록 자격 충족':'소속선수 등록 마감 이후 또는 미전환 육성선수',date,deadline,estimated,foreign,discharged,rules};
}
export function postseasonHealth(row,submissionDay=188){
 if(row.military)return {available:false,scale:0,reason:'군 복무 중'};
 const end=(row.injury?.startDay||0)+(row.injury?.days||0),remaining=end-submissionDay;
 if(row.injury&&remaining>0)return {available:false,scale:0,reason:'엔트리 제출일 부상 재활 중'};
 const rehab=Array.isArray(row.rosterCalendar)&&row.rosterCalendar.at(-1)==='재활군';
 if(rehab&&!row.injury)return {available:false,scale:0,reason:'회복 시점 미확인 · 부상 재활 중'};
 return {available:true,scale:row.injury&&submissionDay-end<28?.85+.15*Math.max(0,submissionDay-end)/28:1,reason:'출전 가능'};
}
