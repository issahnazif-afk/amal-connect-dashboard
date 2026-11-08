// Explainable requirement-by-requirement assessment. Rules only: no external model, no data leaves the server.
const {SKILLS,CERTS,LANGUAGES,STOP,findTerms,hasTerm,ESC}=require('./lexicon');
const DEFAULT_WEIGHTS={education:20,skills:30,experience:25,certifications:15,other:10};
const CONFIRMED='Confirmed match',PARTIAL='Partial match',NOT='Not evidenced',MISMATCH='Confirmed mismatch',VERIFY='Requires human verification';
const CREDIT={[CONFIRMED]:1,[PARTIAL]:.5,[VERIFY]:.5,[NOT]:0,[MISMATCH]:0};
const REQ_HEAD=/^(requirements?|qualifications?|education|experience|must have|what you('ll)? (need|bring)|who you are|about you|essential|minimum|required|what we('re| are) looking for|skills|credentials|knowledge|assets?|nice to have|preferred|desirable|key qualifications|job requirements)\b.{0,40}:?$/i;
const ASSET_HEAD=/^(assets?|nice to have|preferred|desirable|bonus|additional assets)\b/i;
const OTHER_HEAD=/^(about (us|the company|the role)|benefits|what we offer|perks|compensation|how to apply|duties|responsibilities|key responsibilities|what you('ll| will) do|overview|the role|summary)\b/i;
const CUE=/\b(\d+\+?\s*(?:-\s*\d+\s*)?years?|degree|diploma|bachelor|master|ph\.?d|certificate|certification|certified|licen[cs]e|licen[cs]ed|registered|must|required|requirement|mandatory|essential|minimum|proficien|experience (in|with|using)|knowledge of|ability to|fluent|bilingual|asset|preferred|red seal|journey|valid|clearance|familiarity)\b/i;
const SENTENCE=t=>t.split(/\n|(?<=[.;])\s+(?=[A-Z])/).map(s=>s.replace(/^[\s•*\-–—\d.)]+/,'').trim()).filter(s=>s.length>3&&s.length<320);
function categorise(s){const l=s.toLowerCase();
  if(/\b(licen[cs]e|licen[cs]ed|certificat|certified|red seal|journey(person|man)|registered (nurse|with|member)|clearance|criminal record|vulnerable sector|first aid|cpr|whmis|ticket)\b/.test(l)&&!/\bdegree\b/.test(l)) return 'certifications';
  if(/\b(degree|diploma|bachelor|master'?s|ph\.?d|doctorate|post-secondary|high school|grade 12|education)\b/.test(l)) return 'education';
  if(/\b(english|french|bilingual|language)\b/.test(l)||LANGUAGES.some(L=>hasTerm(l,L.toLowerCase())&&/speak|fluen|proficien/.test(l))) return 'language';
  if(/\b(on-?site|remote|hybrid|reside|relocat|travel|shift|weekends?|evenings?|overtime|full-?time|part-?time|commute|legally|entitled to work|work permit|authori[sz]ed to work|own vehicle|physical|lift)\b/.test(l)) return 'arrangement';
  if(/\b\d+\+?\s*(?:-\s*\d+\s*)?(years?|yrs?)\b|\bexperience\b/.test(l)) return 'experience';
  return 'skills';}
function requirementsFromText(job){
  const body=[job.requirements,job.description].filter(Boolean).join('\n');const lines=body.split('\n').map(x=>x.trim()).filter(Boolean);const out=[];const seen=new Set();let block=null;
  for(const raw of lines){const head=raw.replace(/^[\s•*#]+/,'').replace(/[:*]+$/,'').trim();
    const isHead=head.length<60&&!/\d/.test(head)&&(head.split(/\s+/).length<=4||/:\s*$/.test(raw));
    if(isHead&&OTHER_HEAD.test(head)){block='other';continue}
    if(isHead&&REQ_HEAD.test(head)){block=ASSET_HEAD.test(head)?'asset':'required';continue}
    for(const s of SENTENCE(raw)){
      if(block==='other'&&!/\b(required|must|\d+\+?\s*years?)\b/i.test(s))continue;
      const inBlock=block==='required'||block==='asset';
      if(!inBlock&&!CUE.test(s))continue;
      if(inBlock&&s.split(' ').length<2&&!findTerms(s,{...SKILLS,...CERTS}).length)continue;
      const k=s.toLowerCase().replace(/\W+/g,' ').trim();if(seen.has(k))continue;seen.add(k);
      const pref=/\b(asset|preferred|nice to have|desirable|bonus|an advantage|would be beneficial|considered)\b/i.test(s)||block==='asset';
      const must=/\b(must|required|mandatory|essential|minimum|legally)\b/i.test(s);
      const importance=pref&&!must?'preferred':'mandatory';
      out.push({id:'r'+out.length,text:s,category:categorise(s),importance,inferred:!must&&!pref&&block!=='required'});
      if(out.length>=40)return out}}
  return out;
}
function evidence(profile,terms,limit=2){
  const res=[];for(const l of profile.lines||[]){if(l.heading)continue;const t=l.text.toLowerCase();if(terms.some(x=>hasTerm(t,x.toLowerCase()))){res.push({page:l.page,section:l.section,text:l.text.slice(0,220)});if(res.length>=limit)break}}return res}
const aliasesOf=(dict,c)=>[c,...dict[c]];
const keywords=s=>[...new Set((s.toLowerCase().match(/[a-z][a-z+#.'-]{2,}/g)||[]).map(x=>x.replace(/[.'-]+$/,'')).filter(x=>!STOP.has(x)&&x.length>2))];
function assess(req,profile,prefs){
  const l=req.text.toLowerCase(),cv=(profile.lines||[]).map(x=>x.text).join('\n').toLowerCase();
  const r=(status,confidence,reason,ev=[])=>({status,confidence,reason,evidence:ev});
  if(req.category==='education'){
    const LV=[[5,/ph\.?d|doctora/],[4,/master/],[3,/bachelor|undergraduate|university degree|\bdegree\b/],[2,/diploma|college|post-secondary/],[1,/high school|grade 12|secondary/]];
    const need=(LV.find(([,re])=>re.test(l))||[0])[0],top=profile.education?.[0];
    if(!top)return r(NOT,'Low','No education entry could be identified in the CV.');
    const ev=[{page:top.page,section:top.section,text:top.detail.slice(0,220)}];
    const kw=keywords(req.text.replace(/.*\b(in|of)\b/i,'')).filter(w=>!/degree|diploma|bachelor|master|university|college|equivalent|field|discipline|recognized|recognised|related/.test(w));
    const fieldHit=!kw.length||kw.some(w=>top.detail.toLowerCase().includes(w));
    if(top.level>=need&&fieldHit)return r(CONFIRMED,'High',`CV shows ${top.label}, meeting the stated level.`,ev);
    if(top.level>=need)return r(PARTIAL,'Medium',`CV shows ${top.label}; the field of study needs confirming.`,ev);
    return r(PARTIAL,'Medium',`Highest level identified is ${top.label}, below the stated level. Equivalent experience or foreign credentials may apply.`,ev);}
  if(req.category==='experience'){
    const m=/(\d+)\+?\s*(?:-\s*(\d+)\s*)?(?:years?|yrs?)/.exec(l),need=m?+m[1]*12:0,months=profile.experienceMonths||0;
    const kw=keywords(req.text).slice(0,10);const hits=kw.filter(w=>hasTerm(cv,w));
    const ev=(profile.experience||[]).slice(0,2).map(j=>({page:j.page,section:'experience',text:`${j.title}${j.employer?', '+j.employer:''} (${j.start} to ${j.end})`.slice(0,220)}));
    const domain=kw.length?hits.length/kw.length:1;
    if(need){if(!(profile.experience||[]).length)return r(VERIFY,'Low','Could not calculate years: no dated work history was identified.');
      const yrs=(months/12).toFixed(1);
      if(months>=need&&domain>=.4)return r(CONFIRMED,'Medium',`${yrs} years of dated work history; related terms found: ${hits.slice(0,5).join(', ')||'general'}.`,ev);
      if(months>=need)return r(PARTIAL,'Medium',`${yrs} years in total, but the experience in this specific area is not clear from the CV.`,ev);
      if(months>=need*.5)return r(PARTIAL,'Medium',`${yrs} years of dated history against ${m[1]} requested.`,ev);
      return r(NOT,'Medium',`Only ${yrs} years of dated history identified against ${m[1]} requested. Undated experience may exist.`,ev);}
    if(domain>=.6)return r(CONFIRMED,'Medium',`Related terms found: ${hits.join(', ')}.`,evidence(profile,hits));
    if(domain>=.3)return r(PARTIAL,'Low',`Some related terms found: ${hits.join(', ')}.`,evidence(profile,hits));
    return r(NOT,'Low','No related experience was located in the CV.');}
  if(req.category==='certifications'){
    const wanted=findTerms(l,CERTS);
    if(wanted.length){const found=wanted.filter(c=>(profile.certifications||[]).includes(c)||aliasesOf(CERTS,c).some(a=>hasTerm(cv,a.toLowerCase())));
      if(found.length){const ev=evidence(profile,found.flatMap(c=>aliasesOf(CERTS,c)));
        return req.importance==='mandatory'?r(VERIFY,'Medium',`CV mentions ${found.join(', ')}. Validity and expiry must be checked by staff.`,ev):r(CONFIRMED,'Medium',`CV mentions ${found.join(', ')}.`,ev)}
      return r(NOT,'Medium',`${wanted.join(', ')} not stated in the CV.`)}
    const kw=keywords(req.text).filter(w=>!/licen|certif|valid|current|hold/.test(w)),hits=kw.filter(w=>hasTerm(cv,w));
    if(kw.length&&hits.length/kw.length>=.6)return r(VERIFY,'Low',`Possible reference to: ${hits.join(', ')}. Staff must verify.`,evidence(profile,hits));
    return r(NOT,'Low','No matching credential was located in the CV.');}
  if(req.category==='language'){
    const wanted=LANGUAGES.filter(L=>hasTerm(l,L.toLowerCase()));if(/bilingual/.test(l)&&!wanted.includes('French'))wanted.push('French');
    if(!wanted.length)return r(VERIFY,'Low','Language requirement needs staff review.');
    const stated=wanted.filter(L=>(profile.languages||[]).includes(L)),miss=wanted.filter(L=>!stated.includes(L));
    const ev=evidence(profile,stated);
    if(!miss.length)return r(CONFIRMED,'Medium',`Language stated in CV: ${stated.join(', ')}.`,ev);
    if(miss.length===1&&miss[0]==='English')return r(CONFIRMED,'Low','CV is written in English; spoken proficiency is not assessed here.');
    return r(NOT,'Medium',`${miss.join(', ')} not stated in the CV.`,ev);}
  if(req.category==='arrangement'){
    const p=prefs||{};
    if(/part-?time/.test(l)&&p.employmentType==='Full-time only')return r(MISMATCH,'High','Participant profile states full-time only.');
    if(/full-?time/.test(l)&&p.employmentType==='Part-time only')return r(MISMATCH,'High','Participant profile states part-time only.');
    if(/on-?site/.test(l)&&p.workArrangement==='Remote only')return r(MISMATCH,'High','Participant profile states remote only.');
    if(/remote/.test(l)&&p.workArrangement==='On-site only')return r(MISMATCH,'High','Participant profile states on-site only.');
    return r(VERIFY,'Low',/legally|entitled|permit|authori/.test(l)?'Work authorization is confirmed by staff with the participant, not inferred from a CV.':'Confirm this working condition with the participant.');}
  const wanted=findTerms(l,SKILLS);
  if(wanted.length){const found=wanted.filter(c=>aliasesOf(SKILLS,c).some(a=>hasTerm(cv,a.toLowerCase())));const miss=wanted.filter(c=>!found.includes(c));const ev=evidence(profile,found.flatMap(c=>aliasesOf(SKILLS,c)));
    if(!miss.length)return r(CONFIRMED,ev.length?'High':'Medium',`Evidence found for ${found.join(', ')}.`,ev);
    if(found.length)return r(PARTIAL,'Medium',`Evidence found for ${found.join(', ')}; not evidenced: ${miss.join(', ')}.`,ev);
    return r(NOT,'Medium',`Not stated in the CV: ${miss.join(', ')}.`)}
  const kw=keywords(req.text),hits=kw.filter(w=>hasTerm(cv,w));const f=kw.length?hits.length/kw.length:0;
  if(f>=.75&&hits.length>=2)return r(CONFIRMED,'Low',`Related terms found: ${hits.join(', ')}.`,evidence(profile,hits));
  if(f>=.4)return r(PARTIAL,'Low',`Some related terms found: ${hits.join(', ')}.`,evidence(profile,hits));
  return r(NOT,'Low','Not located in the CV. It may still be true of the participant.');
}
const WEIGHT_KEY={education:'education',skills:'skills',experience:'experience',certifications:'certifications',language:'other',arrangement:'other',role:'experience'};
function matchJob(job,profile,opts={}){
  const weights=opts.weights||DEFAULT_WEIGHTS,overrides=opts.overrides||{};
  const reqs=(job.parsedRequirements&&job.parsedRequirements.length?job.parsedRequirements:requirementsFromText(job)).map(x=>({...x}));
  const titleKw=keywords(job.title||'').filter(w=>!/senior|junior|intermediate|temporary|casual|permanent|seasonal/.test(w));
  const history=[...(profile.experience||[]).map(j=>j.title+' '+j.employer),profile.summary||'',(profile.skills||[]).join(' ')].join(' ').toLowerCase();
  const titleHits=titleKw.filter(w=>hasTerm(history,w)||hasTerm(history,w.replace(/s$/,'')));
  const roleScore=titleKw.length?titleHits.length/titleKw.length:0;
  const roleItem={id:'role',text:`Alignment of work history with "${job.title}"`,category:'role',importance:'preferred',inferred:true,status:roleScore>=.6?CONFIRMED:roleScore>0?PARTIAL:NOT,confidence:'Medium',reason:titleHits.length?`Work history or summary mentions: ${titleHits.join(', ')}.`:'The job title does not appear in the work history or summary.',evidence:evidence(profile,titleHits)};
  const items=[...reqs.map(q=>({...q,...assess(q,profile,opts.preferences)})),roleItem].map(i=>overrides[i.id]?{...i,...overrides[i.id],staffVerified:true}:i);
  const groups={};for(const i of items){const k=WEIGHT_KEY[i.category]||'other';(groups[k]=groups[k]||[]).push(i)}
  let sum=0,wt=0;const breakdown={};
  for(const [k,arr] of Object.entries(groups)){let a=0,b=0;for(const i of arr){const w=i.importance==='mandatory'?2:1;a+=CREDIT[i.status]*w;b+=w}const s=a/b;breakdown[k]=Math.round(s*100);sum+=s*(weights[k]||0);wt+=weights[k]||0}
  const score=wt?Math.round(sum/wt*100):0;
  const mand=items.filter(i=>i.importance==='mandatory'),preferred=items.filter(i=>i.importance==='preferred'&&i.id!=='role');
  const failed=mand.filter(i=>i.status===MISMATCH),open=mand.filter(i=>i.status!==CONFIRMED&&i.status!==MISMATCH);
  const eligibility=failed.length?'Not currently eligible':open.length?'Verification required':reqs.length?'Eligible on evidence':'Insufficient posting detail';
  const cval={High:1,Medium:.65,Low:.3};const confidence=Math.round(items.reduce((a,i)=>a+(cval[i.confidence]||.3),0)/items.length*100);
  const cnf=mand.filter(i=>i.status===CONFIRMED).length;
  const explanation=reqs.length?`${cnf} of ${mand.length} mandatory requirements are confirmed by CV evidence${open.length?`; ${open.length} need review or evidence`:''}${failed.length?`; ${failed.length} confirmed mismatch`:''}. ${preferred.filter(i=>i.status===CONFIRMED).length} of ${preferred.length} preferred requirements are confirmed.${job.descriptionTruncated?' This source supplies only an excerpt of the advert, so open the full posting before deciding.':''}`:'The posting text has no identifiable requirements, so this indicates only how closely the job title and work history align. Paste the full advert for a requirement-level assessment.';
  return {score,eligibility,evidenceConfidence:confidence,explanation,breakdown,items,mandatoryConfirmed:cnf,mandatoryTotal:mand.length,preferredConfirmed:preferred.filter(i=>i.status===CONFIRMED).length,preferredTotal:preferred.length};
}
function searchTerms(profile){const t=(profile.experience||[]).slice(0,3).map(j=>j.title).filter(x=>x&&x.length<60);return {titles:[...new Set(t)],skills:(profile.skills||[]).slice(0,8)}}
module.exports={matchJob,requirementsFromText,searchTerms,DEFAULT_WEIGHTS,STATUSES:[CONFIRMED,PARTIAL,NOT,MISMATCH,VERIFY]};
