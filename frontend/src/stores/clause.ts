import { create } from 'zustand';
import { clauseDb } from '../api/db';
import { Clause, ClauseDraft } from '../types/clause';
import { ClauseCategory, ClauseStatus } from '../types/enums';
import { normalizeClause } from '../utils/clause';
import { makeId, nowIso, putRecord } from '../utils/db';
import { seedClauses } from '../utils/seed';

interface ClauseState {
  clauses: Clause[];
  loading: boolean;
  loadClauses: () => Promise<void>;
  createClause: (draft: Partial<ClauseDraft>) => Promise<Clause>;
  updateClause: (clause: Clause) => Promise<void>;
  setClauseStatus: (id: string, status: ClauseStatus) => Promise<void>;
  deleteClause: (id: string) => Promise<void>;
  duplicateClause: (id: string) => Promise<Clause | undefined>;
  incrementUsage: (id: string) => Promise<void>;
}

const defaultDraft: ClauseDraft = {
  title: '未命名条款',
  category: ClauseCategory.Breach,
  tags: [],
  contentHtml: '<p>在此编辑条款内容。</p>'
};

function sortClauses(clauses: Clause[]) {
  return [...clauses].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function upsertClause(list: Clause[], clause: Clause) {
  const exists = list.some((item) => item.id === clause.id);
  return sortClauses(exists ? list.map((item) => (item.id === clause.id ? clause : item)) : [clause, ...list]);
}

export const useClauseStore = create<ClauseState>((set, get) => ({
  clauses: [],
  loading: false,

  async loadClauses() {
    set({ loading: true });
    try {
      let clauses = (await clauseDb.list()).map(normalizeClause);
      if (!clauses.length) {
        await Promise.all(seedClauses.map((clause) => putRecord('clauses', clause)));
        clauses = seedClauses.map(normalizeClause);
      }
      set({ clauses: sortClauses(clauses) });
    } finally {
      set({ loading: false });
    }
  },

  async createClause(draft) {
    const timestamp = nowIso();
    const clause: Clause = {
      ...defaultDraft,
      ...draft,
      id: makeId('clause'),
      usageCount: 0,
      status: ClauseStatus.Active,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await clauseDb.save(clause);
    set((state) => ({ clauses: upsertClause(state.clauses, clause) }));
    return clause;
  },

  async updateClause(clause) {
    const next = { ...normalizeClause(clause), updatedAt: nowIso() };
    await clauseDb.save(next);
    set((state) => ({ clauses: upsertClause(state.clauses, next) }));
  },

  async setClauseStatus(id, status) {
    const clause = get().clauses.find((item) => item.id === id);
    if (!clause || normalizeClause(clause).status === status) {
      // 重复停用或恢复只记录一次状态
      return;
    }

    const next = { ...normalizeClause(clause), status, updatedAt: nowIso() };
    // 先写库再更新内存，写入失败时保留原状态
    await clauseDb.save(next);
    set((state) => ({ clauses: upsertClause(state.clauses, next) }));
  },

  async deleteClause(id) {
    await clauseDb.remove(id);
    set((state) => ({ clauses: state.clauses.filter((clause) => clause.id !== id) }));
  },

  async duplicateClause(id) {
    const source = get().clauses.find((clause) => clause.id === id);
    if (!source) {
      return undefined;
    }

    return get().createClause({
      title: `${source.title} 副本`,
      category: source.category,
      contentHtml: source.contentHtml,
      tags: [...source.tags, '副本']
    });
  },

  async incrementUsage(id) {
    const clause = get().clauses.find((item) => item.id === id);
    if (!clause) {
      return;
    }

    await get().updateClause({ ...clause, usageCount: clause.usageCount + 1 });
  }
}));
