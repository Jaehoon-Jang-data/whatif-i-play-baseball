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
  return stops.sort((a,b)=>a.step-b.step);
}
