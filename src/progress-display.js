// Keep the display behind completed work. The initial slope is 0.8;
// the curve catches up at the last completed game so results need no replay delay.
export function displayedProgressStep(fraction){
  const currentStep=Math.min(23,Math.max(0,Math.floor(fraction*12)*2));
  const completed=currentStep/23;
  return Math.min(23,.8*currentStep+.2*completed**4*23);
}
