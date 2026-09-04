---
type: project-status
status: active
para: inbox
created: 2026-09-02
updated: 2026-09-05
deploy: https://ys-personal-trainer.vercel.app
deploy_pages: https://chenxingchii.github.io/ys-personal-trainer
remote: https://github.com/chenxingchii/ys-personal-trainer
tags: [YS专属训练师, 项目进度, Android, PWA, MVP]
---

# YS专属训练师项目进度

> 这是下次继续开发时的入口文档。先阅读本文件，再阅读 [[YS专属训练师-MVP产品设计文档]] 和 [[YS专属训练师-MVP技术方案]]。

## 当前结论

项目已完成可演示的移动端 Web MVP，当前进入 **Android 演示版验证阶段**。完整项目已推送到 GitHub 仓库。主部署为 Vercel 固定 HTTPS 地址 <https://ys-personal-trainer.vercel.app>；因 `*.vercel.app` 在中国大陆裸连不稳定，另已上线 GitHub Pages 备用地址（见「GitHub Pages 备用地址」）。可直接在 Android Chrome 打开并添加到主屏幕。核心流程可以在 Android Chrome 中运行；PWA 基础已加入。当前暂不处理 iOS、微信小程序和在线大模型诊断。

### 📌 现在进行到哪一步

- ✅ GitHub：完整项目已推送，`origin/main` 使用 SSH 专属密钥，本地与远程同步。
- ✅ Vercel：已连接 GitHub 仓库，推送 `main` 会自动部署；主地址 https://ys-personal-trainer.vercel.app。
- ✅ GitHub Pages：仓库已改为公开，`deploy-pages.yml` 构建+发布全绿，备用地址 https://chenxingchii.github.io/ys-personal-trainer/ 已上线（2026-09-03 用户确认可访问）。
- ✅ base 自适应：同一份源码支持根路径（Vercel）与 `/ys-personal-trainer/` 子路径（Pages）两种构建，本地两套构建均验证通过。
- ⏭️ **下一步：Android 真机验收**（见「Android 手机演示验收步骤」），这是当前唯一未完成的核心任务。
- ✅ **冠军标准 v1：** 已将桌面冠军视频预处理为 `public/models/champion-v1.json`，Vercel 通过 `/api/diagnose` 使用该标准，用户上传视频后自动比较；无 API 的本地 / Pages 环境自动使用同一比较逻辑回退。
- ✅ Supabase：已执行 `training_samples` 表迁移，并在 Vercel 配置 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`ADMIN_TOKEN`。
- ✅ API 线上验证：`/api/diagnose` 可返回冠军比较结果；训练样本、标注和数据集接口的鉴权响应正常。
- ⚠️ 网络提示：主地址 `*.vercel.app` 中国大陆直连可能不稳定；**备用地址 `*.github.io` 裸连可访问，演示优先用它**。

> 若你是新接手此项目的 Agent：先读本文件，再用 `git log --oneline` 与 `git status` 确认最新提交与工作区状态；优先进行真实视频采集、教练审核和数据集质量检查，不要直接替换 `champion-v1`。

## 远程仓库与部署状态

- GitHub 仓库（已改为公开，以启用 Pages）：<https://github.com/chenxingchii/ys-personal-trainer>
- 本地远程名：`origin`
- 本地远程地址：`git@github.com:chenxingchii/ys-personal-trainer.git`（SSH）
- GitHub 账号：`chenxingchii`
- 作者：陈星池（2807335477@qq.com），已配置为 git 用户
- 当前分支：`main`
- 远程状态：✅ 已推送完整项目，本地与 `origin/main` 一致（`git status` 干净）
- Vercel 固定 HTTPS 地址：<https://ys-personal-trainer.vercel.app>
- Vercel 生产部署：已就绪（READY），账号 `chenxingchii` / 项目 `ys-personal-trainer`；已按 `main` 最新提交重新部署
- 安全边界：仓库已改为公开（Pages 免费版要求，代码 / 文档 / git 历史公开可见）；训练视频、个人身份信息和 API 密钥仍不得提交。`.env*`、`.vercel` 已加入 `.gitignore`，密钥仅存在于本地。

### SSH 配置方法（Windows 本机推送用）

为 GitHub 推送单独生成了一把 ed25519 密钥，避免与其他 GitHub 账号混淆：

```powershell
# 1. 生成密钥（已生成，位于 %USERPROFILE%\.ssh\id_ed25519_ys_trainer）
ssh-keygen -t ed25519 -C "2807335477@qq.com" -f "$env:USERPROFILE\.ssh\id_ed25519_ys_trainer"

# 2. 查看公钥，粘贴到 GitHub → Settings → SSH and GPG keys → New SSH key
Get-Content "$env:USERPROFILE\.ssh\id_ed25519_ys_trainer.pub"

# 3. 测试连接（首次会询问指纹，输入 yes）
ssh -T git@github.com

# 4. 让 git 使用该密钥推送（或加入 ~/.ssh/config）
GIT_SSH_COMMAND="ssh -i $env:USERPROFILE\.ssh\id_ed25519_ys_trainer -o IdentitiesOnly=yes"
```

推送用如下方式指定密钥：

```bash
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/id_ed25519_ys_trainer -o IdentitiesOnly=yes"
git remote set-url origin git@github.com:chenxingchii/ys-personal-trainer.git
git push -u origin main
```

> 注意：本机可能存在多个 GitHub 账号/密钥。`IdentitiesOnly=yes` 可确保只使用这一把密钥，避免推送到错误的账号。

### 本地推送方法

本地 `main` 分支已验证（`pnpm test` 39 项、`typecheck`、`format:check`、`build` 全部通过）后推送：

```bash
git remote set-url origin git@github.com:chenxingchii/ys-personal-trainer.git
GIT_SSH_COMMAND="ssh -i $HOME/.ssh/id_ed25519_ys_trainer -o IdentitiesOnly=yes" git push -u origin main
```

### Vercel 部署配置（Git 自动部署）

当前项目已在 Vercel 网页端连接 GitHub 仓库 `chenxingchii/ys-personal-trainer`。推送 `main` 后自动创建生产部署；项目构建配置为：

```text
安装命令：pnpm install --frozen-lockfile
构建命令：pnpm build
输出目录：dist
生产分支：main
框架预设：Vite（CLI 自动检测）
```

常用命令（CLI 仅用于故障排查，当前本机未登录 Vercel CLI）：

```bash
# 登录（设备码授权，需在浏览器确认）
vercel login

# 链接项目（已执行，生成 .vercel/project.json 与 .env.local）
vercel link --yes --project ys-personal-trainer

# 首次/后续生产部署
vercel deploy --prod --yes

# 查看部署状态
vercel ls ys-personal-trainer
```

### 固定 HTTPS 地址

- 正式地址：**https://ys-personal-trainer.vercel.app**（项目固定域名，专家 / 手机演示用这个）
- 本次生产部署：`https://ys-personal-trainer-43fpgy7gd-xingchi.vercel.app`（带随机后缀，用于追溯本次构建）
- 部署默认公开可访问（Deployment Protection 未阻断匿名访问）。

> 网络提示：中国大陆网络直连 `*.vercel.app` 可能不稳定。电脑 / 手机需能正常访问 Vercel 域名（必要时开启代理）才能打开。

### GitHub Pages 备用地址

中国大陆裸连可访问的备用地址：**https://chenxingchii.github.io/ys-personal-trainer/**（`github.io` 域名无需代理，2026-09-03 已验证上线）。

- 用途：Vercel 域名不稳定时使用；功能与主地址一致，PWA / 模型 / WASM 均已按子路径适配。
- 状态：✅ 已启用。仓库改为公开 → `Settings → Pages → Source: GitHub Actions` 生效；随 push 自动构建 + 发布，`deploy-pages` 步骤全绿。
- 实现：`.github/workflows/deploy-pages.yml`，`push` 到 `main` 自动构建（`VITE_BASE=/ys-personal-trainer/`）并发布到 Pages。
- 代码改动：`vite.config.ts` 读取 `VITE_BASE`（默认 `/`）；`index.html`、`App.tsx`、`main.tsx`、`public/sw.js`、`src/pose/pose.worker.ts`、`public/manifest.webmanifest` 均改为基于部署基址，Vercel（根路径）与 Pages（子路径）共用一份源码。本地构建用两条命令：

```bash
pnpm build                              # Vercel 根路径
MSYS2_ENV_CONV_EXCL=VITE_BASE VITE_BASE=/ys-personal-trainer/ pnpm build   # Pages 子路径（Windows Git Bash 需排除 MSYS 路径转换）
```

### 后续更新流程

提交并推送：

```bash
git add .
git commit -m "描述本次改动"
GIT_SSH_COMMAND="ssh -i $HOME/.ssh/id_ed25519_ys_trainer -o IdentitiesOnly=yes" git push origin main
```

> 生产环境变量已经配置在 Vercel，不要提交到仓库。GitHub Pages 仍只提供静态页面和本地诊断回退，训练样本保存必须使用 Vercel 地址。

### 下次工作摘要

#### 教练后台审核

访问 `https://ys-personal-trainer.vercel.app/?admin=1`，输入 `ADMIN_TOKEN`，点击“加载样本”。逐条检查样本质量、整体等级、技术问题和教练备注，然后选择“保存审核结果”或“排除样本”。

主训练集只接受：`annotation_status=reviewed`、分析质量 `>= 0.55`、教练质量标记为 `usable` 的样本。教练无法确认问题时选择“需要复核”，不要强行标注。

#### 样本保留标准

- 保留：侧面固定机位、单人全身入镜、准备到落地完整、光线稳定、无剪辑的视频。
- 优先收集：优秀动作、达标动作、轻微问题、明显问题、改进前后对照，以及不同身材和左右方向样本。
- 排除：时长不足 1 秒、分辨率低于 480×360、可识别帧少于 3、关键阶段缺失、严重遮挡/抖动/模糊、多人与剪辑拼接。
- 当前后台不保存原始视频；无法仅凭姿态特征确认的问题不能标记为 `usable`。

#### 神经网络训练路线

1. 先用 10～20 段真实视频校准规则和教练标签。
2. 在后台审核样本并点击“导出训练集”，得到 `training-dataset-v1.jsonl`。
3. 按 `athlete_id_hash` 按运动员划分训练集、验证集和测试集，避免同一运动员泄漏到不同集合。
4. 使用 Python/PyTorch 训练姿态时序模型，输出技术问题概率和整体等级。
5. 用独立测试集、混淆矩阵、F1、误报率和教练人工抽查评估。
6. 导出 ONNX，注册为 `pose-model-v0.1`，灰度验证后再上线；保留 `champion-v1` 作为可解释基准和回退方案。

#### 下一次优先任务

1. 用真实用户视频验证授权上传和 Supabase 入库。
2. 教练审核第一批样本，检查标签一致性。
3. 增加数据集清单和运动员级别划分检查。
4. 编写第一版 PyTorch 训练脚本和固定测试集。
5. 完成 Android 真机验收后，再决定 Capacitor APK/AAB 封装。

### Android 手机演示验收步骤

部署地址确认可访问后，在 Android Chrome 中逐项验收：

1. 打开 **https://ys-personal-trainer.vercel.app**，等待模型资源加载完成（首次较慢）。
2. 授权相机权限，拍摄一段视频。
3. 或选择一段已录好的“侧面固定机位、全身入镜、准备到落地完整”的视频。
4. 等待视频质量检查通过（时长、分辨率、姿态可识别）。
5. 运行视频分析，等待生成教练式诊断报告。
6. 点击“查看诊断报告”，确认报告不会消失。
7. 再次拍摄 / 选择视频执行复测，查看前后对比报告。
8. 打开本机历史报告，确认记录保留。
9. 确认“训练计划 / 动作切换”为 MVP 占位入口。
10. 确认展示的是通俗诊断结论，而非专业角度参数。
11. 选择“添加到主屏幕”，验证独立窗口与离线缓存。

### 当前限制

- 目前只支持 Android 优先；iOS、微信小程序暂未处理。
- 原始训练视频默认只保存在当前设备，不上传云端。
- 历史报告只保存在当前设备（`localStorage` / IndexedDB 范畴），不跨设备同步。
- 在线大模型诊断尚未接入；报告由本地规则引擎生成。
- “训练计划 / 动作切换”暂为 MVP 占位入口，不具备配置与训练功能。
- 暂无 APK/AAB；Capacitor 原生封装应在 PWA 真机验收稳定后进行。

## 已完成能力

- 主界面：动作诊断、历史报告、训练计划、动作切换四个入口。
- 动作诊断：拍摄视频、选择已有视频、视频预览和元数据读取。
- 侧面固定机位立定跳远的 MediaPipe Pose Landmarker 分析。
- GPU 失败后自动回退 CPU，识别在 Web Worker 中执行。
- 视频质量门禁：时长、分辨率、姿态可识别帧和动作阶段完整性。
- 教练式诊断报告：一个主要问题、教练观察、可能影响、下一次提示和推荐练习。
- 诊断报告快照：切换视频后仍可查看，新增“查看诊断报告”按钮。
- 复测：拍摄第二次视频或选择第二次视频，并进行前后建议对比。
- 历史报告：当前设备保存历史报告、视频文件名、文件大小和上传时间，可查看完整报告。
- PWA：manifest、Service Worker、应用图标、同源页面和模型资源缓存。
- Android 局域网调试命令：`pnpm dev:lan`。

## 当前明确限制

- 历史记录当前保存视频元数据和派生报告，不保存原始视频 Blob，因此历史页暂时不能重新播放旧视频。
- 原始视频默认只保存在当前设备，不上传云端。
- 还没有 APK/AAB；Capacitor 封装应在 PWA 真机验收后进行。
- 训练计划和动作切换是 MVP 占位入口，不具备配置和训练功能。
- 诊断规则仍需要真实训练视频和教练人工标注校准。
- 报告由本地规则引擎生成；在线大模型只作为未来可选的语言润色层，不参与核心动作判断。
- 冠军标准 v1 来自单段冠军视频，当前是可解释的动作指标模板，不是训练好的神经网络权重；神经网络训练需要后续积累匿名姿态特征和教练标签。
- 中国大陆网络直连 `*.vercel.app` 可能不稳定；演示 / 访问建议用裸连可达的 GitHub Pages 备用地址。

## 当前 Git 节点

| Commit    | 内容                                                   |
| --------- | ------------------------------------------------------ |
| `feb1d64` | 修复 Vercel CommonJS/ESM 兼容，诊断 API 线上返回正常   |
| `50c2bd0` | 明确诊断逻辑运行时模块路径                             |
| `84eaf36` | 将冠军标准内置到诊断函数                               |
| `6c44f6d` | 统一 Vercel API 模块运行方式                           |
| `e8b583a` | 恢复 Vercel 自动识别 API 路由                          |
| `c053a3e` | 主界面功能导航、历史报告页和两个 MVP 占位页            |
| `90463aa` | 保留诊断报告、增加复测拍摄入口、改善相机选择器调用     |
| `914764b` | 补齐 Android PWA 图标                                  |
| `ea63d3e` | 添加 PWA manifest、Service Worker 和局域网调试命令     |
| `8eb8b6e` | 忽略 Vercel 本地配置与环境变量文件                     |
| `18f5372` | 记录 GitHub SSH 推送与 Vercel 固定 HTTPS 部署完成状态  |
| `be37a6f` | 资源路径改为 base 自适应，新增 GitHub Pages 部署工作流 |
| `9634bc6` | 进度文档：记录 GitHub Pages 备用地址与网页端启用待办   |
| `7bc1211` | 进度文档：同步 HEAD 记录                               |
| `20636bc` | 进度文档：记录 Vercel 生产重新部署（main 最新提交）    |

- 最新提交以 `git log --oneline` 为准；当前 `main` 与 `origin/main` 同步，`git status` 干净。
- Vercel 生产部署：已通过 GitHub 连接自动部署，最新代码推送后自动构建；生产 API 已完成线上验收。Pages 工作流随 push 到 `main` 自动构建。

工作区要求：每次代码或文档改动完成后必须创建对应 Git commit；不要把多个无关功能混在一个 commit 中。

## 下一步执行顺序

### 0. 冠军标准与数据闭环

- 当前生效标准：`champion-v1`，来源为 `微信视频2026-09-04_214928_425.mp4`（HEVC 原片已转为 H.264 后完成 MediaPipe 预处理）。
- 后台比较接口：`/api/diagnose`。接口接收用户动作分析 JSON，不接收原始视频，返回冠军接近度、优先差异和报告所需字段。
- 已完成用户授权勾选和 `/api/training-samples` 保存接口；接口使用 Supabase REST 写入 `training_samples`，线上环境变量已配置，仍只在用户授权后保存匿名特征。
- Supabase 初始表结构位于 `supabase/migrations/001_training_samples.sql`，当前只保存匿名动作特征，不保存原始视频。
- 已增加内部审核页：部署后访问 `/?admin=1`，使用 `ADMIN_TOKEN` 加载样本、保存教练标签，并从 `/api/training-dataset` 导出已审核 JSONL；`format=manifest` 可获取数据集清单。
- 当前尚未训练神经网络；当标注样本达到训练门槛后，再训练姿态时序模型，并通过独立测试集和人工抽查后候选上线，保留 `champion-v1` 回退。

### 1. 固定 Android 演示地址 ✅ 已完成（含备用地址）

- Vercel 主地址：**https://ys-personal-trainer.vercel.app**（详情见「Vercel 部署配置」）
- GitHub Pages 备用地址：**https://chenxingchii.github.io/ys-personal-trainer/**（✅ 已上线，裸连可访问；详情见「GitHub Pages 备用地址」）

地址可访问后，用 Android Chrome 打开完成真机验收（见「Android 手机演示验收步骤」），验证独立窗口和 Service Worker 缓存。

### 2. Android 真机验收

至少记录以下结果：

- 手机型号、Android 版本和 Chrome 版本。
- 相机权限首次授权、拒绝后重试是否正常。
- 拍摄入口是否真正打开系统相机。
- MP4/H.264 视频是否可播放，视频旋转方向是否正确。
- 低端设备首次模型加载时间和整段分析耗时。
- 切后台、锁屏、返回后分析是否能恢复或给出可执行提示。
- 关闭网络后页面外壳和已缓存模型是否可用。

### 3. 真实视频校准

收集至少 10～20 个固定侧面视频，按正常动作、预蹲不足、摆臂不足、落地缓冲不足和识别失败分类。每次修改规则都应：

1. 记录修改前后的诊断差异。
2. 增加或更新确定性测试数据。
3. 运行 `pnpm typecheck`、`pnpm test`、`pnpm test:e2e` 和 `pnpm build`。
4. 使用单独 Git commit 保存校准结果。

### 4. 再决定原生 APK

PWA 真机稳定后接入 Capacitor Android，复用 React 页面、Worker 和分析引擎，只新增原生权限、生命周期和打包配置。不要在真机问题尚未收敛前同时建设云端和小程序。

## 后续如何持续优化

按模块定位修改范围：

| 目标                     | 主要位置                       |
| ------------------------ | ------------------------------ |
| 视频选择、相机和质量门禁 | `src/capture/`                 |
| 姿态模型、WASM、GPU/CPU  | `src/pose/`                    |
| 阶段识别、角度和动作规则 | `src/biomechanics/`            |
| 教练式文案和复测对比     | `src/reports/diagnosis.ts`     |
| 本机历史报告             | `src/reports/localReports.ts`  |
| 页面流程和导航           | `src/App.tsx`                  |
| 响应式视觉样式           | `src/App.css`、`src/index.css` |
| 页面与真模型回归测试     | `src/*.test.tsx`、`tests/e2e/` |

推荐维护循环：先收集真实问题，再修改一个模块，补回归测试，完成质量检查，创建 commit，最后在手机上复验。报告存储未来应抽象为 `ReportRepository`，这样可在不改诊断引擎的情况下由本机存储切换到云端 API。

## 常用命令

```bash
pnpm dev                 # 电脑本地开发
pnpm dev:lan             # 同 Wi-Fi Android 手机调试
pnpm typecheck          # TypeScript 检查
pnpm test               # 单元测试
pnpm test:e2e            # Chromium 和移动视口测试
pnpm build              # 生产构建
pnpm format:check       # 格式检查
```

## 演示前检查清单

- [ ] 使用最新 commit 并确认 `git status` 干净。
- [ ] 手机打开 HTTPS 演示地址，而不是电脑的 `127.0.0.1`。
- [ ] 预先准备一段符合“侧面固定、全身入镜、准备到落地完整”的视频。
- [ ] 首次打开等待模型资源加载完成。
- [ ] 演示动作诊断、查看报告、第二次拍摄/选择和复测对比。
- [ ] 说明历史报告仅保存在当前设备，原始视频当前不持久化。
