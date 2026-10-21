import {type LearningState} from './learning';
import {type OptionReview} from './ObjectiveOptionReview';
import {type OriginalQuestion} from './OriginalQuestionRecord';
export type ExamQuestion={id:string;family:string;variantGroup?:string;type:string;classic:string;chapter:string;stem:string;options:{id:string;text:string}[];answers:string[];subjective:boolean;explanation:string;reference:string;assessmentOnly?:boolean;rubric?:unknown[];professionalHold?:{reason:string};optionReview?:OptionReview;sourceCheck?:{original:OriginalQuestion}};
export const examBlueprint=[['A1型题',48],['A2型题',24],['X型题',9],['A3型题',9],['论述题',1]] as const;
export function assembleCourseExam(bank:ExamQuestion[],s:LearningState,random:()=>number=Math.random) {
 const shown=new Set([...s.courseAnswers.map(a=>a.question),...s.courseExposures.map(a=>a.question),...(s.courseDraft?[s.courseDraft.question]:[]),...s.courseExams.flatMap(e=>e.questionIds)]);
 const families=new Set(bank.filter(q=>shown.has(q.id)).map(q=>q.family));
 const variants=new Set(bank.filter(q=>shown.has(q.id)&&q.variantGroup).map(q=>q.variantGroup!));
 const selected:string[]=[];const missing:string[]=[];
 for(const [type,count] of examBlueprint){
  const heldFamilies=new Set(bank.filter(q=>q.professionalHold).map(q=>q.family));
  const heldVariants=new Set(bank.filter(q=>q.professionalHold&&q.variantGroup).map(q=>q.variantGroup!));
  const pool=bank.filter(q=>!q.assessmentOnly&&!q.professionalHold&&!heldFamilies.has(q.family)&&(!q.variantGroup||!variants.has(q.variantGroup)&&!heldVariants.has(q.variantGroup))&&(q.type===type||(type==='X型题'&&q.type==='多选题'))&&!families.has(q.family));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  let added=0;for(const q of pool){if(families.has(q.family)||q.variantGroup&&variants.has(q.variantGroup))continue;selected.push(q.id);families.add(q.family);if(q.variantGroup)variants.add(q.variantGroup);added++;if(added===count)break}
  if(added<count)missing.push(`${type} 还缺 ${count-added} 道未使用题`);
 }
 return {questionIds:missing.length?[]:selected,missing};
}
export function examObjectiveScore(q:ExamQuestion,response:string) {
 if(q.subjective||q.professionalHold)return null;
 const a=[...new Set(response.split(',').filter(Boolean))].sort();
 return JSON.stringify(a)===JSON.stringify([...q.answers].sort())?1:0;
}
