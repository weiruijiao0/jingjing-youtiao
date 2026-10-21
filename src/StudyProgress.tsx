export default function StudyProgress({label,done,total,detail}:{label:string;done:number;total:number;detail:string}) {
 const value=Math.min(Math.max(0,done),total),percent=total?Math.round(value/total*100):0;
 return <section className="learning-progress-meter" aria-label={label}><div><strong>{label}</strong><b>{value} / {total} · {percent}%</b></div><progress aria-label={label} max={Math.max(1,total)} value={value}/><p>{detail}</p></section>;
}
