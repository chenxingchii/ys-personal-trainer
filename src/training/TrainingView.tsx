import { Dumbbell } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { JumpAnalysis } from '../biomechanics/types'
import { FREQUENCY_NOTE, generateTrainingPlan } from './planGenerator'
import { generateProgram, phaseOf, type TrainingProgram } from './programGenerator'
import { ensureProgramStart, type Subject } from '../storage/subjects'
import type { Exercise } from './exerciseLibrary'

function doseLabel(exercise: Exercise) {
  const unit = exercise.unit === 'seconds' ? '秒' : '次'
  return `${exercise.sets} 组 × ${exercise.reps} ${unit}`
}

/**
 * 训练计划页：把一次动作诊断转成「该受试者 8 周周期化计划中的本周课表」。
 *
 * 周期起点挂在受试者档案上（Subject.programStart），不再用全局 localStorage key——
 * 否则教师一台手机管一个班时，所有人会共用第一个人的 8 周进度。
 */
export function TrainingView({
  analysis,
  subject,
}: {
  analysis?: JumpAnalysis
  subject?: Subject | null
}) {
  const [programStart, setProgramStart] = useState<string | null>(subject?.programStart ?? null)

  useEffect(() => {
    if (!subject) {
      setProgramStart(null)
      return
    }
    if (subject.programStart) {
      setProgramStart(subject.programStart)
      return
    }
    let alive = true
    void ensureProgramStart(subject.id).then((start) => {
      if (alive) setProgramStart(start)
    })
    return () => {
      alive = false
    }
  }, [subject?.id, subject?.programStart])

  const program: TrainingProgram = useMemo(
    () => generateProgram(analysis, programStart ?? new Date().toISOString()),
    [analysis, programStart],
  )
  const phase = useMemo(() => phaseOf(program), [program])
  const plan = useMemo(
    () => generateTrainingPlan(analysis, { loadStep: phase.loadStep }),
    [analysis, phase.loadStep],
  )

  if (!analysis) {
    return (
      <section className="subpage" aria-labelledby="training-title">
        <div className="subpage-heading">
          <span className="dashboard-kicker">03 / TRAINING</span>
          <h1 id="training-title">训练计划</h1>
          <p>这里会把动作诊断转成一段 8 周的训练计划。</p>
        </div>
        <div className="empty-subpage">
          <Dumbbell aria-hidden="true" size={30} />
          <strong>还没有可用的诊断结果</strong>
          <span>
            {subject ? '先为当前受试者完成一次动作诊断。' : '先在顶部选择受试者，再完成一次动作诊断。'}
          </span>
        </div>
      </section>
    )
  }

  return (
    <section className="subpage" aria-labelledby="training-title">
      <div className="subpage-heading">
        <span className="dashboard-kicker">03 / TRAINING</span>
        <h1 id="training-title">本周训练方案</h1>
        <p>
          今天是计划的第 {program.currentWeek} 周（共 {program.totalWeeks} 周），
          当前处于{phase.phaseLabel}。方案按{subject ? `受试者 ${subject.id} ` : ''}最近一次诊断生成。
        </p>
      </div>

      <div className="training-plan">
        <div className="plan-meta">
          <div className="plan-meta__item">
            <span>训练周期</span>
            <strong>
              第 {program.currentWeek} / {program.totalWeeks} 周 · {phase.phaseLabel}
            </strong>
          </div>
          <div className="plan-meta__item">
            <span>预计时长</span>
            <strong>{plan.totalMinutes}</strong>
          </div>
          <div className="plan-meta__item">
            <span>训练频率</span>
            <strong>{plan.frequency}</strong>
          </div>
          <div className="plan-meta__item">
            <span>本次针对</span>
            {plan.isMaintenance ? (
              <strong>保持动作节奏</strong>
            ) : (
              <div className="focus-chips">
                {plan.focusMetrics.map((label) => (
                  <span className="focus-chip" key={label}>
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="plan-phase-note">{phase.note}</p>

        {plan.sections.map((section) => (
          <section className={`plan-section plan-section--${section.kind}`} key={section.kind}>
            <div className="plan-section__heading">
              <h2>{section.title}</h2>
              <p>{section.intro}</p>
            </div>
            <ol className="plan-items">
              {section.items.map((item) => (
                <li className="plan-item" key={item.exercise.id}>
                  <div className="plan-item__head">
                    <strong>{item.exercise.name}</strong>
                    <span className="plan-item__dose">{doseLabel(item.exercise)}</span>
                  </div>
                  <p>{item.exercise.cue}</p>
                  <div className="plan-item__foot">
                    {item.metricLabel ? (
                      <span className="plan-item__target">针对 · {item.metricLabel}</span>
                    ) : null}
                    {item.severityBoost ? (
                      <span className="plan-item__severity">
                        偏离明显 · 已加 {item.severityBoost} 组
                      </span>
                    ) : null}
                    <span>组间休息 {item.exercise.restSeconds} 秒</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <p className="plan-note">
          方案由本次动作诊断的指标偏离情况自动匹配，是一节以纠正动作模式为目标的练习课；组数与次数为教学经验值，可按自身情况微调。
          {FREQUENCY_NOTE}
          如有关节疼痛、肿胀，或两侧力量明显不对称，请先暂停并咨询老师。
        </p>
      </div>
    </section>
  )
}
