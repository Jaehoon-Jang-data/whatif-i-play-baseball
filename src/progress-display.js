// The earlier fixed playback advanced one of 24 steps every 180 ms.
// 240 ms per step is 0.75 of that absolute display speed.
export const SEASON_PLAYBACK_STEPS=24;
export const SEASON_PLAYBACK_STEP_MS=240;
export const SEASON_PLAYBACK_DURATION_MS=SEASON_PLAYBACK_STEPS*SEASON_PLAYBACK_STEP_MS;

export function seasonPlaybackState(elapsedMs,calculationDone=false){
  const elapsed=Math.max(0,elapsedMs);
  return {
    step:Math.min(SEASON_PLAYBACK_STEPS-1,Math.floor(elapsed/SEASON_PLAYBACK_STEP_MS)),
    ready:calculationDone&&elapsed>=SEASON_PLAYBACK_DURATION_MS
  };
}
