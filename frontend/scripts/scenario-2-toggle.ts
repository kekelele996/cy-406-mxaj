import 'fake-indexeddb/auto';
import assert from 'node:assert';
import { useClauseStore } from '../src/stores/clause';
import { clauseDb } from '../src/api/db';
import { getRecord } from '../src/utils/db';

await useClauseStore.getState().loadClauses();
const id = useClauseStore.getState().clauses[0].id;

// 初始为启用
assert.strictEqual(useClauseStore.getState().clauses[0].enabled, true);

// 停用并落库
await useClauseStore.getState().disableClause(id);
assert.strictEqual(useClauseStore.getState().clauses.find((c) => c.id === id)!.enabled, false);
assert.strictEqual((await getRecord('clauses', id))!.enabled, false);

const before = (await getRecord('clauses', id))!.updatedAt;
await new Promise((resolve) => setTimeout(resolve, 15));

// 重复停用：状态一致，不应再次写入（updatedAt 不变）
await useClauseStore.getState().disableClause(id);
const afterRepeat = (await getRecord('clauses', id))!.updatedAt;
assert.strictEqual(afterRepeat, before, '重复停用不应产生写入');

// 恢复启用：立即重新可选
await useClauseStore.getState().enableClause(id);
assert.strictEqual(useClauseStore.getState().clauses.find((c) => c.id === id)!.enabled, true);
assert.strictEqual((await getRecord('clauses', id))!.enabled, true);

// 重复恢复也不产生写入
await new Promise((resolve) => setTimeout(resolve, 15));
const enabledAt = (await getRecord('clauses', id))!.updatedAt;
await useClauseStore.getState().enableClause(id);
assert.strictEqual((await getRecord('clauses', id))!.updatedAt, enabledAt, '重复恢复不应产生写入');

// 模拟写入失败：状态必须保留为启用
clauseDb.save = async () => {
  throw new Error('simulated quota failure');
};
await assert.rejects(() => useClauseStore.getState().disableClause(id), /simulated quota failure/);
assert.strictEqual(
  useClauseStore.getState().clauses.find((c) => c.id === id)!.enabled,
  true,
  '写入失败时内存状态保留为启用'
);

console.log('scenario-2 OK');
