// Old drafts included a training step. Preserve the chosen player/position only.
export function normalizeCreationDraft(raw){
 const draft=raw&&typeof raw==='object'?{...raw}:{step:'profile',profile:null,candidates:null,selected:null};
 if(draft.step==='focus')draft.step='position';
 if(!['profile','candidates','position'].includes(draft.step))draft.step='profile';
 delete draft.focus;
 return draft;
}
