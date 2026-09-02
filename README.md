# YS专属训练师

面向大学生立定跳远训练的手机 Web App。用户可以现场拍摄或选择已有的侧面固定机位视频，在浏览器本地完成姿态分析并获得动作改进建议。

## 当前阶段

可演示移动端 Web MVP 已完成，当前进入 Android 演示版验证阶段。完整进度、已知限制、真机验收和后续维护方式见：

- [项目进度-Android演示版](./项目进度-Android演示版.md)

- [MVP 产品设计文档](./YS专属训练师-MVP产品设计文档.md)
- [MVP 技术方案](./YS专属训练师-MVP技术方案.md)

## 本地开发

```bash
pnpm install
pnpm dev
```

### Android 手机调试

电脑和 Android 手机连接同一个 Wi-Fi 后，在电脑上运行：

```bash
pnpm dev:lan
```

然后在手机浏览器打开 `http://电脑局域网IP:5173/`。局域网地址主要用于页面和视频流程调试；要测试“安装到主屏幕”和离线缓存，请使用 HTTPS 部署地址。Chrome 中打开页面后选择“添加到主屏幕”即可安装为独立窗口应用。

当前 PWA 会缓存页面外壳、MediaPipe WASM 和模型等同源资源。首次打开或首次分析时仍需要等待资源下载；浏览器清理站点数据后需要重新下载。原始训练视频和历史报告仍只保存在当前设备，不会因为 PWA 安装自动上传。

### 远程仓库与固定 HTTPS

GitHub 私有仓库：<https://github.com/chenxingchii/ys-personal-trainer>

本地仓库已经配置 `origin`。首次推送使用：

```bash
git push -u origin main
```

当前远程仓库已初始化 `main` 分支，但完整项目仍待首次同步；如果终端 HTTPS 推送被重置，请使用 GitHub Desktop，或配置 SSH 后再推送。确认 GitHub 首页出现 `src/`、`public/` 和 `package.json` 后，再在 Vercel 导入仓库。

推送后在 Vercel 导入该私有仓库，构建命令使用 `pnpm build`，输出目录使用 `dist`。详细状态、认证注意事项和部署验收步骤见 [项目进度-Android演示版](./项目进度-Android演示版.md)。

### 后续优化路线

1. Android 真机验收：相机权限、视频方向、常见格式、长视频内存和后台恢复。
2. 性能与识别校准：用真实训练视频校准阶段识别、异常提示和低端设备耗时。
3. 工程封装：在 PWA 验证稳定后接入 Capacitor，生成 Android APK/AAB，并补充原生权限与生命周期处理。
4. 数据演进：抽象报告仓储接口；确认跨设备需求后再建设 HTTPS API、鉴权、对象存储和删除机制。
5. 产品完善：增加报告详情、删除/清空、版本提示、错误上报和隐私说明。

## 质量检查

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

本项目为私有项目。引入第三方代码时须保留相应许可证与归属说明。
