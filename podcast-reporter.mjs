/** Gayzette Podcast Watchlist intake and publication gate. Node 18+, no dependencies. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function pacificYesterday(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return new Date(Date.UTC(+p.year,+p.month-1,+p.day-1,12)).toISOString().slice(0,10);
}
export function parseTsv(text){const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);const keys=lines.shift().split('\t');return lines.filter(Boolean).map(line=>Object.fromEntries(line.split('\t').map((v,i)=>[keys[i],v])));}
export function episodeId(url){try{const u=new URL(url);if(!['youtu.be','www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname)||u.username||u.password||!/^https?:$/.test(u.protocol))return null;const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null}catch{return null}}
const readJson=(p,otherwise)=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):otherwise;
const writeJson=(p,o)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(o,null,2)+'\n')};
export function intake({hq,date=pacificYesterday(),since=date,ledgerPath}){
  const listening=path.join(hq,'04 Research Library','Listening OS');
  const ledger=ledgerPath?readJson(ledgerPath,{published:[]}):{published:[]};
  const published=new Set(ledger.published.map(x=>x.episode_id));
  const rows=parseTsv(fs.readFileSync(path.join(listening,'[C] Listening Index.tsv'),'utf8'));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{4}-\d{2}-\d{2}$/.test(since)||since>date)throw Error('Valid ordered date window required');
  const matches=rows.filter(r=>r.date_watched>=since&&r.date_watched<=date&&/^\d{4}-\d{2}-\d{2}$/.test(r.date_watched));const seen=new Set();const items=[];
  for(const r of matches){const id=episodeId(r.url);if(!id||seen.has(id))continue;seen.add(id);
    const note=path.resolve(listening,r.note_file);const inside=note.startsWith(path.resolve(listening)+path.sep);
    const transcript=path.join(listening,'Transcripts',path.basename(r.note_file));
    const noteExists=inside&&fs.existsSync(note),transcriptExists=fs.existsSync(transcript);
    items.push({episode_id:id,title:r.title,show:r.channel,episode_url:`https://www.youtube.com/watch?v=${id}`,watched_on:r.date_watched,processed_on:r.processed_on,
      status:published.has(id)?'already-published':!noteExists?'blocked-missing-note':!transcriptExists?'blocked-missing-transcript':'ready-for-reporting',
      note_path:noteExists?note:null,transcript_path:transcriptExists?transcript:null});
  }
  return {schema_version:1,private:true,target_watch_date:date,window_start:since,generated_at:new Date().toISOString(),timezone:'America/Los_Angeles',index_rows:matches.length,items,
    warning:items.length?null:'No completed Listening Index rows for target date. Check Daily queue/capture receipts; do not claim nothing was watched.',
    next_step:'Read notes and full transcript locally. Verify public episode and primary context sources. Submit independent claim review before public build.'};
}
function httpUrl(s){try{const u=new URL(s);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password&&!/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[|.*\.local$)/i.test(u.hostname)&&u.hostname.includes('.')}catch{return false}}
const isoDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
export function validateStory(s){const errors=[];const required=['id','episode_id','headline','dek','show','episode_title','episode_url','published_on','reported_on','angle','connection','caveat'];
  required.forEach(k=>{if(typeof s[k]!=='string'||!s[k].trim())errors.push('Missing '+k)});
  if(!/^[a-z0-9-]+$/.test(s.id||''))errors.push('Invalid story slug');
  if(s.published_on!=='unknown'&&!/^\d{4}-\d{2}-\d{2}$/.test(s.published_on||''))errors.push('Release date must be verified YYYY-MM-DD or unknown');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s.reported_on||''))errors.push('Reported date must be YYYY-MM-DD');
  if(episodeId(s.episode_url)!==s.episode_id)errors.push('Episode identity mismatch');
  if(!Array.isArray(s.body)||s.body.length<3)errors.push('At least three reported paragraphs required');
  if((s.body||[]).join(' ').trim().split(/\s+/).length<220)errors.push('Story too short for developed reporting');
  if((s.headline||'').trim().split(/\s+/).length>12)errors.push('Headline exceeds 12 words');
  if(!Array.isArray(s.sources)||s.sources.length<2)errors.push('Episode plus independent context source required');
  const archived=(s.sources||[]).filter(source=>source.verification_method==='archived-primary-captions');
  for(const source of s.sources||[]){
    if(!httpUrl(source.url)||!source.title||!['episode','context'].includes(source.role))errors.push('Incomplete public-source receipt');
    if(source.verification_method==='archived-primary-captions'){
      if(source.role!=='episode'||episodeId(source.url)!==s.episode_id||source.opened_on!==null||!isoDate(source.archived_opened_on))errors.push('Archived captions require exact episode URL, null live-open date and actual archive-open date');
    }else if(!isoDate(source.opened_on))errors.push('Incomplete opened-source receipt');
  }
  if(!(s.sources||[]).some(x=>x.role==='episode'&&episodeId(x.url)===s.episode_id))errors.push('Episode source missing');
  if(!(s.sources||[]).some(x=>x.role==='context'&&x.primary===true&&x.url!==s.episode_url&&episodeId(x.url)!==s.episode_id))errors.push('Distinct primary context evidence missing');
  const check=s.review||{};
  if(archived.length&&(check.source_access!=='archived-primary-with-disclosure'||typeof s.source_note!=='string'||!s.source_note.trim()))errors.push('Archived verification requires independent source-access review and public disclosure');
  if(check.status!=='passed'||!check.checker||!check.writer||check.checker===check.writer||!check.checked_on)errors.push('Independent review incomplete');
  if(!check.claims?.length||check.claims.some(c=>c.verdict!=='OK'||!c.locator||!c.source_url||!(s.sources||[]).some(x=>x.url===c.source_url)))errors.push('Every claim needs OK verdict and locator in a cited source');
  if(check.privacy!=='public-only'||check.attribution!=='passed'||check.original_reporting!=='passed')errors.push('Privacy, attribution or reporting review incomplete');
  const text=JSON.stringify({headline:s.headline,dek:s.dek,body:s.body,connection:s.connection,caveat:s.caveat,source_note:s.source_note});
  if(/(?:[A-Z]:\\|\/mnt\/|note_path|transcript_path|watched_pct|@gmail\.com)/i.test(text))errors.push('Private path or personal metadata in public text');
  return errors;
}
export function publicStory(s){return Object.fromEntries(['id','episode_id','headline','dek','show','episode_title','episode_url','published_on','reported_on','angle','body','connection','caveat','category','source_note'].filter(k=>s[k]!==undefined).map(k=>[k,s[k]]).concat([['sources',s.sources.map(x=>({title:x.title,url:x.url,date:x.date||null,role:x.role,...(x.verification_method==='archived-primary-captions'?{verification_method:x.verification_method,archived_opened_on:x.archived_opened_on}:{})}))]]));}
export function build({drafts,manifest}){const errors=[];const ids=new Set();const stories=[];
  for(const s of drafts.stories||[]){if(ids.has(s.episode_id))errors.push({id:s.id,errors:['Duplicate episode']});ids.add(s.episode_id);const failures=validateStory(s);if(failures.length)errors.push({id:s.id,errors:failures});else stories.push(publicStory(s));}
  const dispositions=drafts.dispositions||[];
  for(const item of manifest?.items||[]){if(item.status==='ready-for-reporting'&&!ids.has(item.episode_id)&&!dispositions.some(d=>d.episode_id===item.episode_id&&['blocked','deferred'].includes(d.status)&&d.reason))errors.push({id:item.episode_id,errors:['Eligible episode has neither story nor explained disposition']});}
  return {errors,public_payload:{schema_version:1,beat:'Podcast Watchlist',updated_on:drafts.updated_on,stories}};
}
function main(){const [command,...args]=process.argv.slice(2);const opt=Object.fromEntries(args.reduce((a,v,i)=>v.startsWith('--')?[...a,[v.slice(2),args[i+1]]]:a,[]));
  if(command==='intake'){if(!opt.hq||!opt.out)throw Error('intake --hq PATH --out PRIVATE.json [--date YYYY-MM-DD] [--since YYYY-MM-DD] [--ledger ledger.json]');const data=intake({hq:opt.hq,date:opt.date,since:opt.since,ledgerPath:opt.ledger});writeJson(opt.out,data);console.log(JSON.stringify({date:data.target_watch_date,counts:data.items.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{}),warning:data.warning}));}
  else if(command==='build'){if(!opt.drafts||!opt.out)throw Error('build --drafts reviewed.json --out public.json [--manifest private-intake.json]');const result=build({drafts:readJson(opt.drafts,{}),manifest:opt.manifest?readJson(opt.manifest,{}):null});if(result.errors.length){console.error(JSON.stringify(result.errors,null,2));process.exitCode=1;return}writeJson(opt.out,result.public_payload);console.log('Public payload written; publication has NOT been recorded.');}
  else if(command==='receipt'){if(!opt.payload||!opt.ledger||!opt.commit||!opt.url)throw Error('receipt --payload public.json --ledger private-ledger.json --commit SHA --url LIVE_URL (only after live verification)');if(!/^[0-9a-f]{40}$/.test(opt.commit)||!httpUrl(opt.url))throw Error('Verified commit SHA and live URL required');const ledger=readJson(opt.ledger,{published:[]});for(const s of readJson(opt.payload,{}).stories||[])ledger.published.push({episode_id:s.episode_id,story_id:s.id,commit:opt.commit,url:opt.url,recorded_at:new Date().toISOString()});writeJson(opt.ledger,ledger);console.log('Publication receipts appended.');}
  else throw Error('Commands: intake, build, receipt');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main()}catch(e){console.error(e.message);process.exitCode=1}}
