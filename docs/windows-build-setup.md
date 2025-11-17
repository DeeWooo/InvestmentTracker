# Windows 开发环境设置指南

## 问题：`link.exe not found` 错误

在 Windows 上运行 `npm run dev` 时出现 `link.exe not found` 错误，这是因为 Tauri 需要编译 Rust 代码，而 Rust 在 Windows 上需要 Microsoft Visual C++ 编译工具链。

## 解决方案

### 方案 1：安装 Visual Studio Build Tools（推荐）

这是最轻量级的解决方案，只安装编译工具，不安装完整的 IDE。

1. **下载 Visual Studio Build Tools**
   - 访问：https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - 下载 "Build Tools for Visual Studio 2022"

2. **安装时选择工作负载**
   - 运行安装程序
   - 选择 **"使用 C++ 的桌面开发"** 工作负载
   - 确保包含以下组件：
     - MSVC v143 - VS 2022 C++ x64/x86 生成工具
     - Windows 10/11 SDK（最新版本）
     - C++ CMake 工具（可选但推荐）

3. **重启终端**
   - 安装完成后，**关闭并重新打开** PowerShell/CMD 终端
   - 确保环境变量已更新

4. **验证安装**
   ```powershell
   # 检查 Rust 是否正确安装
   rustc --version
   
   # 检查 C++ 工具链
   cl
   ```

5. **重新运行项目**
   ```powershell
   npm run dev
   ```

### 方案 2：安装完整 Visual Studio

如果你需要完整的开发环境：

1. **下载 Visual Studio Community**（免费）
   - 访问：https://visualstudio.microsoft.com/downloads/
   - 下载 "Visual Studio Community 2022"

2. **安装时选择工作负载**
   - 选择 **"使用 C++ 的桌面开发"** 工作负载
   - 其他选项根据需要选择

3. **后续步骤同方案 1**

### 方案 3：使用 Windows Build Tools（不推荐用于 Rust）

⚠️ **注意**：这个方法主要用于 Node.js 原生模块，对于 Rust/Tauri 项目可能不够完整。

```powershell
npm install --global windows-build-tools
```

## 验证 Rust 工具链

安装完成后，验证 Rust 是否正确配置：

```powershell
# 检查 Rust 版本
rustc --version

# 检查 Cargo 版本
cargo --version

# 检查 Rust 工具链目标平台
rustup target list --installed

# 如果缺少 Windows 目标，安装它
rustup target add x86_64-pc-windows-msvc
```

## 常见问题

### Q: 安装后仍然报错？
A: 
1. 确保完全关闭并重新打开终端
2. 检查环境变量 `PATH` 是否包含 Visual Studio 工具路径
3. 尝试在 **管理员权限** 的终端中运行

### Q: 如何检查环境变量？
A: 在 PowerShell 中运行：
```powershell
$env:PATH -split ';' | Select-String -Pattern "Visual Studio|MSBuild"
```

### Q: 需要重启电脑吗？
A: 通常不需要，但重新打开终端是必需的。如果问题持续，可以尝试重启。

### Q: 可以使用 MinGW 吗？
A: 可以，但需要配置 Rust 使用 GNU 工具链：
```powershell
rustup toolchain install stable-x86_64-pc-windows-gnu
rustup default stable-x86_64-pc-windows-gnu
```
不过，对于 Tauri 项目，推荐使用 MSVC 工具链（默认）。

## 参考链接

- [Rust Windows 安装指南](https://forge.rust-lang.org/infra/channel-layout.html)
- [Tauri 官方文档 - Windows 设置](https://tauri.app/v1/guides/getting-started/prerequisites#windows)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)


