---
type: project-status
status: active
para: inbox
created: 2026-09-02
updated: 2026-09-02
tags: [YS专属训练师, 项目进度, Android, PWA, MVP]
---

# YS专属训练师项目进度

> 这是下次继续开发时的入口文档。先阅读本文件，再阅读 [[YS专属训练师-MVP产品设计文档]] 和 [[YS专属训练师-MVP技术方案]]。

## 当前结论

项目已完成可演示的移动端 Web MVP，当前进入 **Android 演示版验证阶段**。核心流程可以在 Android Chrome 中运行；PWA 基础已经加入，后续可部署到 HTTPS 地址并安装到手机主屏幕。当前暂不处理 iOS、微信小程序和在线大模型诊断。

## 远程仓库与部署状态

- GitHub 私有仓库：<https://github.com/chenxingchii/ys-personal-trainer>
- 本地远程名：`origin`
- 本地远程地址：`https://github.com/chenxingchii/ys-personal-trainer.git`
- 当前状态：远程地址已配置，但本机终端到 GitHub `443` 连接失败，尚未完成首次推送。
- 安全边界：仓库保持私有；训练视频、个人身份信息和 API 密钥不得提交。

### 首次推送流程

网络恢复后，在项目目录执行：

```bash
git remote -v
git ls-remote origin
git push -u origin main
```

若 GitHub 要求认证，使用 Git Credential Manager、Personal Access Token 或 GitHub Desktop 完成登录，不要把 Token 写入命令、文档或代码。推送前先确认：

```bash
git status --short
git diff --check
```

### Vercel 固定 HTTPS 部署流程

首次推送成功后，在 Vercel 中导入该私有 GitHub 仓库，使用以下配置：

```text
安装命令：pnpm install --frozen-lockfile
构建命令：pnpm build
输出目录：dist
生产分支：main
```

Vercel 会生成固定的 `https://*.vercel.app` 生产地址；之后每次推送 `main` 都会自动重新部署。部署完成后，在 Android Chrome 打开生产地址并选择“添加到主屏幕”。首次 PWA 验收必须使用 HTTPS，不要用 `127.0.0.1` 或普通局域网 HTTP 地址替代。

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
- PWA 尚未部署到固定 HTTPS 域名，`127.0.0.1` 和局域网地址只适合开发调试。
- 还没有 APK/AAB；Capacitor 封装应在 PWA 真机验收后进行。
- 训练计划和动作切换是 MVP 占位页，不具备配置和训练功能。
- 诊断规则仍需要真实训练视频和教练人工标注校准。
- 报告由本地规则引擎生成；在线大模型只作为未来可选的语言润色层，不参与核心动作判断。

## 当前 Git 节点

| Commit    | 内容                                               |
| --------- | -------------------------------------------------- |
| `c053a3e` | 主界面功能导航、历史报告页和两个 MVP 占位页        |
| `90463aa` | 保留诊断报告、增加复测拍摄入口、改善相机选择器调用 |
| `914764b` | 补齐 Android PWA 图标                              |
| `ea63d3e` | 添加 PWA manifest、Service Worker 和局域网调试命令 |

工作区要求：每次代码或文档改动完成后必须创建对应 Git commit；不要把多个无关功能混在一个 commit 中。

## 下一步执行顺序

### 1. 固定 Android 演示地址

将项目部署到 Vercel、Cloudflare Pages 或 Netlify：

```text
安装命令：pnpm install --frozen-lockfile
构建命令：pnpm build
输出目录：dist
```

部署后用 Android Chrome 打开 HTTPS 地址，选择“添加到主屏幕”，验证独立窗口和 Service Worker 缓存。

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
