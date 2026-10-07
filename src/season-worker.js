import {progress} from './engine.js?v=7.5';
import {displayedProgressStep} from './progress-display.js';

self.onmessage=event=>{
  const {career,training}=event.data;
  let lastStep=0;
  try{
    progress(career,training,fraction=>{
      const step=displayedProgressStep(fraction);
      if(step>lastStep){lastStep=step;self.postMessage({type:'progress',step});}
    });
    self.postMessage({type:'done',career});
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
