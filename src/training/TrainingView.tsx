import { Dumbbell } from 'lucide-react'
import { useMemo } from 'react'
import type { JumpAnalysis } from '../biomechanics/types'
import { generateTrainingPlan } from './planGenerator'
import type { Exercise } from './exerciseLibrary'

function doseLabel(exercise: Exercise) {
  const unit = exercise.unit === 'seconds' ? '秒' : '次'
  return `${exercise.sets} 组 × ${exercise.reps} ${unit}`
}

/**
 * 训练计划页：把一次动作诊断转成一节 30–60 分钟的训练课。
 * 尚未做过诊断时显示引导空态。
 */
export function TrainingView({ analysis }: { analysis?: JumpAnalysis }) {
  const plan = useMemo(() => generateTrainingPlan(analysis), [analysis])

  if (!analysis) {
    return (
      <section className="subpage" aria-labelledby="training-title">
        <div className="subpage-heading">
          <span className="dashboard-kicker">03 / TRAINING</span>
          <h1 id="training-title">训练计划</h1>
          <p>这里会把你的动作诊断转成一节可以直接照着练的训练课。</p>
        </div>
        <div className="empty-subpage">
          <Dumbbell aria-hidden="true" size={30} />
          <strong>还没有可用的诊断结果</strong>
          <span>先完成一次动作诊断，系统会据此生成针对性的训练方案。</span>
        </div>
      </section>
    )
  }

  return (
    <section className="subpage" aria-labelledby="training-title">
      <div className="subpage-heading">
        <span className="dashboard-kicker">03 / TRAINING</span>
        <h1 id="training-title">本次训练方案</h1>
        <p>根据最近一次动作诊断生成，可支撑一次完整的训练课。</p>
      </div>

      <div className="training-plan">
        <div className="plan-meta">
          <div className="plan-meta__item">
            <span>预计时长</span>
            <strong>{plan.totalMinutes}</strong>
          </div>
          <div className="plan-meta__item plan-meta__item--wide">
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
                    <span>组间休息 {item.exercise.restSeconds} 秒</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <p className="plan-note">
          方案由本次动作诊断的指标偏离情况自动匹配，组数与次数为教学经验值，可按自身情况微调。
          动作过程如有不适请立即停止。
        </p>
      </div>
    </section>
  )
}
