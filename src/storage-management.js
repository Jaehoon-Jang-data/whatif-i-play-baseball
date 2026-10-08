import {SAVE_KEY,SAVE_TOMBSTONE,LEGACY_SAVE_KEYS} from './engine.js?v=7.11';

export const ARCHIVE_KEY='charari-naega-kiunda-careers';
export const CAREER_SAVE_KEYS=[SAVE_KEY,...LEGACY_SAVE_KEYS,...LEGACY_SAVE_KEYS.map(key=>`${key}-archive`)];

export function savedCareerSlots(storage){
  return CAREER_SAVE_KEYS.flatMap(key=>{
    const raw=storage.getItem(key);
    if(!raw||raw===SAVE_TOMBSTONE)return [];
    let career;
    try{career=JSON.parse(raw);}catch{return [{key,label:key===SAVE_KEY?'현재 자동 저장':'이전 저장',name:'읽을 수 없는 저장',year:null,bytes:new Blob([raw]).size}];}
    return [{key,label:key===SAVE_KEY?'현재 자동 저장':key.endsWith('-archive')?'이전 버전 백업':'구버전 자동 저장',name:career?.player?.name||'이름 미기록',year:career?.year??null,archiveId:career?.archiveId??null,bytes:new Blob([raw]).size}];
  });
}

export function archiveEntries(storage){
  try{const entries=JSON.parse(storage.getItem(ARCHIVE_KEY)||'[]');return Array.isArray(entries)?entries:[];}catch{return [];}
}

export function removeArchivedEntry(storage,index,expectedId){
  const entries=archiveEntries(storage);
  if(!Number.isInteger(index)||index<0||index>=entries.length||entries[index]?.id!==expectedId)throw Error('삭제할 은퇴 선수 기록이 변경됐습니다.');
  const [removed]=entries.splice(index,1);
  if(entries.length)storage.setItem(ARCHIVE_KEY,JSON.stringify(entries));else storage.removeItem(ARCHIVE_KEY);
  return removed;
}

export function removeCareerSlot(storage,key){
  if(!CAREER_SAVE_KEYS.includes(key))throw Error('삭제할 수 없는 저장 항목입니다.');
  const existed=storage.getItem(key);
  if(key===SAVE_KEY)storage.setItem(SAVE_KEY,SAVE_TOMBSTONE);
  else storage.removeItem(key);
  return Boolean(existed&&existed!==SAVE_TOMBSTONE);
}
