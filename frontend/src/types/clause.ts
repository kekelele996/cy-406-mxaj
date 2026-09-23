import { ClauseCategory, ClauseStatus } from './enums';

export interface Clause {
  id: string;
  title: string;
  category: ClauseCategory;
  contentHtml: string;
  tags: string[];
  usageCount: number;
  status: ClauseStatus;
  createdAt: string;
  updatedAt: string;
}

export type ClauseDraft = Omit<Clause, 'id' | 'usageCount' | 'status' | 'createdAt' | 'updatedAt'>;
