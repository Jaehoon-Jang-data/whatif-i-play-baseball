import {progress} from './engine.js?v=7.16';

self.onmessage=event=>{
  const {career,training}=event.data;
  try{
    progress(career,training);
    self.postMessage({type:'done',career});
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
