import { getDB } from './db'

/**
 * 受试者档案。
 *
 * 教师一机管多人的根基：所有报告、训练周期起点都以 `id` 为分区键。
 * `id` 由教师输入（如 S01 或学号），不复用设备级匿名 ID——
 * anonymousId.ts 生成的是「一台设备一个 ID」，110 个学生会共享同一个值。
 */
export type Subject = {
  /** 受试者编号，教师自定。全局唯一，作为报告的分区键。 */
  id: string
  name?: string
  /** 班级或组别，用于切换面板分组，如「1班」「G1」。 */
  group: string
  /** 实验分组（G1 软件组 / G2 教师组 / G3 参照组）；与班级分开，供统计分析使用。 */
  experimentGroup?: 'G1' | 'G2' | 'G3'
  /** 该受试者 8 周训练周期的起点（ISO）。首次进入训练页时写入。 */
  programStart?: string
  createdAt: string
}

const ACTIVE_KEY = 'ys-personal-trainer.active-subject.v1'

export async function listSubjects(): Promise<Subject[]> {
  const db = await getDB()
  const subjects = await db.getAll('subjects')
  return subjects.sort(
    (a, b) => a.group.localeCompare(b.group, 'zh') || a.id.localeCompare(b.id, 'zh'),
  )
}

export async function getSubject(id: string): Promise<Subject | undefined> {
  const db = await getDB()
  return db.get('subjects', id)
}

export async function createSubject(input: {
  id: string
  name?: string
  group: string
  experimentGroup?: Subject['experimentGroup']
}): Promise<Subject> {
  const db = await getDB()
  const subject: Subject = {
    id: input.id.trim(),
    name: input.name?.trim() || undefined,
    group: input.group.trim() || '未分组',
    experimentGroup: input.experimentGroup,
    createdAt: new Date().toISOString(),
  }
  await db.put('subjects', subject)
  return subject
}

export async function updateSubject(
  id: string,
  patch: Partial<Omit<Subject, 'id' | 'createdAt'>>,
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('subjects', id)
  if (!existing) return
  await db.put('subjects', { ...existing, ...patch })
}

/** 删除受试者，并连带删除其全部报告。 */
export async function deleteSubject(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['subjects', 'reports'], 'readwrite')
  await tx.objectStore('subjects').delete(id)
  const index = tx.objectStore('reports').index('bySubject')
  let cursor = await index.openCursor(id)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
  if (getActiveSubjectId() === id) clearActiveSubject()
}

/** 确保受试者拥有训练周期起点，返回该起点。 */
export async function ensureProgramStart(id: string): Promise<string> {
  const subject = await getSubject(id)
  if (subject?.programStart) return subject.programStart
  const start = new Date().toISOString()
  await updateSubject(id, { programStart: start })
  return start
}

export function getActiveSubjectId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setActiveSubjectId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    // 存储不可用时仅影响下次打开时的默认选中，不影响本次使用。
  }
}

export function clearActiveSubject(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // 同上。
  }
}

export async function getActiveSubject(): Promise<Subject | null> {
  const id = getActiveSubjectId()
  if (!id) return null
  return (await getSubject(id)) ?? null
}
