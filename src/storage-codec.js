import {zlibSync,unzlibSync,strToU8,strFromU8} from './vendor/fflate.js';

export const STORAGE_CODEC='deflate-utf16-v1';
const COMPRESS_AFTER=32768,MAX_DECODE_BYTES=128*1024*1024;
const checksum=bytes=>{let hash=2166136261;for(const byte of bytes)hash=Math.imul(hash^byte,16777619);return hash>>>0;};
// Fifteen bits per character avoid controls and surrogates in Web Storage/JSON.
function packBytes(bytes){
 const chars=new Uint16Array(Math.ceil(bytes.length*8/15));let value=0,bits=0,index=0;
 for(const byte of bytes){value=(value<<8)|byte;bits+=8;if(bits>=15){bits-=15;chars[index++]=32+((value>>>bits)&32767);value&=(1<<bits)-1;}}
 if(bits)chars[index]=32+(value<<(15-bits));
 const parts=[];for(let i=0;i<chars.length;i+=8192)parts.push(String.fromCharCode(...chars.subarray(i,i+8192)));return parts.join('');
}
function unpackBytes(data,length){
 if(typeof data!=='string'||data.length!==Math.ceil(length*8/15))throw Error('압축 저장 길이가 일치하지 않습니다.');
 const bytes=new Uint8Array(length);let value=0,bits=0,index=0;
 for(let i=0;i<data.length;i++){const code=data.charCodeAt(i)-32;if(code<0||code>32767)throw Error('압축 저장 문자가 손상되었습니다.');value=(value<<15)|code;bits+=15;while(bits>=8&&index<length){bits-=8;bytes[index++]=(value>>>bits)&255;}value&=(1<<bits)-1;}
 if(index!==length||value!==0)throw Error('압축 저장 데이터가 손상되었습니다.');return bytes;
}
export function encodeStoredJSON(value,{force=false}={}){
 const json=JSON.stringify(value);if(!force&&json.length<COMPRESS_AFTER)return json;
 const bytes=strToU8(json);if(bytes.length>MAX_DECODE_BYTES)throw Error('저장 데이터가 지원하는 최대 크기를 넘었습니다. JSON으로 내보내 보존하세요.');
 const zip=zlibSync(bytes,{level:6}),preview=value&&!Array.isArray(value)?{version:value.version,player:value.player?{name:value.player.name}:undefined,year:value.year,archiveId:value.archiveId}:undefined;
 const encoded=JSON.stringify({_storageCodec:STORAGE_CODEC,jsonLength:json.length,byteLength:bytes.length,compressedLength:zip.length,checksum:checksum(bytes),preview,data:packBytes(zip),...(value?.version?{version:value.version}:{})});
 return encoded.length<json.length?encoded:json;
}
export function decodeStoredJSON(raw){
 const stored=JSON.parse(raw);if(!stored?._storageCodec)return stored;
 if(stored._storageCodec!==STORAGE_CODEC)throw Error('지원하지 않는 압축 저장 형식입니다.');
 const {jsonLength,byteLength,compressedLength}=stored;
 if(![jsonLength,byteLength,compressedLength].every(x=>Number.isInteger(x)&&x>0)||byteLength>MAX_DECODE_BYTES||jsonLength>byteLength||compressedLength>MAX_DECODE_BYTES||!Number.isInteger(stored.checksum))throw Error('압축 저장 크기 정보가 손상되었습니다.');
 try{
  const zip=unpackBytes(stored.data,compressedLength),bytes=unzlibSync(zip,{out:new Uint8Array(byteLength)});
  if(bytes.length!==byteLength||checksum(bytes)!==stored.checksum)throw Error('checksum');
  const json=strFromU8(bytes);if(json.length!==jsonLength)throw Error('length');return JSON.parse(json);
 }catch{throw Error('압축 저장 데이터가 손상되었습니다. 원본 백업을 불러오세요.');}
}
export function storedJSONPreview(raw){const value=JSON.parse(raw);return value?._storageCodec?value.preview||{}:value;}

// Each setItem is atomic. Never delete a previous save to make room.
export function writeStoredJSON(storage,key,value,relatedKeys=[]){
 let encoded=encodeStoredJSON(value);
 try{storage.setItem(key,encoded);return;}catch(error){if(error?.name!=='QuotaExceededError')throw error;}
 encoded=encodeStoredJSON(value,{force:true});
 for(const other of relatedKeys){
  if(other===key)continue;
  try{const old=storage.getItem(other);if(!old)continue;const data=decodeStoredJSON(old);if(data?.deleted)continue;const compact=encodeStoredJSON(data,{force:true});if(compact.length<old.length)storage.setItem(other,compact);}catch{/* Keep unreadable or unwritable records untouched. */}
 }
 storage.setItem(key,encoded);
}
