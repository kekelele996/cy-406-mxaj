import { ClauseCategory } from './enums';

export interface Clause {
  id: string;
  title: string;
  category: ClauseCategory;
  contentHtml: string;
  tags: string[];
  usageCount: number;
  /**
   * 启用状态：true 可在模板编辑器的条款抽屉中插入；false 表示已停用，
   * 已插入条款的模板正文保留不变，仅在抽屉中隐藏。旧数据缺省视为启用。
   */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ClauseDraft = Omit<Clause, 'id' | 'usageCount' | 'enabled' | 'createdAt' | 'updatedAt'>;

/** 条款被模板引用时抛出，此时只能停用、不能移除。 */
export class ClauseReferencedError extends Error {
  constructor(id: string) {
    super(`条款 ${id} 已被模板正文引用，不能删除，只能停用`);
    this.name = 'ClauseReferencedError';
  }
}
