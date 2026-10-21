const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const BASELINE_SHA = 'dbb12ce252c6be64ad80a77d8ffcb75519168cacc04295019145fa5f89cba921';
const supplementalIds = [
  ...Array.from({length:16}, (_, i) => `supplemental22-K0078-${String(i + 1).padStart(2, '0')}`),
  ...Array.from({length:7}, (_, i) => `supplemental22-K0060-${String(i + 1).padStart(2, '0')}`),
];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
function frozenBaseline() {
  const bytes = readFileSync('../../../work/professional22-before-catalog.json');
  assert.equal(sha256(bytes), BASELINE_SHA, 'The historical baseline bytes must remain frozen');
  return JSON.parse(bytes.toString('utf8'));
}
function removeExactAppend(actual, previous, appended, label) {
  assert.deepEqual(actual, [...previous, ...appended], `${label}: only the specified ordered append is allowed`);
  actual.splice(previous.length);
}
function sourceHashes(rows) {
  const hashes = {};
  for (const row of rows) for (const e of row.evidenceLinks) {
    if (e.source === 'external-primary-university') continue;
    assert.match(e.source, /^F\d{4}$/);
    assert.ok(Number.isInteger(e.page) && Number.isInteger(e.endPage) && e.page > 0 && e.endPage >= e.page);
    for (let page = e.page; page <= e.endPage; page++) {
      const file = e.source === 'F0007' ? `library/F0007/${String(page).padStart(4, '0')}.jpg` : `library/${e.source}.pdf`;
      hashes[file] = sha256(readFileSync(`public/${file}`));
    }
  }
  return hashes;
}
// Historical tests still read LIVE first. Only this exact additive release can
// be reversed; an unrelated change anywhere in the catalog is an assertion error.
function readHistoricalCatalog(live = readJson('public/course/catalog.json')) {
  live = require('./professional23-catalog.cjs').projectBeforeCase23(live);
  const before = frozenBaseline();
  if (!live.professionalSupplementAudit) {
    assert.deepEqual(live, before, 'Pre-application live catalog must equal the locked baseline');
    return structuredClone(live);
  }
  const projected = structuredClone(live), audit = projected.professionalSupplementAudit;
  const remediation = projected.professionalRemediationAudit;
  assert.ok(remediation, 'Both additive audit records must be present');
  assert.equal(audit.baselineCatalogSha256, BASELINE_SHA);
  assert.equal(remediation.baselineCatalogSha256, BASELINE_SHA);
  assert.equal(audit.batch, 'supplemental23-22');
  assert.equal(remediation.batch, 'conflict26-22');
  assert.deepEqual(audit.questionIds, supplementalIds);
  assert.deepEqual(audit.requirements, ['K0078', 'K0060', 'K0588']);
  assert.deepEqual(audit.questionsByRequirement, {K0078:16, K0060:7, K0588:7});
  assert.equal(remediation.originalQuestionsChanged, false);
  assert.deepEqual(remediation.restoredQuestionIds, []);
  for (const a of [audit, remediation]) for (const key of ['independentExpertReview', 'examCalibration', 'fullRequirementAbilityVerified', 'professionalReadinessVerified']) assert.equal(a[key], false);
  assert.equal(projected.questions.length, before.questions.length + 23);
  const additions = projected.questions.slice(before.questions.length);
  assert.deepEqual(additions.map(q => q.id), supplementalIds);
  const authoredPath = '../../../work/professional22-neijing-new-questions.json';
  assert.equal(sha256(readFileSync(authoredPath)), audit.inputFileSha256['work/professional22-neijing-new-questions.json']);
  const authored = readJson(authoredPath);
  assert.deepEqual(authored.map(q => q.id), supplementalIds);
  assert.equal(new Set(projected.questions.map(q => q.id)).size, 2440);
  assert.deepEqual(projected.questions.slice(0, before.questions.length), before.questions, 'All old questions and their nested snapshots must remain byte-semantically unchanged');
  for (const [i, q] of additions.entries()) {
    assert.deepEqual(q.requirementIds, i < 16 ? ['K0078'] : ['K0060', 'K0588']);
    assert.equal(q.authoredReview.batch, 'supplemental23-22');
    assert.equal(q.professionalHold, undefined);
    const expected = structuredClone(authored[i]), coverage = expected.coverage;
    const external = expected.evidenceLinks.filter(e => e.source === 'external-primary-university');
    Object.assign(expected, {
      family:q.id, classic:'黄帝内经', chapter:before.requirementGuides[q.requirementIds[0]].chapter,
      type:'专项简答题', options:[], answers:[], source:'F0007', sheet:'第二十二轮纲内测面补充', row:i + 1,
      subjective:true, review:'authored-source-grounded', assessmentGroup:q.requirementIds[0], assessmentOnly:true,
      budgetMinutes:3, coverageFacet:expected.stem, fullRequirementAssessment:false, answerBasis:'authored-bounded-supplemental-facet',
      reference:'考纲 ' + expected.requirementIds.join(',') + '；' + expected.evidenceLinks.map(e => 'page' in e
        ? `${e.citation} · 文件第${e.page}—${e.endPage}页` : `${e.citation} · ${e.url}`).join('；'),
      authoredReview:{date:'2026-10-05', batch:'supplemental23-22', status:'single-source-comparison',
        issue:'按原页及交叉意见补充此前未逐项设分的测面；不是独立教师审定。', original:null, coverage,
        independentExpertReview:false, examCalibration:false, fullRequirementAbilityVerified:false,
        rubricMode:'manual-reference-only', automaticGrade:false},
    });
    if (external.length) expected.externalEvidenceLinks = external;
    expected.evidenceLinks = expected.evidenceLinks.filter(e => e.source !== 'external-primary-university');
    delete expected.coverage;
    assert.deepEqual(q, expected, `Only the exact reviewed question payload may be appended: ${q.id}`);
  }
  projected.questions.splice(before.questions.length);
  for (const rid of ['K0078', 'K0060', 'K0588']) {
    const ids = additions.filter(q => q.requirementIds.includes(rid)).map(q => q.id);
    const g = projected.requirementGuides[rid], old = before.requirementGuides[rid];
    removeExactAppend(g.directQuestionIds, old.directQuestionIds, ids, `${rid} guide`);
    removeExactAppend(g.directAssessment.questionIds, old.directAssessment.questionIds, ids, `${rid} direct assessment`);
    removeExactAppend(projected.requirementReadings[rid].questionIds, before.requirementReadings[rid].questionIds, ids, `${rid} readings`);
  }
  for (const [i, course] of projected.courses.entries()) {
    const ids = additions.filter(q => course.requirements.some(r => r.id === q.requirementIds[0])).map(q => q.id);
    removeExactAppend(course.questionIds, before.courses[i].questionIds, ids, `${course.id ?? course.title} course`);
  }
  const a = projected.authoredQuestionReviewAudit, old = before.authoredQuestionReviewAudit;
  removeExactAppend(a.questionIds, old.questionIds, supplementalIds, 'authored audit IDs');
  removeExactAppend(a.checkedQuestionIds, old.checkedQuestionIds, supplementalIds, 'authored checked IDs');
  const batch = a.batches['supplemental23-22'];
  assert.ok(batch);
  assert.deepEqual(batch.questionIds, supplementalIds);
  assert.deepEqual(batch.checkedQuestionIds, supplementalIds);
  assert.deepEqual(batch.heldQuestionIds, []);
  const hashes = sourceHashes([...additions, ...remediation.decisions]);
  for (const map of [audit.sourceFileSha256, remediation.sourceFileSha256, batch.sourceFileSha256]) assert.deepEqual(map, hashes);
  assert.deepEqual(a.sourceFileSha256, {...old.sourceFileSha256, ...hashes}, 'Only source files actually referenced in this release may be appended');
  for (const [file, value] of Object.entries(old.sourceFileSha256)) assert.equal(a.sourceFileSha256[file], value, 'Existing source hashes cannot change');
  a.sourceFileSha256 = structuredClone(old.sourceFileSha256);
  delete a.batches['supplemental23-22'];
  delete projected.professionalSupplementAudit;
  delete projected.professionalRemediationAudit;
  assert.deepEqual(projected, before, 'Reversing ONLY the permitted 23 additions must recover the complete frozen catalog');
  return projected;
}
module.exports = {readHistoricalCatalog, frozenBaseline, supplementalIds, BASELINE_SHA, sha256, sourceHashes};
