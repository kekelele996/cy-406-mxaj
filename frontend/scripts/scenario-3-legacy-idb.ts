import 'fake-indexeddb/auto';
import assert from 'node:assert';
import { DB_NAME, STORE_NAMES, getRecord } from '../src/utils/db';

const now = new Date().toISOString();
const oldClause = {
  id: 'clause_old1',
  title: '旧条款',
  category: 'breach',
  contentHtml: '<p>旧条款正文ABC</p>',
  tags: [],
  usageCount: 3,
  createdAt: now,
  updatedAt: now
  // 注意：没有 enabled 字段
};
const oldTemplate = {
  id: 'tpl_old1',
  title: '旧模板',
  category: 'service',
  contentHtml: `<h1>标题</h1>${oldClause.contentHtml}`,
  variables: [],
  tags: [],
  createdAt: now,
  updatedAt: now
  // 注意：没有 referencedClauseIds 字段
};

// 直接以旧数据形态写入 IndexedDB（绕过规范化）
await new Promise<void>((resolve, reject) => {
  const req = indexedDB.open(DB_NAME);
  req.onupgradeneeded = () => {
    const db = req.result;
    for (const storeName of STORE_NAMES) {
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'id' });
    }
  };
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction(['templates', 'clauses'], 'readwrite');
    tx.objectStore('clauses').put(oldClause);
    tx.objectStore('templates').put(oldTemplate);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  };
  req.onerror = () => reject(req.error);
});

// 底层数据确实没有新字段
const rawClause = await getRecord('clauses', 'clause_old1');
assert.strictEqual(rawClause!.enabled, true, '旧条款缺省 enabled 应被规范化为 true');
assert.deepStrictEqual((await getRecord('templates', 'tpl_old1'))!.referencedClauseIds, [], '旧模板缺省引用为空数组');

const { useClauseStore } = await import('../src/stores/clause');
const { useTemplateStore } = await import('../src/stores/template');
await Promise.all([useClauseStore.getState().loadClauses(), useTemplateStore.getState().loadTemplates()]);

// 旧条款在列表中缺省启用
assert.strictEqual(useClauseStore.getState().clauses.find((c) => c.id === 'clause_old1')!.enabled, true, '旧条款应默认启用');

// 旧模板正文中包含条款原文 → 回填为已引用，防止误删
assert.strictEqual(useTemplateStore.getState().isClauseReferenced('clause_old1'), true, '旧模板引用应被回填');

let threw: unknown;
try {
  await useClauseStore.getState().deleteClause('clause_old1');
} catch (error) {
  threw = error;
}
assert.ok(threw, '回填为引用后旧条款不应允许删除');

// 停用旧条款：抽屉过滤后不可见
await useClauseStore.getState().disableClause('clause_old1');
const available = useClauseStore.getState().clauses.filter((c) => c.enabled !== false);
assert.strictEqual(available.some((c) => c.id === 'clause_old1'), false, '停用条款不应出现在抽屉候选中');

// 但模板正文一字不少
const tpl = useTemplateStore.getState().templates.find((t) => t.id === 'tpl_old1')!;
assert.ok(tpl.contentHtml.includes('旧条款正文ABC'), '停用不得丢失已有正文');

// 恢复后立即可选
await useClauseStore.getState().enableClause('clause_old1');
const restored = useClauseStore.getState().clauses.filter((c) => c.enabled !== false);
assert.ok(restored.some((c) => c.id === 'clause_old1'), '恢复后应立即重新可选');

console.log('scenario-3 OK');
