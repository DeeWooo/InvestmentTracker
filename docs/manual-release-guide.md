# 📦 InvestmentTracker 手动发布指南

## ✅ 构建完成！

你的 macOS 版本已经成功构建并打包。

---

## 📍 构建产物位置

### macOS 应用包（用于上传）
```
/Users/ivywu/Downloads/GitHub/Deewooo/InvestmentTracker/src-tauri/target/release/bundle/macos/InvestmentTracker_v0.1.0_macOS.tar.gz
```

**文件大小**: 约 12 MB  
**用户使用**: 下载后解压，双击 `InvestmentTracker.app` 运行

---

## 🚀 发布到 GitHub Release

### 方式一：通过 GitHub 网页（推荐）

1. **访问 Releases 页面**
   ```
   https://github.com/Deewooo/InvestmentTracker/releases
   ```

2. **点击 "Draft a new release"**

3. **填写 Release 信息**
   - **Tag**: `v0.1.0` （如果不存在会自动创建）
   - **Release title**: `InvestmentTracker v0.1.0`
   - **Description**: 
     ```markdown
     ## 📦 InvestmentTracker v0.1.0
     
     第一个正式版本！
     
     ### ✨ 功能特性
     - ✅ 持仓列表管理
     - ✅ 投资组合分组
     - ✅ 盈亏统计分析
     - ✅ 本地数据存储（SQLite）
     
     ### 📥 下载说明
     
     #### macOS 用户
     1. 下载 `InvestmentTracker_v0.1.0_macOS.tar.gz`
     2. 解压得到 `InvestmentTracker.app`
     3. 双击运行（首次可能需要右键→打开）
     
     **如遇到安全提示**：
     ```bash
     xattr -cr InvestmentTracker.app
     ```
     
     ### 📝 系统要求
     - macOS 10.15 或更高版本
     - 约 50MB 磁盘空间
     
     ### 🐛 已知问题
     - 应用未签名，首次运行需要手动授权
     
     ### 📞 反馈
     遇到问题？请提交 [Issue](https://github.com/Deewooo/InvestmentTracker/issues)
     ```

4. **上传文件**
   - 点击 "Attach binaries by dropping them here or selecting them"
   - 选择文件：`InvestmentTracker_v0.1.0_macOS.tar.gz`
   - 等待上传完成

5. **发布**
   - 点击 "Publish release"
   - 完成！

---

### 方式二：通过 GitHub CLI（需要安装 gh）

如果你安装了 GitHub CLI：

```bash
cd /Users/ivywu/Downloads/GitHub/Deewooo/InvestmentTracker

# 创建 Release
gh release create v0.1.0 \
  --title "InvestmentTracker v0.1.0" \
  --notes "第一个正式版本" \
  src-tauri/target/release/bundle/macos/InvestmentTracker_v0.1.0_macOS.tar.gz
```

---

## 📝 后续构建流程

### 下次发布时（例如 v0.1.1）

1. **更新版本号**
   - `package.json`: `"version": "0.1.1"`
   - `src-tauri/tauri.conf.json`: `"version": "0.1.1"`
   - `src-tauri/Cargo.toml`: `version = "0.1.1"`

2. **清理并构建**
   ```bash
   cd /Users/ivywu/Downloads/GitHub/Deewooo/InvestmentTracker
   
   # 清理缓存
   rm -rf .next out
   
   # 构建
   npm run build
   ```

3. **打包**
   ```bash
   cd src-tauri/target/release/bundle/macos
   tar -czf InvestmentTracker_v0.1.1_macOS.tar.gz InvestmentTracker.app
   ```

4. **上传到 GitHub Release**
   - 按上面的步骤创建新的 Release

---

## 🎯 快速命令总结

```bash
# 完整构建流程（一次性执行）
cd /Users/ivywu/Downloads/GitHub/Deewooo/InvestmentTracker

# 1. 清理
rm -rf .next out

# 2. 构建
npm run build

# 3. 打包
cd src-tauri/target/release/bundle/macos
tar -czf InvestmentTracker_v0.1.0_macOS.tar.gz InvestmentTracker.app

# 4. 查看文件
ls -lh InvestmentTracker_v0.1.0_macOS.tar.gz

# 文件位置：
# /Users/ivywu/Downloads/GitHub/Deewooo/InvestmentTracker/src-tauri/target/release/bundle/macos/InvestmentTracker_v0.1.0_macOS.tar.gz
```

---

## 🐛 故障排查

### 问题：构建失败

**解决方法**：
```bash
# 清理所有缓存
rm -rf .next out node_modules/.cache src-tauri/target

# 重新安装依赖
npm install

# 重新构建
npm run build
```

### 问题：用户无法打开应用（macOS）

**错误提示**: "无法打开，因为无法验证开发者"

**解决方法**（告诉用户）：
```bash
# 方法1: 右键点击应用 → 打开 → 点击"打开"

# 方法2: 命令行移除隔离属性
xattr -cr InvestmentTracker.app
```

### 问题：应用运行但数据库报错

**可能原因**: 数据库文件权限问题

**解决方法**: 应用会自动在用户目录创建数据库，无需手动处理

---

## 📊 构建信息

- **构建日期**: 2025-11-12
- **版本**: v0.1.0
- **平台**: macOS (Apple Silicon / Intel)
- **文件大小**: ~12 MB
- **Tauri 版本**: 2.2.x
- **Next.js 版本**: 15.1.6

---

## 🎉 恭喜！

你的应用已经成功构建并打包！现在只需要上传到 GitHub Release，用户就可以下载使用了。

如果需要构建 Windows 版本，你需要在 Windows 系统上执行相同的构建命令，或者使用 GitHub Actions（需要解决之前的配置问题）。

---

**最后更新**: 2025-11-12

