import { Button, Input, Message, Space, Typography } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useEffect, useMemo, useState } from 'react';
import { CategoryFilter, ClauseCard } from '../components/common';
import { ClauseEditor } from '../components/editor/ClauseEditor';
import { useClauseStore } from '../stores/clause';
import { useTemplateStore } from '../stores/template';
import { Clause, ClauseDraft, ClauseReferencedError } from '../types/clause';
import { CLAUSE_CATEGORY_LABELS, ClauseCategory } from '../types/enums';

type EnabledStatus = 'all' | 'enabled' | 'disabled';

export function ClauseList() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<EnabledStatus>('all');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingClause, setEditingClause] = useState<Clause | undefined>();
  const { clauses, loadClauses, createClause, updateClause, deleteClause, duplicateClause, enableClause, disableClause, isReferenced } =
    useClauseStore();
  const { loadTemplates } = useTemplateStore();

  useEffect(() => {
    void Promise.all([loadClauses(), loadTemplates()]);
  }, [loadClauses, loadTemplates]);

  const categoryOptions = Object.values(ClauseCategory).map((value) => ({
    value,
    label: CLAUSE_CATEGORY_LABELS[value],
    count: clauses.filter((clause) => clause.category === value).length
  }));

  const statusOptions = [
    { value: 'enabled', label: '启用中', count: clauses.filter((clause) => clause.enabled !== false).length },
    { value: 'disabled', label: '已停用', count: clauses.filter((clause) => clause.enabled === false).length }
  ];

  const filteredClauses = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return clauses.filter((clause) => {
      const categoryMatched = category === 'all' || clause.category === category;
      const statusMatched =
        status === 'all' ||
        (status === 'enabled' ? clause.enabled !== false : clause.enabled === false);
      const keywordMatched =
        !normalizedKeyword ||
        clause.title.toLowerCase().includes(normalizedKeyword) ||
        clause.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword));
      return categoryMatched && statusMatched && keywordMatched;
    });
  }, [category, clauses, keyword, status]);

  const openNewClause = () => {
    setEditingClause(undefined);
    setEditorVisible(true);
  };

  const submitClause = async (draft: ClauseDraft, clause?: Clause) => {
    if (clause) {
      await updateClause({ ...clause, ...draft });
      Message.success('条款已更新');
    } else {
      await createClause(draft);
      Message.success('条款已新增');
    }
  };

  const handleDelete = async (clause: Clause) => {
    try {
      await deleteClause(clause.id);
      Message.success('条款已删除');
    } catch (error) {
      if (error instanceof ClauseReferencedError) {
        Message.warning('该条款已被模板正文引用，不能删除，只能停用');
      } else {
        Message.error('删除失败，条款保持原状态');
      }
    }
  };

  const handleToggleEnabled = async (clause: Clause) => {
    const nextEnabled = clause.enabled === false;
    try {
      if (nextEnabled) {
        await enableClause(clause.id);
        Message.success('条款已恢复启用，可在条款抽屉中选择');
      } else {
        await disableClause(clause.id);
        Message.success('条款已停用，已插入模板的正文不受影响');
      }
    } catch {
      // 写入失败时 store 保留原状态。
      Message.error(nextEnabled ? '恢复启用失败，条款仍为停用状态' : '停用失败，条款仍为启用状态');
    }
  };

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <Typography.Title heading={3}>条款库管理</Typography.Title>
          <Typography.Text type="secondary">维护可复用条款，供模板编辑器插入。被模板引用的条款只能停用，不能删除。</Typography.Text>
        </div>
        <Space>
          <Button type="primary" icon={<IconPlus />} onClick={openNewClause}>
            新增条款
          </Button>
        </Space>
      </div>

      <div className="toolbar-row">
        <Input.Search allowClear placeholder="搜索条款标题或标签" value={keyword} onChange={setKeyword} />
        <CategoryFilter value={category} options={categoryOptions} onChange={setCategory} />
      </div>
      <div className="toolbar-row toolbar-row--compact">
        <CategoryFilter value={status} options={statusOptions} onChange={(value) => setStatus(value as EnabledStatus)} allLabel="全部状态" />
      </div>

      <div className="clause-grid">
        {filteredClauses.map((clause) => {
          const referenced = isReferenced(clause.id);
          return (
            <ClauseCard
              key={clause.id}
              clause={clause}
              referenced={referenced}
              onEdit={() => {
                setEditingClause(clause);
                setEditorVisible(true);
              }}
              onDuplicate={() => void duplicateClause(clause.id)}
              onDelete={(target) => void handleDelete(target)}
              onToggleEnabled={(target) => void handleToggleEnabled(target)}
            />
          );
        })}
      </div>

      {!filteredClauses.length && <div className="empty-state">没有匹配的条款。</div>}

      <ClauseEditor visible={editorVisible} clause={editingClause} onClose={() => setEditorVisible(false)} onSubmit={submitClause} />
    </section>
  );
}
