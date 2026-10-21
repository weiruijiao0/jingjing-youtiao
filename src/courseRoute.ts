import type {StudyData} from './RequirementStudy';
export function courseRoute(data:StudyData){
 const classics=[...new Set(data.courses.map(c=>c.classic))];
 return Array.from({length:24},(_,day)=>({day:day+1,requirements:classics.flatMap(classic=>{
  const requirements=data.courses.filter(c=>c.classic===classic).flatMap(c=>c.requirements.map(r=>r.id));
  return requirements.slice(Math.floor(requirements.length*day/24),Math.floor(requirements.length*(day+1)/24));
 })}));
}

export type RouteDay={day:number;requirements:string[]};
export function rebalanceRoute(route:RouteDay[],completed:Set<string>,fromDay:number):RouteDay[]{
 if(!Number.isInteger(fromDay)||fromDay<1||fromDay>24)throw Error('请选择首轮第1至24天');
 const pending=route.flatMap(d=>d.requirements).filter(id=>!completed.has(id));
 const count=25-fromDay;
 return route.map(d=>({day:d.day,requirements:[...d.requirements.filter(id=>completed.has(id)),...(d.day<fromDay?[]:pending.slice(Math.floor(pending.length*(d.day-fromDay)/count),Math.floor(pending.length*(d.day-fromDay+1)/count)))]}));
}
export function validRoute(route:RouteDay[],data:StudyData){
 const expected=new Set(data.courses.flatMap(c=>c.requirements.map(r=>r.id))),actual=route.flatMap(d=>d.requirements);
 return route.length===24&&new Set(route.map(d=>d.day)).size===24&&route.every(d=>d.day>=1&&d.day<=24)&&actual.length===expected.size&&new Set(actual).size===actual.length&&actual.every(id=>expected.has(id));
}
