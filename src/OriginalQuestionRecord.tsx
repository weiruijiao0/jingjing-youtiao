export type OriginalQuestion={stem:string;options?:{id:string;text:string}[]};
export default function OriginalQuestionRecord({original,current}:{original?:OriginalQuestion;current:OriginalQuestion}){
 if(!original||original.stem===current.stem&&(!original.options||JSON.stringify(original.options)===JSON.stringify(current.options)))return null;
 return <details className="original-question-record"><summary>查看原题记录（已有作答保留）</summary><p>{original.stem}</p>{original.options?.map(o=><p key={o.id}>{o.id}. {o.text}</p>)}<p className="small muted">原题仅作修改记录；以本次修正后的限定作答。已有作答和分数保留，不重新评分。</p></details>;
}
