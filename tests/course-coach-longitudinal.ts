import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {freshState,validateState} from '../src/learning';
import {buildCoachSession,coachOverview,coachTaskMinutes,delayedEligible,DAY} from '../src/courseCoach';
import {courseRoute} from '../src/courseRoute';
const bytes=readFileSync('public/course/catalog.json'),data=JSON.parse(bytes.toString()),bank=new Map<string,any>(data.questions.map((q:any)=>[q.id,q]));
const base=Date.parse('2026-10-21T01:00:00Z'),stamp=(n:number)=>new Date(n).toISOString();
function simulate(minutes:number,wrongEvery=0){
 let s=freshState(stamp(base));s.profile.ready=true;s.profile.name='隔离模拟伙伴';s.profile.timezone='Asia/Shanghai';const days:any[]=[];let answered=0;
 for(let day=1;day<=30;day++){
  const now=base+(day-1)*DAY,prior=coachOverview(data,s,now),session=buildCoachSession(data,s,minutes,now);let elapsed=0,newItems=0,reviewItems=0,wrongItems=0;
  if(session){s.courseCoach=session;assert.equal(new Set(session.tasks.map(t=>t.requirement)).size,session.tasks.length);
   for(let index=0;index<session.tasks.length;index++){
    const task=session.tasks[index],q=task.question?bank.get(task.question):null,cost=coachTaskMinutes(task.kind,q);elapsed+=cost;assert.ok(elapsed<=minutes);s.courseCoach.index=index;
    const at=now+elapsed*60000;
    if(task.kind==='learn'){
     newItems++;s.courseRecall.push({id:`reflection-${day}-${index}`,requirement:task.requirement,response:'合成回忆，仅作流程容量模拟',confidence:'recalled',at:stamp(at-1000),nextReviewAt:stamp(at-1000+DAY)});
    }else reviewItems++;
    if(q){assert.ok(!q.professionalHold);answered++;const wrong=!q.subjective&&wrongEvery>0&&answered%wrongEvery===0,eligible=delayedEligible(data,s,task.requirement,at),score=q.subjective?null:wrong?0:1;
     if(wrong)wrongItems++;
     const key=wrong?q.options.find((o:any)=>!q.answers.includes(o.id))?.id||'':q.answers.join(',');
     s.courseAnswers.push({id:`answer-${day}-${index}`,question:q.id,response:q.subjective?'合成书面作答，未作真人能力判断':key,score,at:stamp(at),revealed:true,...(wrong?{errorCause:'condition' as const,correction:'合成订正，仅验证调度',correctionAt:stamp(at+1)}:{}),coach:{requirement:task.requirement,kind:task.kind==='learn'?'practice':'retest',closedBook:true,delayedEligible:eligible}});
     s.courseExposures.push({question:q.id,at:stamp(at)});
     if(q.subjective||wrong)s.courseRecall.push({id:`manual-${day}-${index}`,requirement:task.requirement,response:'合成核对，只验证复习调度',confidence:wrong?'unsure':'recalled',at:stamp(at+1),nextReviewAt:stamp(at+1+DAY)});
    }
    s.courseCoach.tasks[index].phase='done';s.courseCoach.index=index+1;
   }
  }
  validateState(s);const overview=coachOverview(data,s,now+minutes*60000+1000);
  days.push({day,allocatedMinutes:elapsed,newItems,reviewItems,wrongItems,learned:overview.learned,closed:overview.closed,retained:overview.retained,dueBefore:prior.due.length,remaining:712-overview.learned});
 }
 return {minutesPerDay:minutes,days:30,answerScenario:wrongEvery?'every-fifth-objective-wrong':'synthetic-objective-all-correct-written-self-check',learnedRequirements:days.at(-1).learned,remainingRequirements:days.at(-1).remaining,allocatedMinutes:days.reduce((sum,d)=>sum+d.allocatedMinutes,0),zeroNewContentDays:days.filter(d=>!d.newItems).map(d=>d.day),trace:days};
}
const scenarios=[20,60,150,240].map(n=>simulate(n));scenarios.push(simulate(60,5));
for(const s of scenarios){assert.deepEqual(s.zeroNewContentDays,[],'Due backlog must not starve new content in a guided segment');assert.ok(s.learnedRequirements>=30);}
const route=courseRoute(data);assert.equal(new Set(route.flatMap(d=>d.requirements)).size,712);
const report={date:'2026-10-21',catalogSha256:createHash('sha256').update(bytes).digest('hex'),scope:'current 712-requirement guided coach, one daily segment per scenario; not the legacy 40-unit memory pack',isolatedPureState:true,computerClockChanged:false,applicationChanged:true,scenarios,routeReadingOnly:{firstPassDays:24,requirements:712,readingRecallMinutes:3560,maxDailyMinutes:Math.max(...route.map(d=>d.requirements.length*5)),includesQuestionAndReviewMinutes:false},note:'Synthetic scheduling capacity and state consistency only. Answers and self-checks are supplied by the test; not proof of real learning speed, recall, clinical competence or exam pass rate. Daily budget scenarios are not multiple unlimited segments.'};
writeFileSync('../verification/current-audit/final-student-scheduling-simulation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(scenarios.map(({trace,...s})=>s),null,2));
