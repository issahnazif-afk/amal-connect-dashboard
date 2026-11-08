// Runs inside GitHub Actions. Keys come from repository secrets and never reach the website.
const fs=require('fs'),path=require('path');const {CONNECTORS,isNL,dedupeKey}=require('../server/connectors');
const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'sources.json'),'utf8'));
const out=process.env.JOBS_OUT||path.join(__dirname,'..','data','jobs.json');
const SECRETS={adzuna:{appId:'ADZUNA_APP_ID',appKey:'ADZUNA_APP_KEY'},jooble:{apiKey:'JOOBLE_API_KEY'}};
(async()=>{const sources=[],seen=new Map();
 for(const s of cfg){const c=CONNECTORS[s.kind];if(!c){sources.push({name:s.name,kind:s.kind,ok:false,error:'Unknown source type'});continue}const config={...(s.config||{})};const need=SECRETS[s.kind]||{};const missing=Object.values(need).filter(k=>!process.env[k]);if(missing.length){sources.push({name:s.name,kind:s.kind,ok:false,skipped:true,error:`Add the repository secret ${missing.join(' and ')} to turn this on`});continue}for(const [k,e] of Object.entries(need))config[k]=process.env[e];
  try{const r=await c.fetch({name:s.name,config},{query:'',pages:s.pages||6});const rows=(Array.isArray(r)?r:r.jobs).filter(j=>j.title);const nl=rows.filter(isNL);for(const j of nl){const k=dedupeKey(j);const prev=seen.get(k);if(!prev||(j.description||'').length>(prev.description||'').length)seen.set(k,{...j,description:(j.description||'').slice(0,8000),sourceName:s.name})}sources.push({name:s.name,kind:s.kind,ok:true,retrieved:rows.length,inNL:nl.length});console.log(s.name,rows.length,nl.length)}catch(e){sources.push({name:s.name,kind:s.kind,ok:false,error:e.message});console.error(s.name,e.message)}}
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({generated:new Date().toISOString(),sources,jobs:[...seen.values()]}))})();
