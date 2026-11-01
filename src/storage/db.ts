import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { LocalReport } from '../reports/localReports'
import type { Subject } from './subjects'

/**
 * 唯一的持久化层。
 *
 * 为什么从 localStorage 换成 IndexedDB：
 * 实测单条报告约 10.1 KB，6 个班 × 20 人 × 6 次诊断 = 720 条约 7.10 MB，
 * 超过 localStorage 约 5 MB 的上限；且其同步 API 在数百条整表 JSON 解析时会阻塞主线程。
 * `idb` 这个依赖在 package.json 里已存在多轮迭代，但一直未被使用，本次正式接入。
 */

interface TrainerDB extends DBSchema {
  subjects: { key: string; value: Subject }
  reports: {
    key: string
    value: LocalReport
    indexes: { bySubject: string }
  }
}

const DB_NAME = 'ys-trainer'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<TrainerDB>> | null = null

export function getDB(): Promise<IDBPDatabase<TrainerDB>> {
  dbPromise ??= openDB<TrainerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('subjects')) {
        db.createObjectStore('subjects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('reports')) {
        const reports = db.createObjectStore('reports', { keyPath: 'id' })
        reports.createIndex('bySubject', 'subjectId')
      }
    },
  })
  return dbPromise
}

/** 仅测试用：关闭缓存连接并删除整个数据库。 */
export async function resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null)
    db?.close()
  }
  dbPromise = null
  await deleteDB(DB_NAME)
}
