import { openDB, IDBPDatabase } from 'idb';
import { Clause } from '../types/clause';
import { ContractInstance } from '../types/contract-instance';
import { Template } from '../types/template';
import { Version } from '../types/version';

export const DB_NAME = 'contract-template-editor';
export const DB_VERSION = 1;

export const STORE_NAMES = ['templates', 'clauses', 'instances', 'versions'] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export interface StoreValueMap {
  templates: Template;
  clauses: Clause;
  instances: ContractInstance;
  versions: Version;
}

export type StoreValue<S extends StoreName> = StoreValueMap[S];

export interface ExportPayload {
  templates: Template[];
  clauses: Clause[];
  instances: ContractInstance[];
  versions: Version[];
  exportedAt: string;
}

let dbPromise: Promise<IDBPDatabase> | undefined;

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

/**
 * 兼容历史 IndexedDB 数据：
 * - 旧条款没有 enabled 字段，缺省视为启用；
 * - 旧模板没有 referencedClauseIds 字段，缺省为空数组（不影响已插入的正文）。
 */
export function normalizeClause(raw: Clause): Clause {
  return { ...raw, enabled: raw.enabled !== false };
}

export function normalizeTemplate(raw: Template): Template {
  return {
    ...raw,
    referencedClauseIds: Array.isArray(raw.referencedClauseIds) ? raw.referencedClauseIds : []
  };
}

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const storeName of STORE_NAMES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      }
    });
  }

  return dbPromise;
}

export async function getAllRecords<S extends StoreName>(storeName: S): Promise<StoreValue<S>[]> {
  const db = await getDb();
  const records = (await db.getAll(storeName)) as StoreValue<S>[];
  return records.map((record) => normalizeRecord(storeName, record));
}

export async function getRecord<S extends StoreName>(storeName: S, id: string): Promise<StoreValue<S> | undefined> {
  const db = await getDb();
  const record = (await db.get(storeName, id)) as StoreValue<S> | undefined;
  return record ? normalizeRecord(storeName, record) : undefined;
}

function normalizeRecord<S extends StoreName>(storeName: S, record: StoreValue<S>): StoreValue<S> {
  if (storeName === 'clauses') {
    return normalizeClause(record as Clause) as StoreValue<S>;
  }
  if (storeName === 'templates') {
    return normalizeTemplate(record as Template) as StoreValue<S>;
  }
  return record;
}

export async function putRecord<S extends StoreName>(storeName: S, record: StoreValue<S>) {
  const db = await getDb();
  const normalized = normalizeRecord(storeName, record);
  await db.put(storeName, normalized);
  return normalized;
}

export async function deleteRecord(storeName: StoreName, id: string) {
  const db = await getDb();
  await db.delete(storeName, id);
}

export async function clearStore(storeName: StoreName) {
  const db = await getDb();
  await db.clear(storeName);
}

export async function exportAllData(): Promise<ExportPayload> {
  const [templates, clauses, instances, versions] = await Promise.all([
    getAllRecords('templates'),
    getAllRecords('clauses'),
    getAllRecords('instances'),
    getAllRecords('versions')
  ]);

  return {
    templates,
    clauses,
    instances,
    versions,
    exportedAt: nowIso()
  };
}

export async function importAllData(payload: Partial<ExportPayload>) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAMES, 'readwrite');

  for (const storeName of STORE_NAMES) {
    const store = tx.objectStore(storeName);
    await store.clear();
    const records = (payload[storeName] ?? []) as StoreValue<typeof storeName>[];
    for (const record of records) {
      await store.put(normalizeRecord(storeName, record));
    }
  }

  await tx.done;
}
