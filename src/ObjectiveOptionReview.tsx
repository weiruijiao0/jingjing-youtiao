export type OptionReview=Record<string,{selected:boolean;reason:string}>;
export default function ObjectiveOptionReview({review}:{review?:OptionReview}){
 if(!review)return null;
 return <div className="objective-option-review"><h4>逐项对照教材</h4><ul>{Object.entries(review).map(([id,item])=><li key={id}><b>{id} · {item.selected?'资料答案项':'未选项'}</b>：{item.reason}</li>)}</ul><p className="small muted">按本题限定的选文与释义对照；仍待独立教师审定，不代表所选考点全部能力已达标。</p></div>;
}
