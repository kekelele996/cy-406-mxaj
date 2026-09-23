import 'fake-indexeddb/auto';
import assert from 'node:assert';
import { useClauseStore } from '../src/stores/clause';
import { useTemplateStore } from '../src/stores/template';
import { ClauseReferencedError } from '../src/types/clause';

await Promise.all([useClauseStore.getState().loadClauses(), useTemplateStore.getState().loadTemplates()]);

const clauseId = useClauseStore.getState().clauses[0].id;

// 未被引用 → 可以直接删除
assert.strictEqual(useTemplateStore.getState().isClauseReferenced(clauseId), false, '新条款初始不应被引用');
await useClauseStore.getState().deleteClause(clauseId);
assert.strictEqual(
  useClauseStore.getState().clauses.some((c) => c.id === clauseId),
  false,
  '未引用条款应已删除'
);

// 新建条款并让模板引用（模拟插入正文并保存）
const newClause = await useClauseStore.getState().createClause({
  title: '测试条款',
  contentHtml: '<p>特殊条款内容XYZ</p>'
});
const template = useTemplateStore.getState().templates[0];
await useTemplateStore.getState().updateTemplate(
  {
    ...template,
    contentHtml: `${template.contentHtml}${newClause.contentHtml}`,
    referencedClauseIds: [newClause.id]
  },
  false
);

assert.strictEqual(useTemplateStore.getState().isClauseReferenced(newClause.id), true, '插入后应被识别为引用');

let threw: unknown;
try {
  await useClauseStore.getState().deleteClause(newClause.id);
} catch (error) {
  threw = error;
}
assert.ok(threw instanceof ClauseReferencedError, '被引用条款删除应抛出 ClauseReferencedError');
assert.ok(
  useClauseStore.getState().clauses.some((c) => c.id === newClause.id),
  '删除被拒绝后条款必须仍在库中'
);

// 被引用时停用是允许的
await useClauseStore.getState().disableClause(newClause.id);
assert.strictEqual(
  useClauseStore.getState().clauses.find((c) => c.id === newClause.id)!.enabled,
  false,
  '被引用条款应可停用'
);
// 模板正文未受影响
assert.ok(
  useTemplateStore
    .getState()
    .templates.find((t) => t.id === template.id)!.contentHtml.includes('特殊条款内容XYZ'),
  '停用不得影响模板已有正文'
);

console.log('scenario-1 OK');
