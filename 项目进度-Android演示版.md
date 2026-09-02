---
type: project-status
status: active
para: inbox
created: 2026-09-02
updated: 2026-09-02
deploy: https://ys-personal-trainer.vercel.app
deploy_pages: https://chenxingchii.github.io/ys-personal-trainer
remote: https://github.com/chenxingchii/ys-personal-trainer
tags: [YS专属训练师, 项目进度, Android, PWA, MVP]
---

# YS专属训练师项目进度

> 这是下次继续开发时的入口文档。先阅读本文件，再阅读 [[YS专属训练师-MVP产品设计文档]] 和 [[YS专属训练师-MVP技术方案]]。

## 当前结论

项目已完成可演示的移动端 Web MVP，当前进入 **Android 演示版验证阶段**。完整项目已推送到 GitHub 仓库。主部署为 Vercel 固定 HTTPS 地址 <https://ys-personal-trainer.vercel.app>；因 `*.vercel.app` 在中国大陆裸连不稳定，另接入 GitHub Pages 备用地址（见「GitHub Pages 备用地址」）。可直接在 Android Chrome 打开并添加到主屏幕。核心流程可以在 Android Chrome 中运行；PWA 基础已加入。当前暂不处理 iOS、微信小程序和在线大模型诊断。

### 📌 现在进行到哪一步

- ✅ GitHub：完整项目已推送，`origin/main` 使用 SSH 专属密钥，本地与远程同步（HEAD `be37a6f`）。
- ✅ Vercel：生产部署 READY，主地址 https://ys-personal-trainer.vercel.app。
- ✅ base 自适应：代码已支持根路径（Vercel）与 `/ys-personal-trainer/` 子路径（Pages）两种构建，本地两套构建均验证通过；Pages 工作流已推送。
- ⏭️ **网页端待办（需人工）**：见「GitHub Pages 备用地址」——① 仓库改为公开；② `Settings → Pages → Source` 选 GitHub Actions；③ 若启用前工作流已失败，手动 Re-run。完成前 Pages 备用地址不可访问。
- ⏭️ 之后回到核心任务：**Android 真机验收**（见「Android 手机演示验收步骤」）。
- ⚠️ 待办（可选）：Vercel 网页端 `Settings → Git` 连接 GitHub，实现「push 即自动部署」。
- ⚠️ 网络提示：主地址 `*.vercel.app` 中国大陆直连可能不稳定；备用地址 `*.github.io` 裸连可访问。

> 若你是新接手此项目的 Agent：先读本文件，再用 `git log --oneline` 与 `git status` 确认最新提交与工作区状态，然后先确认「网页端待办」的 Pages 状态，再进入 Android 真机验收。

## 远程仓库与部署状态

- GitHub 私有仓库：<https://github.com/chenxingchii/ys-personal-trainer>
- 本地远程名：`origin`
- 本地远程地址：`git@github.com:chenxingchii/ys-personal-trainer.git`（SSH）
- GitHub 账号：`chenxingchii`
- 作者：陈星池（2807335477@qq.com），已配置为 git 用户
- 当前分支：`main`
- 远程状态：✅ 已推送完整项目，本地与 `origin/main` 一致（`git status` 干净）
- Vercel 固定 HTTPS 地址：<https://ys-personal-trainer.vercel.app>
- Vercel 生产部署：已就绪（READY），账号 `chenxingchii` / 项目 `ys-personal-trainer`；已按 `main` 最新提交重新部署
- 安全边界：为启用 GitHub Pages，仓库将改为公开（代码 / 文档 / git 历史公开可见，属已确认决策）；训练视频、个人身份信息和 API 密钥仍不得提交。`.env*`、`.vercel` 已加入 `.gitignore`，密钥仅存在于本地。

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

### Vercel 部署配置（CLI 方式）

已通过 Vercel CLI 完成部署，配置与网页导入等价：

```text
安装命令：pnpm install --frozen-lockfile
构建命令：pnpm build
输出目录：dist
生产分支：main
框架预设：Vite（CLI 自动检测）
```

常用命令：

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

中国大陆裸连可访问的备用地址：**https://chenxingchii.github.io/ys-personal-trainer/**（`github.io` 域名无需代理）。

- 用途：Vercel 域名不稳定时使用；功能与主地址一致，PWA / 模型 / WASM 均已按子路径适配。
- 实现：`.github/workflows/deploy-pages.yml`，`push` 到 `main` 自动构建（`VITE_BASE=/ys-personal-trainer/`）并发布到 Pages。
- 前提（需在 GitHub 网页操作，无法用 CLI 完成）：
  1. 仓库**改为公开**：`Settings → General → Danger Zone → Change visibility`。代码 / 文档 / git 历史将公开可见（已确认）；不得含密钥与个人敏感信息。
  2. 开启 Pages 并选 Actions 源：`Settings → Pages → Source: GitHub Actions`。
  3. 若在启用前工作流已运行且 deploy 失败，到 `Actions → Deploy GitHub Pages → Run workflow` 手动重跑一次。
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

> ⚠️ **注意：Vercel 尚未连接 GitHub 自动部署。** `vercel link` 时连接 GitHub 仓库失败，所以 `git push` **不会**自动触发重新部署。要让最新代码上线，需在项目目录手动执行：
>
> ```bash
> vercel deploy --prod --yes
> ```
>
> 若希望「push 即自动部署」，先在 Vercel 网页 `Settings → Git` 连接本仓库并授权；连接成功后此提示可删除。

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
- 中国大陆网络直连 `*.vercel.app` 可能不稳定；演示 / 访问建议用裸连可达的 GitHub Pages 备用地址。

## 当前 Git 节点

| Commit    | 内容                                                   |
| --------- | ------------------------------------------------------ |
| `c053a3e` | 主界面功能导航、历史报告页和两个 MVP 占位页            |
| `90463aa` | 保留诊断报告、增加复测拍摄入口、改善相机选择器调用     |
| `914764b` | 补齐 Android PWA 图标                                  |
| `ea63d3e` | 添加 PWA manifest、Service Worker 和局域网调试命令     |
| `8eb8b6e` | 忽略 Vercel 本地配置与环境变量文件                     |
| `18f5372` | 记录 GitHub SSH 推送与 Vercel 固定 HTTPS 部署完成状态  |
| `be37a6f` | 资源路径改为 base 自适应，新增 GitHub Pages 部署工作流 |
| `9634bc6` | 进度文档：记录 GitHub Pages 备用地址与网页端启用待办   |
| `7bc1211` | 进度文档：同步 HEAD 记录                               |

- 最新本地 / 远程提交：`7bc1211`（已推送到 `origin/main`，`git status` 干净）。
- Vercel 生产部署：首次来自 `8eb8b6e`（CLI 首部署）；后已执行 `vercel deploy --prod --yes`，以 `main` 最新提交（含 base 自适应）重新部署，固定地址现指向该新部署。Pages 工作流随 push 到 `main` 自动构建。

工作区要求：每次代码或文档改动完成后必须创建对应 Git commit；不要把多个无关功能混在一个 commit 中。

## 下一步执行顺序

### 1. 固定 Android 演示地址 ✅ 已完成（含备用地址）

- Vercel 主地址：**https://ys-personal-trainer.vercel.app**（详情见「Vercel 部署配置」）
- GitHub Pages 备用地址：**https://chenxingchii.github.io/ys-personal-trainer/**（需先完成「GitHub Pages 备用地址」网页端三步，部署成功后方可访问）

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
