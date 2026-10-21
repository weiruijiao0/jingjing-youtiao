import strictCase from './professional23-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import historical from './historical-catalog.cjs';
import {scoreCourse} from '../src/Course';
import {assembleCourseExam, examObjectiveScore} from '../src/examEngine';
import {freshState} from '../src/learning';

const {readHistoricalCatalog, frozenBaseline, supplementalIds, BASELINE_SHA, sha256, sourceHashes} = historical;
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const fileHash = (path: string) => sha256(readFileSync(path));
const data = strictCase.projectBeforeCase23(read('public/course/catalog.json')), before = frozenBaseline();
assert.ok(data.professionalSupplementAudit, 'Apply the reviewed second-round supplement before running this suite');
assert.deepEqual(readHistoricalCatalog(data), before);
assert.equal(data.questions.length, 2440);
assert.equal(data.questions.filter((q: any) => !q.professionalHold).length, 1809);
assert.equal(data.authoredQuestionReviewAudit.questionIds.length, 759);
assert.equal(data.authoredQuestionReviewAudit.checkedQuestionIds.length, 759);
assert.equal(data.authoredQuestionReviewAudit.pendingQuestionIds.length, 0);
const bank = new Map<string, any>(data.questions.map((q: any) => [q.id, q]));
assert.equal(bank.size, 2440);
const supplement = data.professionalSupplementAudit, remediation = data.professionalRemediationAudit;
const batch = data.authoredQuestionReviewAudit.batches['supplemental23-22'];
assert.deepEqual(supplement.inputFileSha256, remediation.inputFileSha256);
assert.deepEqual(batch.decisionFileSha256, supplement.inputFileSha256);
for (const [file, hash] of Object.entries(supplement.inputFileSha256)) {
  assert.match(file, /^work\/professional22-[^/]+\.(json|md)$/);
  assert.equal(fileHash('../../../' + file), hash, `Exact evidence/input bytes: ${file}`);
}
for (const a of [supplement, remediation, batch]) {
  assert.equal(a.date, '2026-10-05');
  for (const key of ['independentExpertReview', 'examCalibration', 'fullRequirementAbilityVerified']) assert.equal(a[key], false);
}
const candidates = read('../../../work/professional22-neijing-new-questions.json');
const candidateHash = fileHash('../../../work/professional22-neijing-new-questions.json');
const cross = read('../../../work/professional22-neijing-new-crossreview.json');
assert.equal(supplement.inputFileSha256['work/professional22-neijing-new-crossreview.json'], fileHash('../../../work/professional22-neijing-new-crossreview.json'));
assert.equal(candidates.length, 23);
assert.deepEqual(candidates.map((q: any) => q.id), supplementalIds);
assert.equal(cross.length, 23);
assert.deepEqual([...cross.map((r: any) => r.questionId)].sort(), [...supplementalIds].sort());
const crossBank = new Map<string, any>(cross.map((r: any) => [r.questionId, r]));
const normalized = (s: string) => s.normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '');
const official = normalized(readFileSync('../../../work/syllabus-official2026.txt', 'utf8'));
for (const [i, authored] of candidates.entries()) {
  const q = bank.get(authored.id), c = crossBank.get(authored.id);
  assert.equal(c.action, 'retain');
  assert.ok(c.reason.trim() && c.evidenceLinks.length);
  assert.equal(c.finalQuestionFileSha256, candidateHash);
  for (const key of ['independentExpertReview', 'examCalibration', 'fullRequirementAbilityVerified']) assert.equal(c[key], false);
  const expected = structuredClone(authored), coverage = expected.coverage;
  const external = expected.evidenceLinks.filter((e: any) => e.source === 'external-primary-university');
  Object.assign(expected, {
    family: authored.id, classic: '黄帝内经', chapter: before.requirementGuides[authored.requirementIds[0]].chapter,
    type: '专项简答题', options: [], answers: [], source: 'F0007', sheet: '第二十二轮纲内测面补充', row: i + 1,
    subjective: true, review: 'authored-source-grounded', assessmentGroup: authored.requirementIds[0], assessmentOnly: true,
    budgetMinutes: 3, coverageFacet: authored.stem, fullRequirementAssessment: false, answerBasis: 'authored-bounded-supplemental-facet',
    reference: '考纲 ' + authored.requirementIds.join(',') + '；' + authored.evidenceLinks.map((e: any) => 'page' in e
      ? `${e.citation} · 文件第${e.page}—${e.endPage}页` : `${e.citation} · ${e.url}`).join('；'),
    authoredReview: {date:'2026-10-05', batch:'supplemental23-22', status:'single-source-comparison',
      issue:'按原页及交叉意见补充此前未逐项设分的测面；不是独立教师审定。', original:null, coverage,
      independentExpertReview:false, examCalibration:false, fullRequirementAbilityVerified:false,
      rubricMode:'manual-reference-only', automaticGrade:false},
  });
  if (external.length) expected.externalEvidenceLinks = external;
  expected.evidenceLinks = authored.evidenceLinks.filter((e: any) => e.source !== 'external-primary-university');
  delete expected.coverage;
  assert.deepEqual(q, expected, `Only documented delivery fields may differ from the independently reviewed author file: ${q.id}`);
  assert.deepEqual(q.requirementIds, i < 16 ? ['K0078'] : ['K0060', 'K0588']);
  assert.equal(q.catalogSha256, BASELINE_SHA);
  assert.ok(q.stem.trim() && q.explanation.trim());
  assert.ok(q.rubric.length >= 2 && q.rubric.every((r: any) => r.criterion.trim() && r.points > 0));
  assert.equal(q.rubric.reduce((n: number, r: any) => n + r.points, 0), 10);
  assert.equal(q.manualGradingOnly, true); assert.equal(q.automaticGrade, false);
  assert.ok(q.authoredReview.coverage.tested.length && q.authoredReview.coverage.notTested.length);
  assert.equal(q.authoredReview.coverage.fullRequirementAbilityVerified, false);
  for (const key of ['independentExpertReview', 'examCalibration', 'fullRequirementAbilityVerified']) assert.equal(q[key], false);
  assert.equal(scoreCourse(q, q.explanation), null); assert.equal(scoreCourse(q, ''), null);
  assert.equal(examObjectiveScore(q, q.explanation), null);
  for (const rid of q.requirementIds) {
    const guide = data.requirementGuides[rid];
    assert.equal(guide.classic, q.classic);
    assert.ok(guide.directQuestionIds.includes(q.id) && guide.directAssessment.questionIds.includes(q.id));
    assert.ok(data.requirementReadings[rid].questionIds.includes(q.id));
    assert.ok(official.includes(normalized(guide.scope)));
  }
  assert.equal(data.courses.filter((course: any) => course.questionIds.includes(q.id)).length, 1);
  for (const e of q.evidenceLinks) {
    assert.equal(e.source, 'F0007');
    assert.ok(e.quote.trim() && e.citation.trim() && e.note.trim() && e.excerptKind && e.sourceReadingLevel);
    assert.ok(Number.isInteger(e.page) && e.endPage >= e.page);
    assert.equal(e.ocrHashKind, 'file-bytes-sha256');
    assert.equal(e.ocrFileSha256, fileHash(`../../../work/ocr-F0007/${String(e.page).padStart(4, '0')}.json`));
  }
  for (const e of q.externalEvidenceLinks ?? []) {
    assert.equal(e.source, 'external-primary-university');
    assert.match(e.url, /^https:\/\/(museum\.njucm\.edu\.cn|jcxy\.gzy\.edu\.cn)\//);
    const htmlHashes = readdirSync('../../../work').filter(file => /^written152-K0078-source-.*\.html$/.test(file)).map(file => fileHash('../../../work/' + file));
    assert.ok(htmlHashes.includes(e.savedHtmlSha256));
    assert.ok(e.quote && e.citation && e.note && e.sourceReadingLevel);
    assert.ok(q.reference.includes(e.url));
    assert.ok(!q.evidenceLinks.includes(e), 'University HTML evidence cannot create a fake local PDF link');
  }
}
assert.deepEqual(sourceHashes([...data.questions.slice(before.questions.length), ...remediation.decisions]), supplement.sourceFileSha256);
const expectedDecisions: any[] = [], statusCounts: Record<string, number> = {};
for (const [key, count] of [['shanghan',6], ['neijing',8], ['jinkui',6], ['wenbing',6]] as const) {
  const targets = read(`../../../work/professional22-${key}-targets.json`);
  const decisions = read(`../../../work/professional22-${key}-conflicts.json`);
  assert.equal(targets.catalogSha256, BASELINE_SHA);
  assert.equal(decisions.length, count);
  assert.deepEqual(decisions.map((r: any) => r.questionId).sort(), targets.targets.map((t: any) => t.question.id).sort());
  for (const raw of decisions) {
    const row = structuredClone(raw);
    row.scopeQuotes = row.scopeComparedRequirementIds.map((rid: string) => ({requirementId:rid, scope:before.requirementGuides[rid].scope}));
    row.restored = false; row.answerReverified = false;
    expectedDecisions.push(row);
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
    assert.ok(['ready-for-proposed-repair', 'pending-evidence'].includes(row.status));
    assert.equal(row.proposedRepair !== null, row.status === 'ready-for-proposed-repair');
    assert.ok(row.reason.trim() && row.remainingIssue.trim() && row.evidenceLinks.length);
    for (const key of ['independentExpertReview', 'examCalibration', 'fullRequirementAbilityVerified']) assert.equal(row[key], false);
    assert.ok(row.scopeQuotes.every((e: any) => official.includes(normalized(e.scope))));
    assert.equal(bank.get(row.questionId).professionalHold !== undefined, true);
    assert.deepEqual(bank.get(row.questionId), before.questions.find((q: any) => q.id === row.questionId));
    if (row.proposedRepair?.rubric) assert.equal(row.proposedRepair.rubric.reduce((n: number, r: any) => n + r.points, 0), 10);
  }
}
assert.equal(expectedDecisions.length, 26);
assert.equal(new Set(expectedDecisions.map(r => r.questionId)).size, 26);
assert.deepEqual(remediation.decisions, expectedDecisions);
assert.deepEqual(remediation.countsByStatus, statusCounts);
// A retained cross review must bind the actual final conflict bytes, not an older draft.
const shCross = read('../../../work/professional22-shanghan-crossreview.json');
assert.equal(shCross.length, 6);
assert.equal(supplement.inputFileSha256['work/professional22-shanghan-crossreview.json'], fileHash('../../../work/professional22-shanghan-crossreview.json'));
assert.deepEqual(shCross.map((r: any) => r.questionId).sort(), read('../../../work/professional22-shanghan-conflicts.json').map((r: any) => r.questionId).sort());
for (const row of shCross) {
  assert.equal(row.action, 'retain');
  assert.equal(row.finalDecisionSha256, fileHash('../../../work/professional22-shanghan-conflicts.json'));
  assert.ok(row.reason && row.evidenceLinks.length);
}
for (const [key, count] of [['neijing',8], ['jinkui',6], ['wenbing',6]] as const) {
  const conflictFile = `work/professional22-${key}-conflicts.json`;
  const crossFile = `work/professional22-${key}-primary-crossreview.json`;
  const rows = read('../../../' + crossFile);
  const conflictIds = read('../../../' + conflictFile).map((r: any) => r.questionId);
  assert.equal(rows.length, count);
  assert.equal(new Set(rows.map((r: any) => r.questionId)).size, count);
  assert.deepEqual(rows.map((r: any) => r.questionId).sort(), conflictIds.sort());
  assert.equal(supplement.inputFileSha256[crossFile], fileHash('../../../' + crossFile));
  for (const row of rows) {
    assert.equal(row.action, 'retain-proposal-or-pending-decision');
    assert.equal(row.inputFileSha256, fileHash('../../../' + conflictFile));
    assert.ok(row.reason.trim());
    assert.equal(row.oldAnswerCertified, false);
    assert.equal(row.originalQuestionRestored, false);
    for (const flag of ['independentExpertReview', 'examCalibration', 'fullRequirementAbilityVerified']) assert.equal(row[flag], false);
  }
}
// These negative controls prove that projection cannot hide unrelated live edits.
for (const mutate of [
  (d: any) => {d.questions[0].explanation += 'unauthorized';},
  (d: any) => {d.requirementGuides.K0078.scope += 'unauthorized';},
  (d: any) => {d.requirementGuides.K0060.directAssessment.reviewedFacets.tested.push('unauthorized');},
  (d: any) => {d.authoredQuestionReviewAudit.batches['written152-20'].questionIds.pop();},
  (d: any) => {d.requirementReadings.K0588.questionIds.push('unauthorized');},
  (d: any) => {d.courses[0].questionIds.push(supplementalIds[0]);},
]) {
  const corrupt = structuredClone(data); mutate(corrupt);
  assert.throws(() => readHistoricalCatalog(corrupt), 'Historical projection must reject every unrelated mutation');
}
for (let seed = 0; seed < 8; seed++) {
  const exam = assembleCourseExam(data.questions, freshState(), () => seed / 8);
  assert.equal(exam.questionIds.length, 91); assert.deepEqual(exam.missing, []);
  assert.ok(exam.questionIds.every(id => !bank.get(id).professionalHold));
}
console.log('Round 22: exact 23 additions / 30 requirement mappings, 26 unchanged-held remediation proposals, current source/OCR/input/cross hashes, manual-only rubrics, strict complete inverse and negative controls passed; not professional certification');
