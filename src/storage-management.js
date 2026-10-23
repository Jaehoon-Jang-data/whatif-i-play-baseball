import {SAVE_KEY,SAVE_TOMBSTONE,LEGACY_SAVE_KEYS,ARCHIVE_LIMIT,upsertArchive,archiveEntry} from './engine.js?v=7.15';

export const ARCHIVE_KEY='charari-naega-kiunda-careers';
export const ARCHIVE_EXPORT_FORMAT='charari-naega-kiunda-archives-v1';
export {ARCHIVE_LIMIT};
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

export function retirementArchiveState(entries,career){
  const id=career?.retired?(career.archiveId||`${career.seed}-${career.player.name}-${career.year}`):null;
  const stored=Boolean(id&&entries.some(x=>x.id===id));
  const pending=Boolean(id&&!stored&&entries.length>=ARCHIVE_LIMIT),excess=Math.max(0,entries.length-ARCHIVE_LIMIT);
  return {pending,excess,needsChoice:pending||excess>0,stored};
}

export function storeRetiredCareer(storage,career){
  const entries=archiveEntries(storage);
  if(!career?.retired)return false;
  if(retirementArchiveState(entries,career).needsChoice)return false;
  storage.setItem(ARCHIVE_KEY,JSON.stringify(upsertArchive(entries,career)));return true;
}

export function replaceArchivedCareer(storage,career,index,expectedId){
  const entries=archiveEntries(storage);
  if(!career?.retired||!retirementArchiveState(entries,career).pending)throw Error('새 은퇴 기록을 보관할 선택 단계가 아닙니다.');
  if(!Number.isInteger(index)||index<0||index>=entries.length||entries[index].id!==expectedId)throw Error('선택한 은퇴 선수 기록이 변경됐습니다.');
  entries.splice(index,1);
  const next=entries.length<ARCHIVE_LIMIT?upsertArchive(entries,career):entries;
  // One atomic storage write: a quota failure must not erase the selected record.
  storage.setItem(ARCHIVE_KEY,JSON.stringify(next));
  return retirementArchiveState(next,career);
}

export function archiveExport(entries){return {format:ARCHIVE_EXPORT_FORMAT,entries:entries.map(raw=>{
  const entry=raw.career?.player?{...archiveEntry(raw.career),...(raw.id?{id:raw.id}:{})}:raw;
  if(entry.id)return entry;
  let hash=2166136261;for(const char of JSON.stringify(entry))hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return {...entry,id:`legacy-${hash>>>0}`};
})};}

export function importArchiveExport(storage,data){
  if(data?.format!==ARCHIVE_EXPORT_FORMAT||!Array.isArray(data.entries)||!data.entries.length)throw Error('은퇴 보관 파일 형식이 올바르지 않습니다.');
  const entries=archiveExport(archiveEntries(storage)).entries;
  for(const entry of data.entries){
    const validStat=stat=>stat&&typeof stat==='object'&&!Array.isArray(stat)&&Number.isFinite(stat.g)&&Object.values(stat).every(Number.isFinite);
    const validLedger=(ledger,keys)=>ledger===undefined||Array.isArray(ledger)&&ledger.every(row=>row&&keys.every(key=>row[key]===undefined||row[key]===null||Number.isFinite(row[key])));
    if(!entry||typeof entry.id!=='string'||!entry.id||typeof entry.name!=='string'||!['bat','pitch'].includes(entry.role)||!Number.isFinite(entry.score)||!Array.isArray(entry.history)||entry.history.some(row=>!Number.isInteger(row?.year)||!validStat(row.stat)||!['bat','pitch'].includes(row.role)||!Array.isArray(row.awards)||row.minorStat&&!validStat(row.minorStat)||row.postseason?.stat&&!validStat(row.postseason.stat))||!validLedger(entry.salaryLedger,['year','salaryMan','optionPaidMan','allowanceMan'])||!validLedger(entry.signingLedger,['year','amountMan'])||entry.career)throw Error('은퇴 선수 기록이 손상되었습니다.');
    const index=entries.findIndex(x=>x.id===entry.id);
    if(index<0)entries.push(entry);else entries[index]=entry;
  }
  if(entries.length>ARCHIVE_LIMIT)throw Error('은퇴 선수는 7명까지 보관할 수 있습니다. 기존 기록을 내보내고 정리한 뒤 불러오세요.');
  storage.setItem(ARCHIVE_KEY,JSON.stringify(entries));return entries.length;
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
