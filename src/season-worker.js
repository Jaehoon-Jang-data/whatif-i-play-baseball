import {progress} from './engine.js?v=7.4';

self.onmessage=event=>{
  const {career,training}=event.data;
  let lastStep=0;
  try{
    progress(career,training,fraction=>{
      const step=Math.min(23,Math.floor(fraction*12)*2);
      if(step>lastStep){lastStep=step;self.postMessage({type:'progress',step});}
    });
    self.postMessage({type:'done',career});
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
