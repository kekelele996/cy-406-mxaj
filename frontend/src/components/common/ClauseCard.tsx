import { Button, Card, Popconfirm, Space, Tag, Tooltip, Typography } from '@arco-design/web-react';
import { IconCopy, IconDelete, IconEdit, IconPlus } from '@arco-design/web-react/icon';
import { Clause } from '../../types/clause';
import { CLAUSE_CATEGORY_LABELS } from '../../types/enums';
import { htmlToPlainText } from '../../utils/diff';

interface ClauseCardProps {
  clause: Clause;
  referenced?: boolean;
  onEdit?: (clause: Clause) => void;
  onDuplicate?: (clause: Clause) => void;
  onDelete?: (clause: Clause) => void;
  onInsert?: (clause: Clause) => void;
  onToggleEnabled?: (clause: Clause) => void;
}

export function ClauseCard({ clause, referenced = false, onEdit, onDuplicate, onDelete, onInsert, onToggleEnabled }: ClauseCardProps) {
  const enabled = clause.enabled !== false;

  return (
    <Card className={`clause-card${enabled ? '' : ' clause-card--disabled'}`} hoverable>
      <div className="template-card__header">
        <Typography.Title heading={6}>{clause.title}</Typography.Title>
        <Space size={4}>
          <Tag color="orangered">{CLAUSE_CATEGORY_LABELS[clause.category]}</Tag>
          {!enabled && (
            <Tag color="gray">{referenced ? '已停用 · 被引用' : '已停用'}</Tag>
          )}
        </Space>
      </div>
      <Typography.Paragraph className="clause-excerpt" ellipsis={{ rows: 2 }}>
        {htmlToPlainText(clause.contentHtml)}
      </Typography.Paragraph>
      <Space wrap size={[6, 6]} className="tag-row">
        {clause.tags.map((tag) => (
          <Tag key={tag} size="small">
            {tag}
          </Tag>
        ))}
        <Tag size="small" color="green">
          使用 {clause.usageCount}
        </Tag>
        {referenced && (
          <Tag size="small" color="arcoblue">
            模板已引用
          </Tag>
        )}
      </Space>
      <div className="card-actions">
        {onInsert && enabled && (
          <Button icon={<IconPlus />} type="primary" onClick={() => onInsert(clause)}>
            插入
          </Button>
        )}
        {onEdit && (
          <Button icon={<IconEdit />} onClick={() => onEdit(clause)}>
            编辑
          </Button>
        )}
        {onDuplicate && (
          <Button icon={<IconCopy />} onClick={() => onDuplicate(clause)}>
            复制
          </Button>
        )}
        {onToggleEnabled &&
          (enabled ? (
            <Popconfirm
              title={referenced ? '该条款已被模板引用，停用后仅在条款抽屉中隐藏，已插入的正文不受影响。确认停用？' : '停用后模板编辑器将不再提供该条款。确认停用？'}
              onOk={() => onToggleEnabled(clause)}
            >
              <Button status="warning">停用</Button>
            </Popconfirm>
          ) : (
            <Button type="primary" status="success" onClick={() => onToggleEnabled(clause)}>
              恢复启用
            </Button>
          ))}
        {onDelete &&
          (referenced ? (
            <Tooltip content="已被模板正文引用，不能删除，只能停用">
              <Button icon={<IconDelete />} status="danger" disabled>
                删除
              </Button>
            </Tooltip>
          ) : (
            <Popconfirm title="确认删除该条款？删除后不可恢复。" onOk={() => onDelete(clause)}>
              <Button icon={<IconDelete />} status="danger">
                删除
              </Button>
            </Popconfirm>
          ))}
      </div>
    </Card>
  );
}
