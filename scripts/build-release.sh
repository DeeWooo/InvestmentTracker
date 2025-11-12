#!/bin/bash

# InvestmentTracker 发布构建脚本
# 用途：清理、构建、打包应用

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 获取脚本所在目录的父目录（项目根目录）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

info "项目根目录: $PROJECT_ROOT"
echo ""

# 步骤 1: 清理
info "步骤 1/4: 清理构建缓存..."
rm -rf .next out
rm -rf src-tauri/target/release/bundle/macos/*.tar.gz
success "清理完成"
echo ""

# 步骤 2: 构建 Next.js
info "步骤 2/4: 构建 Next.js 前端..."
npm run next:build
if [ $? -eq 0 ]; then
    success "Next.js 构建完成"
else
    error "Next.js 构建失败"
    exit 1
fi
echo ""

# 步骤 3: 构建 Tauri 应用
info "步骤 3/4: 构建 Tauri 桌面应用..."
npm run tauri:build
if [ $? -eq 0 ]; then
    success "Tauri 构建完成"
else
    error "Tauri 构建失败"
    exit 1
fi
echo ""

# 步骤 4: 打包
info "步骤 4/4: 打包应用..."

cd src-tauri/target/release/bundle/macos

# 检查 .app 文件是否存在
if [ ! -d "InvestmentTracker.app" ]; then
    error "找不到 InvestmentTracker.app 文件"
    exit 1
fi

# 获取版本号（从 package.json）
VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")
ARCHIVE_NAME="InvestmentTracker_v${VERSION}_macOS.tar.gz"

# 打包
tar -czf "$ARCHIVE_NAME" InvestmentTracker.app
success "打包完成: $ARCHIVE_NAME"

# 显示文件信息
FILE_SIZE=$(ls -lh "$ARCHIVE_NAME" | awk '{print $5}')
info "文件大小: $FILE_SIZE"
info "文件位置: $(pwd)/$ARCHIVE_NAME"
echo ""

# 步骤 5: 可选 - 复制到 Downloads 方便上传
warning "是否复制到 Downloads 文件夹？(y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    cp "$ARCHIVE_NAME" ~/Downloads/
    success "已复制到: ~/Downloads/$ARCHIVE_NAME"
fi

echo ""
success "🎉 构建完成！"
echo ""
info "下一步："
echo "  1. 测试应用: open InvestmentTracker.app"
echo "  2. 上传到 GitHub Release"
echo "  3. 文件位置: $(pwd)/$ARCHIVE_NAME"

