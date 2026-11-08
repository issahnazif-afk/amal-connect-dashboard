// Reads a CV from its actual content (not its file name) and builds a structured profile with page/section evidence.
const path=require('path'),os=require('os');
const mammoth=require('mammoth'),WordExtractor=require('word-extractor');
const {SKILLS,CERTS,LANGUAGES,NL_PLACES,findTerms,hasTerm}=require('./lexicon');
const ROOT=path.join(__dirname,'..');
class CvError extends Error{constructor(msg,code=422){super(msg);this.status=code;this.expose=true}}
function sniff(b){
  if(b.length<8) return 'empty';
  const head=b.subarray(0,1024).toString('latin1');
  if(head.indexOf('%PDF-')>=0) return 'pdf';
  if(b[0]===0x50&&b[1]===0x4b) return b.includes('word/document.xml')?'docx':(b.includes('EncryptedPackage')?'encrypted':'zip');
  if(b[0]===0xd0&&b[1]===0xcf&&b[2]===0x11&&b[3]===0xe0) return b.includes(Buffer.from('EncryptedPackage','utf16le'))?'encrypted':'doc';
  if(head.startsWith('{\\rtf')) return 'rtf';
  if(/^\s*(<!doctype html|<html|mime-version:)/i.test(head)||/<o:p>|xmlns:w=/i.test(head)) return 'html';
  if((b[0]===0xff&&b[1]===0xd8)||(b[0]===0x89&&b[1]===0x50)) return 'image';
  const nonText=[...b.subarray(0,2000)].filter(c=>c<9||(c>13&&c<32)).length;
  return nonText<20||(b[0]===0xff&&b[1]===0xfe)?'text':'unknown';
}
const clean=t=>String(t||'').replace(/\u0000/g,'').replace(/\r\n?/g,'\n').replace(/[•●▪‣◦]/g,'•').replace(/[ \t ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
function rtfToText(s){
  // Decode text runs and drop destination groups (fonts, colours, stylesheet, pictures).
  let out='',stack=[],skip=false,i=0,uc=1;
  const SKIPS=new Set(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer','themedata','colorschememapping','latentstyles','datastore','generator']);
  while(i<s.length){const c=s[i];
    if(c==='{'){stack.push(skip);i++;continue}
    if(c==='}'){skip=stack.pop()||false;i++;continue}
    if(c==='\\'){const m=/^\\([a-zA-Z]+)(-?\d+)? ?/.exec(s.slice(i,i+40));
      if(m){i+=m[0].length;const w=m[1];
        if(SKIPS.has(w))skip=true;
        else if(w==='uc')uc=+m[2];
        else if(w==='u'&&!skip){out+=String.fromCharCode((+m[2]+65536)%65536);i+=uc}
        else if(!skip&&(w==='par'||w==='line'||w==='row'))out+='\n';
        else if(!skip&&(w==='tab'||w==='cell'))out+=' ';
        continue}
      const n=s[i+1];
      if(n==="'"){if(!skip)out+=String.fromCharCode(parseInt(s.substr(i+2,2),16));i+=4;continue}
      if(n==='*'){skip=true;i+=2;continue}
      if(!skip&&'\\{}'.includes(n))out+=n;i+=2;continue}
    if(!skip&&c!=='\n'&&c!=='\r')out+=c;i++}
  return out;
}
const htmlToText=h=>h.replace(/=\r?\n/g,'').replace(/<(style|script|head)[\s\S]*?<\/\1>/gi,' ').replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
async function ocrImages(images){
  const {createWorker}=require('tesseract.js');
  const worker=await createWorker('eng',1,{langPath:path.join(ROOT,'node_modules/@tesseract.js-data/eng/4.0.0'),gzip:true,cachePath:os.tmpdir(),logger:()=>{}});
  try{const out=[];for(const img of images){const {data}=await worker.recognize(img);out.push(data.text||'')}return out}finally{await worker.terminate()}
}
class CvCanvasFactory{ // Keeps every PDF.js scratch canvas on the same canvas implementation.
  constructor(){this.lib=require('@napi-rs/canvas')}
  create(w,h){const canvas=this.lib.createCanvas(w,h);return {canvas,context:canvas.getContext('2d')}}
  reset(o,w,h){o.canvas.width=w;o.canvas.height=h}
  destroy(o){if(o.canvas){o.canvas.width=0;o.canvas.height=0}o.canvas=null;o.context=null}
}
function linesFromItems(items){
  const rows=[];
  for(const it of items){if(!it.str)continue;const x=it.transform[4],y=it.transform[5];let r=rows.find(r=>Math.abs(r.y-y)<3);if(!r){r={y,cells:[]};rows.push(r)}r.cells.push({x,s:it.str,w:it.width})}
  rows.sort((a,b)=>b.y-a.y);
  return rows.map(r=>{r.cells.sort((a,b)=>a.x-b.x);let line='',end=null;for(const c of r.cells){if(end!==null&&c.x-end>1.5&&!line.endsWith(' ')&&!c.s.startsWith(' '))line+=' ';line+=c.s;end=c.x+c.w}return line}).join('\n');
}
async function readPdf(b){
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
  let doc;
  try{doc=await pdfjs.getDocument({data:new Uint8Array(b),isEvalSupported:false,useSystemFonts:true,verbosity:0,CanvasFactory:CvCanvasFactory,standardFontDataUrl:path.join(ROOT,'node_modules/pdfjs-dist/standard_fonts/')+path.sep}).promise}
  catch(e){if(e.name==='PasswordException')throw new CvError('This PDF is password-protected. Remove the password and upload it again.');throw new CvError('This PDF is damaged and could not be opened. Re-save or re-export it, then upload it again.')}
  const pages=[];
  for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i);pages.push(linesFromItems((await p.getTextContent()).items))}
  const chars=pages.join('').replace(/\s/g,'').length;
  if(chars>=120) return {pages,method:'Embedded PDF text'};
  const {createCanvas}=require('@napi-rs/canvas');const imgs=[];
  for(let i=1;i<=Math.min(doc.numPages,10);i++){const p=await doc.getPage(i);const v=p.getViewport({scale:2.5});const c=createCanvas(Math.ceil(v.width),Math.ceil(v.height));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);await p.render({canvasContext:ctx,viewport:v}).promise;imgs.push(c.toBuffer('image/png'))}
  return {pages:await ocrImages(imgs),method:'OCR (scanned PDF)',warnings:['Text was read by OCR. Check names, dates and credentials against the original.']};
}
async function readDocument(buffer,filename=''){
  if(!buffer||!buffer.length) throw new CvError('The file is empty.');
  const kind=sniff(buffer);let r;
  switch(kind){
    case 'pdf': r={...(await readPdf(buffer)),fileType:'PDF'};break;
    case 'docx': try{const v=await mammoth.extractRawText({buffer});r={pages:[v.value],method:'Word document text',fileType:'DOCX'}}catch{throw new CvError('This Word file is damaged and could not be opened. Re-save it from Word and upload it again.')}break;
    case 'doc': try{const d=await new WordExtractor().extract(buffer);r={pages:[[d.getBody(),d.getTextboxes?.({includeHeadersAndFooters:false,includeBody:true})].filter(Boolean).join('\n')],method:'Legacy Word text',fileType:'DOC'}}catch{throw new CvError('This .doc file could not be read. Open it in Word, choose Save As .docx, and upload that copy.')}break;
    case 'rtf': r={pages:[rtfToText(buffer.toString('latin1'))],method:'Rich text',fileType:'RTF'};break;
    case 'html': r={pages:[htmlToText(buffer.toString('utf8'))],method:'Web-format Word document',fileType:'HTML'};break;
    case 'text': r={pages:[buffer.toString(buffer[0]===0xff?'utf16le':'utf8')],method:'Plain text',fileType:'TXT'};break;
    case 'image': r={pages:await ocrImages([buffer]),method:'OCR (image)',fileType:'IMAGE',warnings:['Text was read by OCR. Check names, dates and credentials against the original.']};break;
    case 'encrypted': throw new CvError('This Word file is password-protected. Remove the password and upload it again.');
    default: throw new CvError(`"${filename}" is not a CV format we can read. Upload a PDF, DOCX, DOC or RTF file.`,415);
  }
  r.pages=r.pages.map(clean);r.text=r.pages.join('\n\n').trim();
  if(r.text.replace(/\s/g,'').length<40) throw new CvError('No readable text was found in this document, including by OCR. Check that the scan is clear and upright, then upload it again.');
  r.wordCount=r.text.split(/\s+/).length;
  return r;
}
const HEADINGS=[['summary',/^(professional |career |personal |executive )?(summary|profile|objective|about me)$/i],['experience',/^(professional |work |employment |relevant |career )?(experience|history)( history)?$|^work history$|^employment$|^professional background$/i],['education',/^(education|academic (background|qualifications|history)|educational background|qualifications and education|education and training)$/i],['skills',/^(key |core |technical |professional |relevant |computer )?(skills|competencies|proficiencies|expertise|technologies)( summary| and abilities)?$|^areas of expertise$|^skills? ?(&|and) ?(abilities|competencies|tools)$/i],['certifications',/^(licen[cs]es?( and| &)? ?)?(certifications?|certificates|credentials)( and| &)? ?(licen[cs]es?|training)?$|^licen[cs]es?$|^professional (development|certifications?)$|^training$/i],['languages',/^languages?( spoken| skills| proficiency)?$/i],['projects',/^(key |selected |academic )?projects$/i],['volunteer',/^volunteer(ing)?( experience| work)?$|^community (involvement|service)$/i],['awards',/^(awards?|honou?rs|achievements|publications)( and awards?)?$/i],['references',/^references?$/i]];
function sectionise(pages){
  const lines=[];let section='header';
  pages.forEach((pg,pi)=>{for(const raw of pg.split('\n')){const text=raw.trim();if(!text)continue;const norm=text.replace(/[:\-–—_•|]+\s*$/,'').replace(/^[\s•]+/,'').trim();
    const h=norm.split(/\s+/).length<=6&&HEADINGS.find(([,re])=>re.test(norm));
    if(h){section=h[0];lines.push({page:pi+1,section,text,heading:true});continue}
    lines.push({page:pi+1,section,text})}});
  return lines;
}
const MONTHS={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
const DPT=String.raw`(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s+\d{4}|\d{1,2}[\/\-.]\d{4}|\d{4})`;
const RANGE=new RegExp(`(${DPT})\\s*(?:-|–|—|to|until|through)\\s*(${DPT}|present|current|now|today|ongoing)`,'i');
function toMonth(s,end){s=s.trim().toLowerCase();if(/present|current|now|today|ongoing/.test(s)){const d=new Date();return d.getFullYear()*12+d.getMonth()}
  let m=/^([a-z]{3})[a-z]*\.?,?\s+(\d{4})/.exec(s);if(m)return +m[2]*12+MONTHS[m[1]];
  m=/^(\d{1,2})[\/\-.](\d{4})/.exec(s);if(m)return +m[2]*12+Math.min(+m[1],12)-1;
  m=/^(\d{4})/.exec(s);return m?+m[1]*12+(end?11:0):null}
function experience(lines){
  const sec=lines.filter(l=>l.section==='experience'&&!l.heading);const src=sec.length?sec:lines.filter(l=>!['education','references'].includes(l.section));
  const jobs=[];
  src.forEach((l,i)=>{const m=RANGE.exec(l.text);if(!m)return;const start=toMonth(m[1]),end=toMonth(m[2],true);if(start==null||end==null||end<start||end-start>600)return;
    const rest=l.text.replace(m[0],'').replace(/^[\s,|•\-–—(]+|[\s,|•\-–—)]+$/g,'');const prev=i>0&&!RANGE.test(src[i-1].text)?src[i-1].text.replace(/^[•\s]+/,''):'';
    const next=src[i+1]&&!RANGE.test(src[i+1].text)&&!src[i+1].text.startsWith('•')?src[i+1].text:'';
    const parts=(rest.length>2?rest:prev).split(/\s*[|,–—]\s*|\s+at\s+|\s+-\s+/).filter(Boolean);
    jobs.push({title:parts[0]||prev||next||'Role not identified',employer:parts[1]||(rest.length>2?prev&&prev!==parts[0]?'':next:next)||'',start:m[1],end:m[2],months:end-start+1,startM:start,endM:end,page:l.page,line:l.text})});
  const iv=jobs.map(j=>[j.startM,j.endM]).sort((a,b)=>a[0]-b[0]);let total=0,cur=null;
  for(const [s,e] of iv){if(!cur||s>cur[1]+1){if(cur)total+=cur[1]-cur[0]+1;cur=[s,e]}else cur[1]=Math.max(cur[1],e)}if(cur)total+=cur[1]-cur[0]+1;
  return {jobs:jobs.map(({startM,endM,...j})=>j),totalMonths:total};
}
const EDU=[[5,'Doctorate',/\b(ph\.?\s?d|doctorate|doctoral|d\.?phil)\b/i],[4,"Master's",/\b(master'?s?|m\.?sc|mba|m\.?a\.|m\.?eng|m\.?ed|meng|msw)\b/i],[3,"Bachelor's",/\b(bachelor'?s?|b\.?sc|b\.?a\.|b\.?eng|b\.?comm?|bba|b\.?ed|undergraduate degree|honou?rs degree|hnd)\b/i],[2,'Diploma',/\b(diploma|associate degree|college program|advanced diploma)\b/i],[1.5,'Certificate',/\b(post-secondary certificate|college certificate|trade certificate|certificate program|certificate in|apprenticeship)\b/i],[1,'High school',/\b(high school|secondary school|ged|grade 12|o-?levels|a-?levels|wassce|ssce)\b/i]];
function education(lines){
  const sec=lines.filter(l=>l.section==='education'&&!l.heading);const src=sec.length?sec:lines;const out=[];
  for(const l of src){for(const [level,label,re] of EDU){if(re.test(l.text)){if(sec.length||level>=2)out.push({level,label,detail:l.text.replace(/^[•\s]+/,''),page:l.page,section:l.section});break}}}
  return out.sort((a,b)=>b.level-a.level);
}
const firstMatch=(re,t)=>(re.exec(t)||[])[0]||'';
function structure(doc){
  const lines=sectionise(doc.pages),text=doc.text;
  const email=firstMatch(/[\w.+'-]+@[\w-]+(\.[\w-]+)+/,text);
  const phone=firstMatch(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,text);
  const linkedin=firstMatch(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w%-]+/i,text);
  const headerLines=lines.slice(0,10).map(l=>l.text);
  const name=(headerLines.find(l=>{const s=l.replace(/[,|].*$/,'').trim();return /^[\p{L}][\p{L}.'-]+(\s+[\p{L}][\p{L}.'-]*){1,3}$/u.test(s)&&!/@|\d|curriculum|vitae|resume|résumé/i.test(s)})||'').replace(/[,|].*$/,'').trim();
  const head=lines.filter(l=>l.section==='header').map(l=>l.text).join(' ').toLowerCase();
  const nlPlace=NL_PLACES.find(p=>hasTerm(head,p));
  const location=(/([A-Z][\p{L}.' -]+,\s*(?:NL|NF|Newfoundland(?: and Labrador)?|[A-Z]{2}))\b/u.exec(lines.filter(l=>l.section==='header').map(l=>l.text).join('\n'))||[])[1]||(nlPlace?nlPlace.replace(/\b\w/g,c=>c.toUpperCase()):'');
  const exp=experience(lines),edu=education(lines);
  const skills=findTerms(text,SKILLS);
  const skillsSec=lines.filter(l=>l.section==='skills'&&!l.heading).flatMap(l=>l.text.replace(/^[^:]{0,30}:/,'').split(/[,;•|]|\s{2,}/)).map(s=>s.trim().replace(/\.$/,'')).filter(s=>s.length>1&&s.length<40&&s.split(' ').length<=5);
  const certs=findTerms(text,CERTS);
  const certLines=lines.filter(l=>l.section==='certifications'&&!l.heading).map(l=>l.text.replace(/^[•\s]+/,'')).filter(Boolean);
  const langSec=lines.filter(l=>l.section==='languages').map(l=>l.text).join(' ');
  const langs=LANGUAGES.filter(L=>hasTerm(langSec.toLowerCase(),L.toLowerCase())||new RegExp(`(fluent|native|proficient|speak|bilingual)[^.\\n]{0,40}\\b${L}\\b|\\b${L}\\b[^.\\n]{0,20}(fluent|native|proficient|mother tongue)`,'i').test(text));
  const missing=[];if(!email)missing.push('email');if(!exp.jobs.length)missing.push('dated work history');if(!edu.length)missing.push('education');if(!skills.length&&!skillsSec.length)missing.push('skills');
  return {name,email,phone,linkedin,location,summary:lines.filter(l=>l.section==='summary'&&!l.heading).map(l=>l.text).join(' ').slice(0,900),experience:exp.jobs,experienceMonths:exp.totalMonths,education:edu,skills:[...new Set(skills)],skillsListed:[...new Set(skillsSec)].slice(0,60),certifications:[...new Set(certs)],certificationsListed:certLines.slice(0,30),languages:langs,lines,sections:[...new Set(lines.map(l=>l.section))],notFound:missing};
}
async function parseCv(buffer,filename){const doc=await readDocument(buffer,filename);return {fileType:doc.fileType,method:doc.method,warnings:doc.warnings||[],wordCount:doc.wordCount,pageCount:doc.pages.length,text:doc.text,profile:structure(doc)}}
module.exports={parseCv,readDocument,structure,CvError,sniff};
