// The original pre-synchronization playback took 180 ms for each of 24 steps.
export const SEASON_PLAYBACK_STEPS=24;
export const SEASON_PLAYBACK_STEP_MS=180;
export const SEASON_PLAYBACK_DURATION_MS=SEASON_PLAYBACK_STEPS*SEASON_PLAYBACK_STEP_MS;

export function seasonPlaybackStep(elapsedMs,startStep=0,endStep=SEASON_PLAYBACK_STEPS){
  return Math.min(endStep,startStep+Math.max(0,elapsedMs)/SEASON_PLAYBACK_STEP_MS);
}

// Stop positions share the same calendar mapping as rosterPlan; no result is committed twice.
export function seasonPlaybackStops(career,candidate){
  const row=candidate.history.at(-1),stops=[],year=candidate.year;
  const trade=row?.league?.playerTrade;
  if(trade&&career.seasonTradeAcknowledgedYear!==year)stops.push({type:'trade',step:trade.day/144*SEASON_PLAYBACK_STEPS,trade});
  const national=row?.international?.find(x=>x.name==='아시안게임'&&x.selected&&x.window);
  if(national){
    const length=row.rosterCalendar?.length||188,start=Date.UTC(year,2,28),end=Date.UTC(year,9,7);
    const at=date=>{const index=Array.from({length},(_,i)=>new Date(start+Math.round(i*(end-start)/(length-1))).toISOString().slice(0,10)).findIndex(day=>day>=date);return ((index<0?length-1:index)+1)/length*SEASON_PLAYBACK_STEPS;};
    if(career.seasonNationalDepartureYear!==year)stops.push({type:'national_departure',step:at(national.window.start),national});
    if(career.seasonNationalAcknowledgedYear!==year)stops.push({type:'national',step:at(national.window.returnDate),national});
  }
  return stops.sort((a,b)=>a.step-b.step);
}
