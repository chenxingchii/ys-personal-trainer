---
type: inbox
status: inbox
para: inbox
created: 2026-09-02
tags: [技术方案, MVP, React, TypeScript, MediaPipe, Web]
---

# YS专属训练师 MVP 技术方案

## 1. 文档目的

本文档将 [[YS专属训练师-MVP产品设计文档]] 转化为可执行的工程方案，明确技术栈、系统边界、开源代码复用方式、视频处理管线、模块职责、数据契约、测试策略和开发顺序。

本文档是开发阶段的技术基线。参数或架构发生变化时，应通过 Git commit 更新文档，并在分析结果中保留应用版本和规则版本。

## 2. 已确认技术决策

| 决策项 | 结论 |
|---|---|
| 应用形态 | 移动端优先的单页 Web App |
| 仓库状态 | 私有，不准备公开开源 |
| 首版视频入口 | 拍摄视频 + 选择已有视频 |
| 拍摄实现 | 调用手机系统相机，不自建浏览器内录像器 |
| 姿态引擎 | MediaPipe Tasks Vision Pose Landmarker |
| 处理位置 | 浏览器本地处理，原始视频默认不上传 |
| 推理线程 | Web Worker |
| 支持动作 | 仅立定跳远 |
| 支持机位 | 仅侧面固定机位 |
| 诊断策略 | 规则驱动、可解释、带规则版本 |
| 手机 IMU | MVP 不使用 |
| 后端 | MVP 不建设业务后端 |

## 3. 技术路线结论

采用“自主 React 工程 + 官方 MediaPipe Web 示例选择性复用 + 自研立定跳远分析引擎”的路线。

不直接 fork 完整健身应用，也不直接 fork MediaPipe 的完整示例仓库。原因如下：

- 完整健身项目通常面向深蹲、弯举等重复动作计数，与单次立定跳远的阶段分析不同。
- GitHub 搜索到的多数同类项目没有明确许可证，不能直接复制代码。
- MediaPipe 官方示例包含大量无关任务，直接 fork 会带入音频、文本、其他视觉任务和自有页面架构。
- 产品需要 React 页面状态、报告、复测对比和研究模式，官方示例使用原生 TypeScript，需要做适配。
- 立定跳远关键帧、角度契约、规则和报告是论文的核心系统贡献，应由项目自行实现和验证。

## 4. 开源基础与许可证

### 4.1 主要参考项目

| 项目 | 用途 | 许可证 | 采用方式 |
|---|---|---|---|
| [google-ai-edge/mediapipe-samples-web](https://github.com/google-ai-edge/mediapipe-samples-web) | Web Worker、WASM、GPU 降级、Pose Landmarker、Canvas、Playwright | Apache-2.0 | 选择性移植和改写 |
| [google-ai-edge/mediapipe-samples](https://github.com/google-ai-edge/mediapipe-samples) | 官方跨平台示例索引 | Apache-2.0 | 仅作参考 |
| [google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) | MediaPipe 核心实现与问题追踪 | Apache-2.0 | 依赖和问题排查 |
| [tensorflow/tfjs-models](https://github.com/tensorflow/tfjs-models) | 备用浏览器姿态引擎 | Apache-2.0 | 仅保留为备选，不进入 MVP |

本次技术调研对 `mediapipe-samples-web` 使用的参考快照：

```text
commit: bbb8974ffd450650ad5a1e7c1656c9debb8e38bf
checked: 2026-09-02
```

### 4.2 可复用内容

- Pose Landmarker 初始化与选项设置。
- Web Worker 消息收发模式。
- `ImageBitmap` 跨线程传递方式。
- MediaPipe WASM 静态资源复制与 Vite 配置。
- GPU 初始化失败后回退 CPU 的处理。
- `DrawingUtils` 和 `POSE_CONNECTIONS` 骨架绘制。
- 模型加载、摄像头权限和 CPU/GPU 切换的测试思路。

### 4.3 不直接复用的内容

- 官方示例的整套页面、路由和模板系统。
- 与 Pose Landmarker 无关的音频、文本和其他视觉任务。
- 官方示例的实时摄像头循环直接实现。
- 来源不明或无许可证健身项目的业务代码。
- GPL 项目的代码。

### 4.4 私有项目的许可证处理

项目不公开开源，因此不需要为了发布源代码选择公共开源许可证，也不应添加一个暗示公开授权的项目级 `LICENSE`。

但私有不等于可以忽略第三方许可证。若复制或修改 Apache-2.0 示例代码，应执行：

- 保留被移植文件中的原始版权和 Apache-2.0 许可证头。
- 在修改过的文件中明确标注已经修改。
- 创建 `THIRD_PARTY_NOTICES.md`，列出来源仓库、参考 commit、许可证和被复用范围。
- 保留一份第三方 Apache-2.0 许可证文本。
- 不使用 Google 或 MediaPipe 商标暗示官方背书。

上述许可证文件在实际移植第三方代码的同一个 commit 中加入，而不是提前创建空壳文件。

## 5. 总体架构

```text
┌──────────────────────────────────────────────────────┐
│ React 用户界面                                      │
│ 拍摄/选择 → 质量检查 → 分析进度 → 报告 → 复测对比   │
└───────────────────────┬──────────────────────────────┘
                        │ File / Object URL / Message
┌───────────────────────▼──────────────────────────────┐
│ 视频管线                                             │
│ 元数据 → 解码帧 → 时间戳 → ImageBitmap → 背压控制   │
└───────────────────────┬──────────────────────────────┘
                        │ transferable ImageBitmap
┌───────────────────────▼──────────────────────────────┐
│ Pose Web Worker                                      │
│ WASM + Pose Landmarker → 33 点关键点 + 可见度        │
└───────────────────────┬──────────────────────────────┘
                        │ PoseFrame[]
┌───────────────────────▼──────────────────────────────┐
│ 立定跳远分析引擎                                     │
│ 方向归一化 → 平滑 → 阶段 → 角度 → 规则 → 优先级     │
└───────────────────────┬──────────────────────────────┘
                        │ AnalysisSession
┌───────────────────────▼──────────────────────────────┐
│ 报告与研究层                                         │
│ 用户报告 → 两次对比 → IndexedDB → 匿名 JSON 导出    │
└──────────────────────────────────────────────────────┘
```

## 6. 推荐技术栈

### 6.1 应用与构建

| 技术 | 用途 | 选择理由 |
|---|---|---|
| React | 页面与状态组合 | 适合多阶段流程、报告和复测对比 |
| TypeScript | 全项目语言 | 为关键点、规则、阶段和导出数据建立类型契约 |
| Vite | 开发与构建 | 轻量，支持 Worker、WASM 和静态部署 |
| pnpm | 包管理 | 与官方示例一致，生成锁文件确保复现 |

初始化时选用当日稳定版本，并提交 `pnpm-lock.yaml`。依赖升级必须单独提交，不使用无锁版本的 CDN 脚本。

### 6.2 核心依赖

| 包 | 用途 | MVP 是否必需 |
|---|---|---|
| `@mediapipe/tasks-vision` | Pose Landmarker、WASM、DrawingUtils | 是 |
| `zod` | 校验规则配置、缓存和导出数据 | 是 |
| `idb` | IndexedDB 的 Promise 封装 | 是 |
| `lucide-react` | 界面图标 | 是 |
| `echarts` | 内部分析台时序曲线 | M1 引入并懒加载 |

首版不引入 Redux、Zustand、React Router、UI 组件库或 CSS-in-JS。应用状态先使用 `useReducer + Context`，页面流程采用显式状态机枚举。复杂度实际增长后再评估额外依赖。

### 6.3 样式方案

- 使用 CSS 自定义属性建立颜色、间距、字号和状态色令牌。
- 使用 CSS Modules 隔离组件样式。
- 不引入大型 UI 组件库。
- 普通用户界面保持安静、清晰，以视频证据和诊断数值为视觉中心。
- 内部分析台可以更密集，优先显示时间轴、指标和调试状态。
- 所有图标按钮使用 `lucide-react` 并提供可访问名称和工具提示。

### 6.4 测试工具

| 工具 | 用途 |
|---|---|
| Vitest | 几何、角度、平滑、阶段、规则和评分单元测试 |
| React Testing Library | 页面状态和交互测试 |
| Playwright | Chromium、移动视口和视频输入端到端测试 |
| TypeScript `tsc` | 静态类型检查 |
| ESLint + Prettier | 代码质量和格式 |

## 7. 浏览器与设备范围

### 7.1 MVP 支持目标

- Android：近期版本 Chrome。
- iPhone：iOS 16 及以上 Safari。
- 桌面调试：Chrome 或 Edge。

Firefox 可作为兼容观察对象，但不作为首轮移动端验收主浏览器。

### 7.2 必要平台能力

- `<input type="file" accept="video/*">`
- `capture="environment"`
- `HTMLVideoElement`
- `URL.createObjectURL`
- `requestVideoFrameCallback`，并提供兼容回退。
- `createImageBitmap`
- Web Worker
- WebAssembly
- Canvas 2D
- IndexedDB

应用启动时执行能力探测。关键能力缺失时直接说明不支持的功能，不进入分析流程。

## 8. 视频输入方案

### 8.1 两个用户入口

界面提供两个独立按钮，但共用同一套后续处理逻辑：

```html
<!-- 拍摄视频：移动端调用系统相机 -->
<input type="file" accept="video/*" capture="environment">

<!-- 选择已有视频：打开系统文件或相册选择器 -->
<input type="file" accept="video/*">
```

实际界面隐藏原生输入框，使用带摄像机和文件图标的按钮触发。不得用圆角文字胶囊代替清晰的操作按钮。

### 8.2 为什么首版不使用 MediaRecorder

- iOS Safari 的格式、摄像头切换和录制行为更难统一。
- 浏览器内录像需要额外处理权限、预览、停止、异常恢复和方向信息。
- 系统相机已经提供成熟的拍摄、重拍和相册交互。
- 两个文件入口最终都返回 `File`，后续分析管线完全一致。

如果真实用户测试证明离开页面调用系统相机会造成明显困扰，再在后续版本评估 `getUserMedia + MediaRecorder`。

### 8.3 文件处理

- 使用 `URL.createObjectURL(file)` 加载视频，不将整个视频转为 Base64。
- 视频离开页面或被替换时调用 `URL.revokeObjectURL`。
- 先读取时长、宽高、方向和可播放状态，再启动模型推理。
- 用户可预览并确认视频，避免选错文件后直接耗时分析。
- 对浏览器不能解码的格式给出“请使用系统相机重新拍摄或转换格式”的明确提示。
- MVP 不引入 `ffmpeg.wasm`，避免首屏包体、内存和移动端兼容成本。

## 9. 视频分析管线

### 9.1 分析步骤

```text
File
  → Object URL
  → HTMLVideoElement 解码
  → 视频元数据与方向校验
  → 逐个可用视频帧生成 ImageBitmap
  → Web Worker Pose Landmarker
  → PoseFrame[]
  → 质量检查
  → 动作阶段与指标
  → 规则诊断
  → AnalysisSession
```

### 9.2 时间戳规则

上传视频调用 `detectForVideo` 时，时间戳必须来自视频帧的媒体时间：

```text
timestampMs = mediaTimeSeconds × 1000
```

不能照搬实时摄像头示例中的 `performance.now()`。所有时间戳必须严格单调递增，并在结果中保留实际被处理帧的媒体时间。

### 9.3 帧调度与背压

- 优先使用 `requestVideoFrameCallback` 获取已解码帧和媒体时间。
- 同一时刻只允许一个 Pose 推理请求在执行。
- 主线程向 Worker 发送 `ImageBitmap` 后等待结果确认，再处理后续帧。
- 如果模型速度低于源视频帧率，允许按实际解码能力降采样，但必须记录实际采样时间戳。
- 处理进度按视频媒体时间计算，不按已发送消息数量估算。
- MVP 不承诺逐一处理 60 fps 视频的全部帧。

首轮以 Pose Landmarker Full 模型测试。若移动设备处理过慢，可增加 Lite 模型降级；Heavy 模型只用于研究对照，不作为普通用户默认模型。

### 9.4 Worker 生命周期

- 进入分析功能时初始化 Worker 和模型。
- 模型加载过程显示真实进度或明确阶段。
- 默认尝试 GPU delegate。
- GPU 初始化失败时自动回退 CPU，并记录回退原因。
- 取消分析、选择新视频或页面卸载时，关闭 Pose Landmarker、终止 Worker 并释放 `ImageBitmap`。
- Worker 错误通过结构化消息返回，不把异常对象直接展示给用户。

## 10. 姿态帧数据契约

```ts
type PoseFrame = {
  frameIndex: number;
  mediaTimeMs: number;
  inferenceTimeMs: number;
  imageWidth: number;
  imageHeight: number;
  landmarks: NormalizedLandmark[];
  worldLandmarks?: Landmark[];
  modelVariant: 'lite' | 'full' | 'heavy';
  delegate: 'GPU' | 'CPU';
};
```

原始关键点帧仅存在于当前分析会话内。默认保存派生指标、关键帧索引和少量报告缩略图，不长期保存每一帧的原始视频图像。

## 11. 立定跳远分析引擎

分析引擎使用纯 TypeScript 实现，不依赖 React 或浏览器 DOM，以便单元测试和未来迁移。

### 11.1 处理顺序

1. 关键点质量检查。
2. 跳跃方向检测与左右镜像归一化。
3. 主侧肢体选择。
4. 短时缺失插值。
5. 时序平滑。
6. 地面基线和稳定站立区间估计。
7. 预蹲、离地、落地接触、落地最低点识别。
8. 膝角、摆臂角、幅度和派生指标计算。
9. 规则判断和置信度计算。
10. 动作完成度与优先问题生成。

### 11.2 纯函数边界

```text
normalizeJumpDirection(frames)
selectPrimarySide(frames)
calculateJointAngle(a, vertex, c)
calculateArmAngle(shoulder, elbow, jumpDirection)
smoothSeries(series, options)
detectGroundBaseline(frames)
detectJumpPhases(frames, baseline)
evaluateMetric(value, rule)
rankDiagnoses(measurements, ruleSet)
```

这些函数不读取全局变量，输入和输出均可序列化。

### 11.3 规则配置

规则放在独立版本化配置中，不散落于组件：

```ts
type MetricRule = {
  id: string;
  label: string;
  target: number;
  tolerance: number;
  unit: 'deg';
  weight: number;
  phase: string;
  lowMessage: string;
  highMessage: string;
  nextAttemptCue: string;
};
```

规则集包含 `ruleVersion`。修改目标值、容差、权重或提示文案时必须升级规则版本，并创建独立 Git commit。

## 12. 应用状态设计

首版不引入通用路由和大型状态库，使用显式状态机约束流程：

```ts
type AppStage =
  | 'idle'
  | 'selecting'
  | 'previewing'
  | 'validating'
  | 'loading-model'
  | 'analyzing'
  | 'report-ready'
  | 'comparing'
  | 'failed';
```

每次状态迁移由 action 触发，异步流程支持取消令牌。选择新视频时必须清理上一次分析资源，避免旧结果进入新报告。

## 13. 本地存储与隐私

### 13.1 IndexedDB 保存内容

- 分析会话 ID 和时间。
- 应用版本、规则版本、模型版本和 delegate。
- 视频元数据，不含本地绝对路径。
- 质量检查、关键帧索引、测量值和诊断结果。
- 用户主动保存的报告关键帧缩略图。

### 13.2 默认不保存内容

- 原始视频文件。
- 姓名、学号、手机号等身份信息。
- 未经选择的相册或文件内容。
- 浏览器外部路径。

### 13.3 研究导出

- 使用 Zod 验证导出结构。
- 文件名包含匿名会话 ID、应用版本和规则版本。
- 用户主动点击后才生成并下载 JSON。
- MVP 不自动上传研究数据。

## 14. 目录结构

```text
YS专属训练师/
├── public/
│   ├── models/             MediaPipe 模型文件
│   └── wasm/               MediaPipe WASM 资源
├── src/
│   ├── app/                App 状态机、Context、全局入口
│   ├── capture/            拍摄、选择、预览、视频元数据
│   ├── video/              帧调度、Object URL、解码能力检查
│   ├── pose/               Worker、MediaPipe 适配、骨架绘制
│   ├── biomechanics/       角度、方向、平滑和派生指标
│   ├── phases/             关键帧和动作阶段识别
│   ├── rules/              规则配置、评分和优先级
│   ├── reports/            报告和复测对比
│   ├── research/           分析台、人工修正、JSON 导出
│   ├── storage/            IndexedDB
│   ├── components/         通用界面组件
│   ├── styles/             设计令牌和全局样式
│   └── test/               测试工具和固定数据
├── tests/
│   ├── fixtures/           获得授权的短测试视频或关键点 JSON
│   └── e2e/                Playwright 测试
├── THIRD_PARTY_NOTICES.md  实际复用第三方代码时创建
├── package.json
├── pnpm-lock.yaml
└── vite.config.ts
```

研究测试视频不得随意提交到 Git。优先提交匿名关键点 JSON；确需保存视频时必须取得许可，并根据体积决定是否使用 Git LFS。

## 15. 模型与静态资源

- 模型和 WASM 使用项目静态资源自托管，不在运行时依赖远程 CDN。
- 模型文件名或元数据中记录准确版本。
- 模型更新单独提交，并保留更新前后的测试结果。
- Vite 开发、预览和生产部署需要正确提供 WASM MIME 类型。
- 按官方示例验证 Worker、WebAssembly、GPU 和 CPU fallback。
- 如采用跨源隔离响应头，应确保模型、WASM、字体和图片全部满足对应资源策略。

## 16. 错误与降级策略

| 错误 | 用户处理 | 技术处理 |
|---|---|---|
| 浏览器无法播放视频 | 重新拍摄或更换文件 | 停止分析并释放 Object URL |
| 视频缺少完整动作 | 按拍摄指引重拍 | 质量检查失败，不调用规则引擎 |
| GPU 初始化失败 | 无需用户操作 | 自动切换 CPU并记录原因 |
| Full 模型过慢 | 提示继续或切换快速模式 | 可降级 Lite 模型 |
| 关键点长时间丢失 | 调整机位和光线后重拍 | 指标标记为无法判断 |
| 分析被取消 | 返回视频预览 | 终止任务并释放位图和 Worker |
| IndexedDB 不可用 | 仍可完成本次分析 | 禁用历史报告和对比 |

错误信息使用用户能执行的动作描述，不直接显示堆栈、异常类名或 MediaPipe 内部错误。

## 17. 测试策略

### 17.1 单元测试

必须优先覆盖：

- 三点夹角在 90°、105°、168°、180° 时的结果。
- 肩—肘线前摆为正、后摆为负。
- 向左跳和向右跳归一化后得到相同指标。
- 镜像输入不会改变动作区间判断。
- 低可见度数据不参与主侧选择和评分。
- 无法判断指标不会按零分计入总分。
- 规则边界值和容差外状态。
- 规则版本进入分析和导出结果。

### 17.2 固定样本测试

- 人工标注少量关键点 JSON 作为确定性测试数据。
- 为每个关键阶段准备至少一个正常样本和一个明显偏离样本。
- 保存预期关键帧、角度区间和优先问题。
- 算法调整后运行回归测试，防止修复一个阶段破坏其他阶段。

### 17.3 浏览器测试

- 页面可以选择本地视频并显示预览。
- “拍摄视频”和“选择已有视频”使用不同输入配置。
- 模型资源加载成功。
- GPU 不可用时能进入 CPU fallback。
- 取消和重新选择视频后没有旧报告残留。
- 移动视口下按钮、视频和报告不重叠。
- 键盘操作、焦点状态和可访问名称可用。

真实 MediaPipe 推理只保留少量集成测试；多数端到端测试使用固定 PoseFrame 数据，避免 GPU 和模型加载造成测试波动。

## 18. 性能与可观测性

首轮不预设未经实测的准确率和处理秒数，但必须采集：

- 模型加载时间。
- 每帧推理时间。
- 视频时长和实际处理帧数。
- 实际采样间隔。
- 总分析耗时。
- GPU 或 CPU delegate。
- 模型类型。
- 丢帧、低可见度帧和插值数量。
- 关键阶段置信度。
- 失败阶段和错误代码。

这些信息进入内部分析台和匿名导出，不默认展示给普通用户。

## 19. 开发与提交策略

遵守仓库 [[agent]] 规则，每次完成一组可验证改动后创建对应 commit。推荐开发提交顺序：

1. `chore: 初始化React和TypeScript工程`
2. `feat: 添加拍摄和视频选择入口`
3. `feat: 接入视频预览和元数据检查`
4. `feat: 接入MediaPipe姿态识别Worker`
5. `feat: 添加骨架叠加和分析进度`
6. `feat: 添加角度计算和方向归一化`
7. `feat: 添加关键帧识别和人工修正`
8. `feat: 添加规则诊断和报告`
9. `feat: 添加复测对比和研究导出`
10. `test: 补充移动端和固定样本测试`

每次提交前至少运行与改动相关的类型检查、单元测试或端到端测试。不要在功能提交中混入无关格式化或依赖升级。

## 20. 开发阶段划分

### 阶段 A：工程基线

- 初始化 React、TypeScript、Vite 和 pnpm。
- 配置 ESLint、Prettier、Vitest 和 Playwright。
- 建立移动端优先的页面骨架和设计令牌。
- 配置持续可执行的 `typecheck`、`test` 和 `build` 命令。

### 阶段 B：双视频入口

- 实现“拍摄视频”和“选择已有视频”。
- 完成 Object URL 生命周期、预览和重新选择。
- 完成视频元数据与浏览器解码能力检查。

### 阶段 C：姿态推理基础

- 自托管 WASM 和 Full/Lite 模型。
- 移植并改写官方 Worker 和 GPU fallback。
- 完成 PoseFrame 数据收集和 Canvas 骨架叠加。
- 同步加入 Apache-2.0 归属说明。

### 阶段 D：内部动作分析台

- 完成角度曲线、平滑和可见度显示。
- 完成关键帧自动识别和人工修正。
- 完成原始分析 JSON 导出。

### 阶段 E：用户诊断闭环

- 接入规则、完成度和优先问题。
- 完成报告、关键帧证据和复测对比。
- 完成移动端测试、隐私提示和失败处理。

## 21. 首轮验证门槛

进入动作规则开发前，工程基础必须满足：

- 两个视频入口都能获得可播放的 `File`。
- 同一个视频经过两个入口后进入相同的分析管线。
- Object URL、Worker 和 ImageBitmap 均能正确释放。
- Android Chrome 与 iOS Safari 至少各完成一次真机视频预览。
- Pose Landmarker Full 能在一台目标手机运行。
- GPU 失败时 CPU fallback 可用。
- 向左跳和向右跳的骨架方向可以正确归一化。

## 22. 暂缓决策

以下问题等待真实视频和性能测试后再决定：

- Full 模型是否能作为所有目标手机的默认模型。
- 最低支持分辨率、帧率、时长和文件大小。
- `requestVideoFrameCallback` 的具体兼容回退策略。
- 关键点平滑使用中值窗口还是 One Euro Filter。
- 是否需要两阶段推理或关键区间二次精细分析。
- 内部分析台使用 ECharts 的具体交互方式。
- 是否需要部署研究数据接收后端。
- 是否需要浏览器内 `MediaRecorder` 录像。

这些项目不阻塞工程初始化和双视频入口开发。
