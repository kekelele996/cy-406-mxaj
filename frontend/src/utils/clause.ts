import { Clause } from '../types/clause';
import { ClauseStatus } from '../types/enums';
import { Template } from '../types/template';

/**
 * 兼容已有的 IndexedDB 数据：早期条款记录没有 status 字段，一律视为启用。
 */
export function normalizeClause(clause: Clause): Clause {
  return { ...clause, status: clause.status ?? ClauseStatus.Active };
}

export function isClauseActive(clause: Clause) {
  return normalizeClause(clause).status === ClauseStatus.Active;
}

/**
 * 条款只要被模板正文引用过就不允许直接移除：
 * 插入时会累计 usageCount，同时正文会包含条款内容，两者任一命中即视为被引用。
 */
export function isClauseReferenced(clause: Clause, templates: Template[]) {
  if (clause.usageCount > 0) {
    return true;
  }

  const content = clause.contentHtml.trim();
  return Boolean(content) && templates.some((template) => template.contentHtml.includes(content));
}
