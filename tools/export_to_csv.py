#!/usr/bin/env python3
"""把 YS 专属训练师导出的 JSON 转成统计软件可直接读取的 CSV。

用法：
    python tools/export_to_csv.py ys-trainer-2026-11-01.json -o out

产出三张表：
    subjects.csv       受试者名册（一行一人）
    reports_wide.csv   宽表（一行一次诊断，11 项指标各一列）—— 进 Excel / SPSS / R
    reports_long.csv   长表（一行一次诊断的一个指标）—— 做混合模型、画轨迹图

为什么宽表里有几列是空的：
    系统不记录立定跳远成绩、测试时点（T0/T1/T2）与实验分组（G1/G2/G3），
    但这三项是主结局分析的必需字段。脚本预先留出空列，
    由教师在 Excel 里按纸质记录补填，或用 --scores 参数传入。
"""

import argparse
import csv
import json
import sys
from pathlib import Path

METRIC_IDS = [
    "pre-squat-knee",
    "pre-push-shin",
    "pre-push-hip",
    "takeoff-knee",
    "backward-arm",
    "forward-arm",
    "arm-swing-range",
    "landing-contact-knee",
    "landing-lowest-knee",
    "landing-buffer",
    "knee-asymmetry",
]

# 主结局与设计变量：系统不产出，留给教师补填。
MANUAL_COLUMNS = ["long_jump_cm", "timepoint", "experiment_group"]


def load_payload(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict) or "reports" not in payload or "subjects" not in payload:
        raise SystemExit(f"{path} 不是有效的导出文件：缺少 subjects 或 reports")
    return payload


def load_scores(path: Path | None) -> dict:
    """可选：外部补填的成绩表，列为 report_id,long_jump_cm,timepoint,experiment_group。"""
    if path is None:
        return {}
    with path.open(encoding="utf-8") as handle:
        return {row["report_id"]: row for row in csv.DictReader(handle) if row.get("report_id")}


def write_subjects(subjects: list, reports: list, out_dir: Path) -> None:
    counts: dict[str, int] = {}
    for report in reports:
        counts[report["subjectId"]] = counts.get(report["subjectId"], 0) + 1

    path = out_dir / "subjects.csv"
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["subject_id", "name", "group", "program_start", "created_at", "report_count"])
        for subject in subjects:
            writer.writerow(
                [
                    subject.get("id", ""),
                    subject.get("name", ""),
                    subject.get("group", ""),
                    subject.get("programStart", ""),
                    subject.get("createdAt", ""),
                    counts.get(subject.get("id", ""), 0),
                ]
            )
    print(f"subjects.csv       {len(subjects)} 行")


def write_wide(reports: list, subjects: list, scores: dict, out_dir: Path) -> None:
    experiment_groups = {subject.get("id", ""): subject.get("experimentGroup", "") for subject in subjects}
    header = [
        "report_id",
        "subject_id",
        "created_at",
        "video_name",
        "quality_tier",
        "total_score",
        "level",
        "primary_issue",
        *MANUAL_COLUMNS,
    ]
    for metric_id in METRIC_IDS:
        header.append(f"{metric_id}_value")
        header.append(f"{metric_id}_status")

    path = out_dir / "reports_wide.csv"
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        for report in reports:
            analysis = report.get("analysis") or {}
            coach = report.get("coachReport") or {}
            metrics = {metric.get("id"): metric for metric in analysis.get("metrics") or []}
            manual = scores.get(report.get("id", ""), {})

            row = [
                report.get("id", ""),
                report.get("subjectId", ""),
                report.get("createdAt", ""),
                report.get("videoName", ""),
                report.get("qualityTier", ""),
                analysis.get("score", ""),
                (report.get("assessment") or {}).get("level", ""),
                coach.get("priority", ""),
            ]
            # 优先用 --scores 补填值，否则用 App 内录入的成绩、时点与受试者实验分组。
            row.append(manual.get("long_jump_cm") or report.get("longJumpCm", ""))
            row.append(manual.get("timepoint") or report.get("timepoint", ""))
            row.append(
                manual.get("experiment_group") or experiment_groups.get(report.get("subjectId", ""), "")
            )
            for metric_id in METRIC_IDS:
                metric = metrics.get(metric_id)
                row.append("" if metric is None else metric.get("value", ""))
                row.append("" if metric is None else metric.get("status", ""))
            writer.writerow(row)
    print(f"reports_wide.csv   {len(reports)} 行 × {len(header)} 列")


def write_long(reports: list, out_dir: Path) -> None:
    path = out_dir / "reports_long.csv"
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "report_id",
                "subject_id",
                "created_at",
                "quality_tier",
                "metric_id",
                "metric_label",
                "value",
                "target",
                "status",
                "confidence",
                "side",
            ]
        )
        rows = 0
        for report in reports:
            for metric in (report.get("analysis") or {}).get("metrics") or []:
                writer.writerow(
                    [
                        report.get("id", ""),
                        report.get("subjectId", ""),
                        report.get("createdAt", ""),
                        report.get("qualityTier", ""),
                        metric.get("id", ""),
                        metric.get("label", ""),
                        metric.get("value", ""),
                        metric.get("target", ""),
                        metric.get("status", ""),
                        metric.get("confidence", ""),
                        metric.get("side", ""),
                    ]
                )
                rows += 1
    print(f"reports_long.csv   {rows} 行")


def main() -> int:
    parser = argparse.ArgumentParser(description="YS 专属训练师导出数据 → CSV")
    parser.add_argument("input", type=Path, help="导出的 ys-trainer-YYYY-MM-DD.json")
    parser.add_argument("-o", "--out", type=Path, default=Path("csv"), help="输出目录，默认 ./csv")
    parser.add_argument(
        "--scores",
        type=Path,
        help="可选：补填成绩表 CSV（列：report_id,long_jump_cm,timepoint,experiment_group）",
    )
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"找不到文件：{args.input}")

    payload = load_payload(args.input)
    args.out.mkdir(parents=True, exist_ok=True)

    subjects = payload.get("subjects") or []
    reports = payload.get("reports") or []
    scores = load_scores(args.scores)

    write_subjects(subjects, reports, args.out)
    write_wide(reports, subjects, scores, args.out)
    write_long(reports, args.out)

    filled = sum(1 for report in reports if report.get("longJumpCm") is not None)
    print()
    print(f"输出目录：{args.out.resolve()}")
    if filled:
        print(f"已带出 App 内录入的成绩：{filled} 条")
    if args.scores:
        print(f"已合并 --scores 补填表：{len(scores)} 条")
    if not filled and not args.scores:
        print("提示：long_jump_cm / timepoint / experiment_group 三列为空。")
        print("      可在 App 里『补录本次测试』，或用 --scores 传入补填表。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
