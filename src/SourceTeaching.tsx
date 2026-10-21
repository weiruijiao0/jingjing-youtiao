import GuideReader,{type NewGuide} from './GuideReader';

export type ItemReview={status:string;date:string;checks:string[];independentReview:boolean;examCalibration:boolean;questionIds:string[];note:string};
export type RequirementGuide={requirement:string;scope:string;classic?:string;chapter:string;source:string;title:string;pages:number[];focusPages:number[];locator:string;readingInstruction:string;comparisonInstruction:string;tasks:{id:string;prompt:string;kind:string}[];sourceNote?:string;outline?:string;itemReview?:ItemReview;supportSources?:{source:string;pages:number[]}[];directQuestionIds?:string[];directAssessment?:{questionIds:string[];coverageFacet:string;answerBasis:string;fullRequirementAssessment:boolean};locationProof?:{pages:number[];anchor:string;status:string}};

export function RecallTasks({guide,comparison=false}:{guide:RequirementGuide;comparison?:boolean}) {
 return <div className="requirement-tasks"><h4>{comparison?'按这份清单核对漏项':'这一条需要会什么'}</h4><ul>{guide.tasks.map(t=><li key={t.id}>{t.prompt}</li>)}</ul>{comparison&&<p>{guide.comparisonInstruction}</p>}</div>;
}

export default function SourceTeaching({guide,textbook}:{guide:RequirementGuide;textbook:NewGuide}) {
 return <details open className="source-teaching"><summary>本条教材领学 · 原文、词解与释义</summary>
  <p>{guide.readingInstruction}</p>
  {guide.sourceNote&&<p>{guide.sourceNote}</p>}
  {guide.locationProof&&<p className="topic-location">本条对应段落：{guide.locationProof.anchor} · 教材 PDF 第 {guide.locationProof.pages.join('、')} 页。按这个主题读到释义结束，再进入闭卷练习。</p>}
  {guide.itemReview&&<div className="item-review"><h4>本条核对记录</h4><p>{guide.itemReview.date} · 已按原页检查：{guide.itemReview.checks.join('、')}。</p><p>{guide.itemReview.note}</p><p className="small muted">独立教师复核待完成；专项题未校准考试难度。</p></div>}
  {guide.outline&&<div className="source-outline"><h4>先抓住这几个点</h4><p>{guide.outline}</p><p className="small muted">提纲帮助理解；条文限定、完整释义与方药按下方教材原页核对。提纲尚未经过独立专业复核。</p></div>}
  <p className="small muted">讲解来源：《{guide.title}》 · {guide.chapter}。{guide.locator==='article-number'?'按考纲引用条文号定位。':guide.locator==='source-image-checked'?'本条补讲已进行原页单轮对照。':guide.locator==='topic-paragraph-checked'?'已核对本条主题对应的教材段落。':'按本条主题定位；请核对页内对应段落。'}</p>
  {guide.source==='F0007'?<GuideReader key={guide.requirement} guide={textbook} pages={guide.pages} focusPages={guide.focusPages}/>:<div className="fallback-source"><p>本条以已核对的指南原文和配套讲义为依据：</p>{guide.pages.map(n=><p key={n}><a href={`${import.meta.env.BASE_URL}library/${guide.source}.pdf#page=${n}`} target="_blank" rel="noreferrer">核对指南原页 · PDF 第 {n} 页</a></p>)}{guide.supportSources?.map(s=>s.pages.map(n=><p key={`${s.source}-${n}`}><a href={`${import.meta.env.BASE_URL}library/${s.source}.pdf#page=${n}`} target="_blank" rel="noreferrer">核对配套讲义 · PDF 第 {n} 页</a></p>))}</div>}
  <p className="small muted">{guide.source==='F0007'?'读到本条对应的释义结束；跨页时继续翻页。后方“本章完整教材”保留完整上下文。':'联合核对指南原文、配套句解及本条补讲。后方新版完整章节仅保留上下文，不将其邻条当作本条依据。'}</p>
 </details>;
}
