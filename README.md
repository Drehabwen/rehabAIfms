# rehabAIfms

我在 GitHub 上公开的第一个康复 AI 原型。项目始于 2025 年 9 月，尝试用手机摄像头、姿态估计和关节角度计算，为深蹲训练提供实时动作反馈。

> 这是一个保留历史意义的早期实验项目，不是医疗诊断或已经验证的临床产品。当前康复产品开发已转向 [RehabScreenLab](https://github.com/Drehabwen/RehabScreenLab) 和 [QingYueRehabWorkbench](https://github.com/Drehabwen/QingYueRehabWorkbench)。

## 它为什么重要

这个项目第一次形成了后来 DeepRehab 主线中的几个核心问题：

- 普通移动设备能否完成可用的动作采集？
- 姿态关键点怎样转化为可解释的关节角度？
- 实时反馈怎样帮助用户完成康复训练？
- 一个动作评分怎样进入更完整的评估和随访流程？

后来这些问题逐步演化为动作指标实验、现场筛查和康复工作台：

```text
rehabAIfms（实时深蹲反馈原型）
  → rehab-motion-lab（指标与可复现计算）
  → RehabScreenLab（现场多协议筛查）
  → QingYueRehabWorkbench（临床审核、报告与随访）
```

## 原型能力

- Expo / React Native 移动应用
- 摄像头与 WebView 姿态采集实验
- TensorFlow.js 姿态检测依赖
- 三点关节角度计算
- 深蹲动作分析和文字反馈
- 角度计算单元测试
- Android APK 构建工作流探索

## Squat v2 重写

`codex/v2-squat-rewrite` 分支正在把最初的相邻帧阈值判断重写为可测试的动作引擎：

- 版本化姿态帧合同，包含时间戳、帧序号与关键点可见度
- 自动选择可见度更可靠的身体侧
- 指标平滑与采集质量拦截
- `standing → descending → bottom → ascending` 深蹲状态机
- 完整动作计数，拒绝半程动作、阈值抖动和低质量帧
- 聚焦深蹲训练的移动端页面与非诊断性反馈

## 本地运行

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm run api
```

另开一个终端启动 Web 前端：

```powershell
npm run web
```

浏览器只在本地执行摄像头采集和骨骼绘制，并通过 WebSocket 将 33 个姿态关键点发送给 FastAPI；原始视频不会发送到 Python 服务。FastAPI 负责正面深蹲的角度、对称性、膝内扣、身体中心侧移等指标，前端负责动作计数、提醒和可视化。

运行测试：

```powershell
npm test
npm run test:python
```

## 仓库状态

**Historical prototype / 历史原型。**

仓库保留原始实现和提交历史，用来记录项目方向的起点。除安全性和可运行性维护外，不计划继续在这里扩展新的产品功能。

## 医学与数据边界

- 输出仅是实验性动作反馈，不构成医学诊断或治疗建议。
- 未经过临床有效性、重测一致性或设备间一致性验证。
- 不应上传或提交包含个人身份信息的训练视频与记录。
- 实际康复评估必须由合格专业人员审核。
