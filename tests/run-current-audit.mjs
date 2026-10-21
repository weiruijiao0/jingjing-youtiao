import {spawn} from 'node:child_process';
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
const suites=['core.ts','journey.ts','properties.ts','workload.ts','course.ts','course-exam.ts','course-route.ts','requirement-study.ts','gap-completion.cjs','full-syllabus.cjs','review-ui.cjs','requirement-ui.cjs','teaching-ui.cjs','plan-ui.cjs','course-ui.cjs','course-exam-ui.cjs','restart-ui.cjs','builtin.cjs','learning.cjs','calendar.cjs','workload-ui.cjs','offline.cjs'];
const extra=['accessibility-current.cjs','source-correction-ui.cjs','source-review.ts','source-review-ui.cjs','objective-review.ts','objective-review-ui.cjs','neijing-review.ts','neijing-review-ui.cjs','shaoyin-review.ts','shaoyin-review-ui.cjs','yangming-review.ts','yangming-review-ui.cjs','yangming-completion.ts','yangming-completion-ui.cjs','course-coach.ts','course-coach-ui.cjs','course-coach-offline.cjs','taiyang-review.ts','taiyang-middle.ts','taiyang-completion.ts','shaoyang-review.ts','tanyin-review.ts','shuiqi-review.ts','all1099-review.ts','authored200-review.ts','written128-review.ts','written128b-review.ts','written128c-review.ts','written152-review.ts','held631-disposition.ts','professional22-content.ts','professional23-content.ts','professional24-content.ts','professional25-content.ts','course-coach-longitudinal.ts'];suites.push(...extra);
const retry=process.argv.includes('--retry');
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
if(only&&!suites.includes(only))throw Error('Unknown test suite');
const report=retry||only?JSON.parse(readFileSync('../verification/current-audit/software-tests.json','utf8')):{startedAt:new Date().toISOString(),kind:'isolated software regression; not professional answer certification',results:[]};
const selected=only?[only]:retry?suites.filter(s=>!report.results.some(r=>r.suite===s&&r.passed)||['course-ui.cjs','course-exam-ui.cjs','offline.cjs','accessibility-current.cjs','source-review-ui.cjs','objective-review-ui.cjs'].includes(s)):suites;
mkdirSync('../verification/current-audit',{recursive:true});
for(const suite of selected){
 const started=Date.now(),args=suite.endsWith('.ts')?['node_modules/tsx/dist/cli.mjs',`tests/${suite}`]:[`tests/${suite}`];
 const result=await new Promise(resolve=>{
  let output='';const child=spawn(process.execPath,args,{cwd:process.cwd(),env:process.env,windowsHide:true});
  child.stdout.on('data',s=>output+=s);child.stderr.on('data',s=>output+=s);
  const timer=setTimeout(()=>child.kill(),120000);
  child.on('close',(code,signal)=>{clearTimeout(timer);resolve({suite,passed:code===0,code,signal,seconds:Math.round((Date.now()-started)/100)/10,output})});
 });
 const previous=report.results.find(r=>r.suite===suite);
 if(previous){result.previousAttempts=[...(previous.previousAttempts||[]),previous];report.results=report.results.filter(r=>r.suite!==suite)}
 report.results.push(result);writeFileSync('../verification/current-audit/software-tests.json',JSON.stringify(report,null,2));
 console.log(`${result.passed?'PASS':'FAIL'} ${suite} (${result.seconds}s)${result.passed?'':'\n'+result.output}`);
}
report.finishedAt=new Date().toISOString();report.passed=report.results.every(r=>r.passed);
writeFileSync('../verification/current-audit/software-tests.json',JSON.stringify(report,null,2));
console.log(`${report.results.filter(r=>r.passed).length}/${suites.length} suites passed`);
process.exitCode=report.passed?0:1;
