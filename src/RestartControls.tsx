import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Modal} from './DemoApp';
import {restartLearning,type LearningState} from './learning';
import {learningDB} from './learningStore';
type Props={s:LearningState;busy:boolean;mutate:(fn:(s:LearningState)=>LearningState)=>Promise<boolean>};
export default function RestartControls({s,busy,mutate}:Props){
 const nav=useNavigate(),[choice,setChoice]=useState<'guided'|'sprint'|'undo'|null>(null),[hasBackup,setHasBackup]=useState(false),[error,setError]=useState('');
 useEffect(()=>{void learningDB.records.get('before-restart').then(r=>setHasBackup(!!r)).catch(()=>setError('暂时无法读取重启备份，请稍后重试。'))},[s.restartToken]);
 const run=async()=>{setError('');try{
  const backup=choice==='undo'?(await learningDB.records.get('before-restart'))?.value:null;
  if(choice==='undo'&&!backup){setError('未找到重启前备份，当前记录未修改。');return}
  if(await mutate(o=>choice==='undo'?{...backup!,restartToken:crypto.randomUUID()}:restartLearning(o,choice==='sprint'?'sprint':'guided'))){setChoice(null);nav('/course')}
 }catch{setError('操作未完成，当前记录保留，请重试。')}};
 return <section className="panel restart-controls"><h2>重新开始与冲刺模式</h2><p>方便重新体验学习流程。当前为{s.courseMode==='sprint'?'冲刺模式':'完整领学模式'}。</p>
  <div className="actions"><button className="primary" disabled={busy} onClick={()=>setChoice('guided')}>从头开始</button><button className="secondary" disabled={busy} onClick={()=>setChoice('sprint')}>直接进入冲刺模式</button>{hasBackup&&<button disabled={busy} onClick={()=>setChoice('undo')}>恢复上次切换前的记录</button>}</div>
  <p className="small muted">每次确认切换前自动保存一份本地快照，恢复入口也在这里。只保留最近一次；长期留存请使用“学习存档”导出备份。</p>
  {error&&<p role="alert">{error}</p>}
  {choice&&<Modal title={choice==='guided'?'确认从头开始？':choice==='sprint'?'确认进入冲刺模式？':'恢复切换前记录？'} onClose={()=>setChoice(null)}>
   <p>{choice==='guided'?'将清空当前学习进度、每日计划、作答与错题、草稿、演练和已获得奖励，从第1天重新开始。伙伴、偏好、奖励设置与内置资料保留。旧记录会先保存到本地快照。':choice==='sprint'?'保留现有学习记录，恢复暂停状态，并直接进入第25天的归纳、错题与限时演练安排。不会将前24天自动标为完成；已有未交卷演练仍可继续。':'用上次切换前的快照替换当前进度；当前测试进度将成为新的恢复快照，可再次切换回来。'}</p>
   <div className="actions"><button disabled={busy} onClick={()=>setChoice(null)}>取消</button><button className="primary" disabled={busy} onClick={()=>void run()}>{choice==='guided'?'确认从头开始':choice==='sprint'?'确认进入冲刺':'确认恢复记录'}</button></div>
  </Modal>}
 </section>;
}
