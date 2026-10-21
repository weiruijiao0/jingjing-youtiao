export default function WrittenAnswerPoints({points}:{points?:unknown[]}){
 const criteria=points?.map(point=>typeof point==='string'?point:point&&typeof point==='object'&&'criterion' in point&&typeof point.criterion==='string'?point.criterion:'').filter(Boolean);
 if(!criteria?.length)return null;
 return <div className="written-answer-points"><h4>作答核对要点</h4><p className="small">逐点检查遗漏。以下为教材对照后的学习要点，仍待独立教师审定；不自动打分，不据此判定已掌握。</p><ol>{criteria.map((point,i)=><li key={i}>{point}</li>)}</ol></div>;
}
