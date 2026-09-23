import { TemplateCategory, VariableType } from './enums';

export interface TemplateVariable {
  id: string;
  name: string;
  label: string;
  type: VariableType;
  defaultValue: string;
  required: boolean;
}

export interface Template {
  id: string;
  title: string;
  category: TemplateCategory;
  contentHtml: string;
  variables: TemplateVariable[];
  /** 曾通过条款抽屉插入过的条款 id，用于判断条款是否被正文引用。 */
  referencedClauseIds: string[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type TemplateDraft = Omit<Template, 'id' | 'createdAt' | 'updatedAt'>;
