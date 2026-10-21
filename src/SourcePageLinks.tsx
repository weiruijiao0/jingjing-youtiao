export default function SourcePageLinks({e}:{e:{source:string;page:number;endPage:number}}){
 if(e.source!=='F0007')return <a href={`${import.meta.env.BASE_URL}library/${e.source}.pdf#page=${e.page}`} target="_blank" rel="noreferrer">核对引用原页</a>;
 return <div className="actions">{Array.from({length:e.endPage-e.page+1},(_,i)=>e.page+i).map(page=><a key={page} href={`${import.meta.env.BASE_URL}library/F0007/${String(page).padStart(4,'0')}.jpg`} target="_blank" rel="noreferrer">核对引用原页 · PDF第{page}页</a>)}</div>;
}
