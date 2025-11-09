# 📚 InvestmentTracker 文档导航

> 快速找到你需要的文档

---

## 🚀 快速开始

**新手入门？从这里开始：**

1. 查看 [项目结构](./project-structure.md) - 了解项目架构
2. 阅读 [迁移计划](./migration-plan.md) - 了解开发路线
3. 检查 [快速开始](../readme.md) - 本地运行项目

---

## 📋 文档导航表

### 对于新开发者

| 文档 | 用途 | 阅读时间 |
|------|------|--------|
| [项目结构](./project-structure.md) | 了解项目目录和架构 | 10 分钟 |
| [快速开始](../readme.md) | 本地开发环境搭建 | 5 分钟 |
| [迁移计划](./migration-plan.md) | 理解开发路线和任务 | 15 分钟 |

### 对于技术深度

| 文档 | 内容 | 优先级 |
|------|------|--------|
| [存储方案设计](./storage-design.md) | 数据库表设计和 API 接口 | ⭐⭐⭐ 必读 |
| [功能差距分析](./gap-analysis.md) | 与 Java 版本的功能对比 | ⭐⭐ 重要 |
| [代码审查](./code-review.md) | 代码优化建议和重构方案 | ⭐⭐ 重要 |

### 对于项目经理

| 文档 | 用途 |
|------|------|
| [迁移计划](./migration-plan.md) | 项目时间表和里程碑 |
| [功能差距分析](./gap-analysis.md) | 功能完成度和优先级 |
| [项目结构](./project-structure.md) | 待优化项和技术债 |

---

## 🎯 按任务快速导航

### 我想...

#### 了解项目
- ➡️ [项目结构](./project-structure.md)
- ➡️ [项目 README](../readme.md)

#### 开始本地开发
- ➡️ [项目 README - 快速开始](../readme.md#-快速开始)
- ➡️ [项目结构](./project-structure.md#五开发工作流)

#### 从头开发（完整迁移）
- ➡️ [迁移计划](./migration-plan.md) - 6 周完整路线
- ➡️ [功能差距分析](./gap-analysis.md) - 理解每个功能

#### 进行数据库迁移
- ➡️ [存储方案设计](./storage-design.md) - 新表结构
- ➡️ [迁移计划 - 第 1 天](./migration-plan.md#第-1-天数据库迁移)

#### 重构后端代码
- ➡️ [代码审查](./code-review.md) - Rust 优化建议
- ➡️ [迁移计划 - 第 2-3 天](./migration-plan.md#第-2-3-天后端模块化)

#### 优化前端代码
- ➡️ [代码审查](./code-review.md) - TypeScript 类型拆分
- ➡️ [迁移计划 - 第 6 天](./migration-plan.md#第-6-天前端适配)

#### 实现实时价格
- ➡️ [迁移计划 - 阶段 3](./migration-plan.md#🟠-第三优先级实时价格服务2-周)
- ➡️ [功能差距分析](./gap-analysis.md#23-实时价格获取)

---

## 📊 文档一览

```
docs/
├── README.md                  # 本文档（导航索引）
├── project-structure.md       # 项目结构说明
├── migration-plan.md          # Java 版本迁移计划 ⭐⭐⭐
├── gap-analysis.md            # 功能差距分析 ⭐⭐
├── storage-design.md          # 存储方案设计 ⭐⭐⭐
└── code-review.md             # 代码审查意见 ⭐⭐
```

### 文档关系图

```
新手入门
  ↓
[项目结构] + [快速开始]
  ↓
[迁移计划]（整体路线）
  ↓
[功能差距分析]（需要做什么）
  ↓
具体实施
  ├─ 数据库 → [存储方案设计]
  ├─ 后端代码 → [代码审查]
  └─ 前端代码 → [代码审查]
```

---

## 🎓 按角色推荐阅读顺序

### 👨‍💻 Full-Stack 开发者
1. [项目结构](./project-structure.md) - 了解全貌
2. [迁移计划](./migration-plan.md) - 理解任务
3. [存储方案设计](./storage-design.md) - 数据库设计
4. [代码审查](./code-review.md) - 代码优化
5. [功能差距分析](./gap-analysis.md) - 功能补充

### 🦀 Rust 后端开发者
1. [项目结构](./project-structure.md#四数据流)
2. [存储方案设计](./storage-design.md) - 表结构和 API
3. [代码审查 - Rust 部分](./code-review.md#三rust-后端优化)
4. [迁移计划 - 后端部分](./migration-plan.md#第-2-3-天后端模块化)

### ⚛️ React 前端开发者
1. [项目结构](./project-structure.md#四数据流)
2. [代码审查 - 前端部分](./code-review.md#四前端组件优化react)
3. [迁移计划 - 前端部分](./migration-plan.md#第-6-天前端适配)

### 📊 项目经理
1. [迁移计划](./migration-plan.md) - 时间和里程碑
2. [功能差距分析](./gap-analysis.md) - 功能完成度
3. [项目结构](./project-structure.md#七待优化项) - 技术债

---

## ✅ 文档检查清单

- [x] 项目结构文档 - 目录说明
- [x] 迁移计划 - 6 周完整路线 ⭐
- [x] 功能差距分析 - 与 Java 版本对比
- [x] 存储方案设计 - 数据库设计
- [x] 代码审查 - 优化建议
- [x] 文档索引 - 快速导航（本文档）

---

## 🔗 相关资源

### 参考项目
- [position-minitor-java](../../../position-minitor-java/) - Java 参考版本
- [InvestmentTracker](../) - 当前项目根目录

### 外部参考
- [Tauri 官方文档](https://tauri.app/)
- [Next.js 官方文档](https://nextjs.org/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLite 文档](https://www.sqlite.org/docs.html)

---

## 📝 更新日志

| 日期 | 更新内容 |
|------|--------|
| 2025-11-07 | 创建完整的文档体系，包括迁移计划、差距分析等 |
| 2025-11-07 | 扁平化项目目录结构，移除 next-app 层 |
| 2025-11-07 | 更新 README 和项目配置 |

---

## 💡 建议

**初次接触本项目？**

推荐按以下顺序阅读：
1. 本文档（5 分钟）- 了解有哪些文档
2. [项目 README](../readme.md)（5 分钟）- 快速开始
3. [项目结构](./project-structure.md)（10 分钟）- 了解架构
4. [迁移计划](./migration-plan.md)（15 分钟）- 了解开发路线

总计：**35 分钟**，就能掌握项目的整个概况！

---

**需要帮助？**

- 查看 [项目 README](../readme.md#-开发命令) 中的开发命令
- 查看 [项目结构](./project-structure.md#-目录设计原则) 中的设计原则
- 查看 [迁移计划](./migration-plan.md#四风险和缓解措施) 中的风险管理

---

**最后更新:** 2025-11-07
**维护者:** InvestmentTracker 开发团队
