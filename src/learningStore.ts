import Dexie, { type Table } from "dexie";
import {
  freshState,
  validateState,
  mergeRestore,
  installPack,
  readEnvelope,
  validatePack,
  available,
  clock,
  buildPlan,
  type LearningState,
} from "./learning";
import builtinContent from './content/builtin.jjcontent.json?raw';
// Verify before opening an IndexedDB transaction: WebCrypto is asynchronous.
const builtin = readEnvelope(JSON.parse(builtinContent),'content').then(validatePack);
class LearningDB extends Dexie {
  records!: Table<{ id: string; value: LearningState }, string>;
  constructor() {
    super(
      `jingjing-youtiao:phase3:learning:${new URL(import.meta.env.BASE_URL, window.location.href).pathname}`,
    );
    this.version(1).stores({ records: "id" });
  }
}
export const learningDB = new LearningDB();
export async function loadLearning() {
  const pack = await builtin;
  return learningDB.transaction('rw',learningDB.records,async()=>{
    const stored = (await learningDB.records.get("current"))?.value;
    const current = stored ? validateState(stored) : freshState();
    let installed = installPack(current,pack);
    const c = clock(installed);
    const plan = installed.plans.filter(p=>p.date===c.day).at(-1);
    const active = available(installed);
    if(plan && !installed.cycle.paused && !c.examPast &&
      (!installed.session || installed.session.stage==='done') &&
      plan.tasks.some(t=>t.status==='planned' && !active.some(x=>x.pack===t.pack && x.u.id===t.unit))) {
      installed = buildPlan(installed,plan.minutes,plan.mood);
    }
    if(stored && installed === current) return current;
    const value = {...installed,revision:current.revision+1};
    await learningDB.records.put({id:'current',value});
    return value;
  });
}
export async function saveLearning(
  next: LearningState,
  revision: number,
  restore = false,
) {
  return learningDB.transaction("rw", learningDB.records, async () => {
    const prior = (await learningDB.records.get("current"))?.value;
    if (prior && prior.revision !== revision)
      throw Error("另一页面已更新学习存档，请刷新后继续。");
    if(prior && !restore && next.restartToken!==prior.restartToken)
      await learningDB.records.put({id:'before-restart',value:prior});
    let value = next;
    if (restore) {
      if (prior)
        await learningDB.records.put({ id: "before-import", value: prior });
      value = mergeRestore(prior || freshState(), next);
    }
    value = { ...value, revision: revision + 1 };
    await learningDB.records.put({ id: "current", value });
    return value;
  });
}
