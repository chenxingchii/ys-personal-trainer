# 第三方软件与模型归属说明

本项目为私有项目，但仍保留所使用第三方软件和模型的来源及许可证信息。

## MediaPipe Tasks Vision

- 项目：MediaPipe
- 组件：`@mediapipe/tasks-vision` 及其 WebAssembly 运行时
- 当前版本：1.0.1
- 来源：https://github.com/google-ai-edge/mediapipe
- 许可证：Apache License 2.0
- 许可证全文：`third_party_licenses/Apache-2.0.txt`

项目在 `public/wasm/` 中自托管该版本 npm 包内的传统 SIMD、非 SIMD 和模块化 Worker 运行时文件，并在应用代码中调用其 Pose Landmarker API。

## MediaPipe Pose Landmarker 模型

- Full 模型：`pose_landmarker_full/float16/1`
- Lite 模型：`pose_landmarker_lite/float16/1`
- 来源：https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
- 模型文件与 SHA-256：`public/models/manifest.json`
- 许可证：Apache License 2.0
- 许可证全文：`third_party_licenses/Apache-2.0.txt`

MediaPipe、Google 及相关商标归其各自权利人所有。本项目与 Google 不存在赞助、认证或官方合作关系。

## MediaPipe 姿态测试图片

- 文件：`tests/fixtures/pose.jpg`
- 用途：浏览器端真实姿态识别集成测试
- 来源：https://storage.googleapis.com/mediapipe-assets/pose.jpg
- 许可证：Apache License 2.0
