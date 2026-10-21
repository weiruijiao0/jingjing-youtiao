import {type RequirementGuide} from './SourceTeaching';
import {type LearningState} from './learning';
import StudyProgress from './StudyProgress';
import {useState} from 'react';

type Question={id:string;subjective:boolean};
export default function ReviewOverview({guides,questions,s,onPractice}:{guides:Record<string,RequirementGuide>;questions:Question[];s:LearningState;onPractice:(id:string)=>void}){
 const [search,setSearch]=useState(''),[classic,setClassic]=useState('全部'),[page,setPage]=useState(0);
 const entries=Object.values(guides).filter(g=>g.itemReview);
 const all=Object.values(guides);
 const added=all.filter(g=>g.directAssessment);
 const filtered=added.filter(g=>(classic==='全部'||g.classic===classic)&&`${g.requirement}${g.chapter}${g.scope}`.includes(search.trim()));
 const pageCount=Math.max(1,Math.ceil(filtered.length/12));
 const currentPage=Math.min(page,pageCount-1);
 const visible=filtered.slice(currentPage*12,(currentPage+1)*12);
 const first=new Map<string,LearningState['courseAnswers'][number]>();
 for(const a of [...s.courseAnswers].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)))if(!first.has(a.question))first.set(a.question,a);
 return <section className="panel review-overview" id="review-overview"><h2>逐项核对与专项测评</h2>
  <StudyProgress label="考纲直接专项题覆盖" done={all.filter(g=>g.directQuestionIds?.length).length} total={all.length} detail="原有 176 条 + 本轮补齐 536 条；每条都有对应练习。题目覆盖与实际掌握分别记录。"/>
  <StudyProgress label="本轮主题段落精查" done={all.filter(g=>g.locationProof).length} total={185} detail="185 条主题已分别定位到教材段落，跨页原文与释义保留。"/>
  <StudyProgress label="新增专项简答作答进度" done={added.filter(g=>g.directAssessment!.questionIds.every(id=>first.has(id))).length} total={added.length} detail="提交前隐藏教材和参考答案；提交后逐点核对。写过答案不自动判为通过。"/>
  <details className="gap-assessments"><summary>查看新增专项题（{added.length} 条）</summary>
   <p>新增题按考纲要求训练原文、病机、方证、鉴别或组成，附具体参考答案和出处。本条全部能力是否掌握仍需综合练习；这些短答题用于专项训练。</p>
   <div className="course-filters"><label>专项经典<select aria-label="专项经典" value={classic} onChange={e=>{setClassic(e.target.value);setPage(0)}}>{['全部','黄帝内经','伤寒论','金匮要略','温病学'].map(v=><option key={v}>{v}</option>)}</select></label><label>查找专项考点<input value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}} placeholder="输入编号、章节或考点，如 K0001、春温"/></label></div>
   <p role="status">找到 {filtered.length} 条 · 第 {currentPage+1} / {pageCount} 页</p>
   {visible.map(g=>{const ids=g.directAssessment!.questionIds;const done=ids.filter(id=>first.has(id)).length;return <article className="review-topic gap-topic" key={g.requirement}>
    <h3>{g.requirement} · {g.classic} · {g.chapter}</h3><p>{g.scope}</p>
    <StudyProgress label={`${g.requirement} 专项作答`} done={done} total={ids.length} detail={`书面作答已写 ${done} / ${ids.length}；提交后对照答案要点。`}/>
    <button onClick={()=>onPractice(ids.find(id=>!first.has(id))||ids[0])}>{done===ids.length?'再练本条（已见题）':'开始或继续本条专项'}</button>
   </article>})}
   {!filtered.length&&<p>没有匹配考点，可以换一个关键词。</p>}
   <div className="actions"><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>上一页专项</button><button disabled={currentPage>=pageCount-1} onClick={()=>setPage(currentPage+1)}>下一页专项</button></div>
  </details>
  <StudyProgress label="本批逐项原页核对" done={entries.length} total={Object.keys(guides).length} detail={`已核对 ${entries.length} 条的范围、原文限定和专项题依据；独立教师复核仍待完成。`}/>
  <p>以下原页核对的 16 组各含 3 道客观题和 1 道书面分析。先闭卷作答，再看依据；首答与书面作答分别记录。</p>
  <details><summary>查看已核对考点并开始专项测评（{entries.length} 组）</summary>
   {entries.map(g=>{
    const ids=g.itemReview!.questionIds;
    const objective=questions.filter(q=>ids.includes(q.id)&&!q.subjective);
    const written=questions.filter(q=>ids.includes(q.id)&&q.subjective);
    const done=ids.filter(id=>first.has(id)).length;
    const correct=objective.filter(q=>first.get(q.id)?.score===1).length;
    const answered=objective.filter(q=>first.has(q.id)).length;
    const next=ids.find(id=>!first.has(id))||ids[0];
    return <article key={g.requirement} className="review-topic"><h3>{g.requirement} · {g.chapter}</h3><p>{g.scope}</p>
     <StudyProgress label={`${g.requirement} 专项作答`} done={done} total={ids.length} detail={`客观题首答 ${answered} / ${objective.length}，首答正确 ${correct} / ${objective.length}；书面分析已写 ${written.filter(q=>first.has(q.id)).length} / ${written.length}，需对照评分点。`}/>
     <button onClick={()=>onPractice(next)}>{done===ids.length?'再练本条（已见题）':'开始或继续本条专项'}</button>
    </article>;
   })}
  </details>
 </section>;
}
