import {useState} from 'react';
export type NewGuide={title:string;source:string;pages:{page:number;text:string}[];note:string};
export default function GuideReader({guide,pages,focusPages=[]}:{guide:NewGuide;pages:number[];focusPages?:number[]}){
 const [page,setPage]=useState(focusPages[0]||pages[0]),[search,setSearch]=useState('');
 const candidates=guide.pages.filter(p=>pages.includes(p.page)&&(!search.trim()||p.text.replace(/\s/g,'').includes(search.replace(/\s/g,''))));
 const src=`${import.meta.env.BASE_URL}library/F0007/${String(page).padStart(4,'0')}.jpg`;
 return <div className="guide-reader"><p>《{guide.title}》原页，包含原文、词解和释义。文字识别仅用于检索；药名、古字与关键论述请以图片为准。</p>
 {!!focusPages.length&&<p>按条文号或本条关键词推荐：{focusPages.map(n=><button key={n} onClick={()=>setPage(n)}>{n} 页</button>)}。可继续向后阅读完整释义。</p>}
 <label>在这些教材页中找词<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="如：治未病、肾气、桂枝汤"/></label>
 <label>选择教材原页<select value={page} onChange={e=>setPage(Number(e.target.value))}>{pages.map(n=><option key={n} value={n}>PDF 第 {n} 页</option>)}</select></label>
 {search.trim()&&<p>检索命中：{candidates.length?candidates.slice(0,20).map(p=><button key={p.page} onClick={()=>setPage(p.page)}>{p.page} 页</button>):'未检出。识别可能漏字，可按页阅读。'}</p>}
 <div className="actions"><button disabled={pages.indexOf(page)<=0} onClick={()=>setPage(pages[pages.indexOf(page)-1])}>前一页</button><button disabled={pages.indexOf(page)>=pages.length-1} onClick={()=>setPage(pages[pages.indexOf(page)+1])}>后一页</button><a href={src} target="_blank" rel="noreferrer">放大原页</a></div>
 <img style={{width:'100%',height:'auto',display:'block'}} loading="lazy" src={src} alt={`新版学习备要 PDF 第 ${page} 页原文与释义`}/>
 </div>
}
