# 构建脚本说明

## 📦 build-release.sh

完整的发布构建脚本，自动化整个构建和打包流程。

### 使用方法

```bash
# 从项目根目录运行
./scripts/build-release.sh

# 或者从 scripts 目录运行
cd scripts
./build-release.sh
```

### 功能

1. ✅ **清理构建缓存** - 删除 `.next`、`out` 和旧的 `.tar.gz` 文件
2. ✅ **构建 Next.js** - 编译前端静态文件
3. ✅ **构建 Tauri** - 编译 Rust 后端和打包桌面应用
4. ✅ **打包应用** - 创建 `.tar.gz` 压缩包
5. ✅ **显示信息** - 显示文件大小和位置
6. ✅ **可选复制** - 可以复制到 Downloads 文件夹方便上传

### 输出

构建完成后，文件位于：
```
src-tauri/target/release/bundle/macos/InvestmentTracker_v0.1.0_macOS.tar.gz
```

### 错误处理

- 脚本使用 `set -e`，任何步骤失败都会立即停止
- 每个步骤都有清晰的成功/失败提示
- 带颜色的输出，易于识别

### 系统要求

- macOS (当前仅支持 macOS 构建)
- Node.js 18+
- Rust 1.70+
- npm

### 注意事项

1. **首次运行可能较慢** - Rust 需要下载依赖
2. **确保端口可用** - Next.js 开发服务器需要端口 3001
3. **检查版本号** - 脚本会从 `package.json` 读取版本号

---

## 🔧 其他脚本（待添加）

### build-dev.sh（计划中）
快速开发构建，不打包

### test-release.sh（计划中）
测试发布包是否能正常运行

### clean-all.sh（计划中）
深度清理，包括 node_modules 和 Rust target

---

**最后更新**: 2025-11-12

