#!/bin/bash
# ============================================================
# Seenos UI 本地构建脚本
# ============================================================
# 使用方法:
#   ./scripts/build.sh [选项]
#
# 选项:
#   --clean     清理之前的构建产物
#   --analyze   分析构建包大小
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 默认值
CLEAN_FLAG=false
ANALYZE_FLAG=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_FLAG=true
            shift
            ;;
        --analyze)
            ANALYZE_FLAG=true
            shift
            ;;
        -h|--help)
            echo "使用方法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --clean     清理之前的构建产物"
            echo "  --analyze   分析构建包大小"
            echo "  -h, --help  显示帮助信息"
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

log_info "项目目录: $PROJECT_ROOT"

# 检查 Node.js 和 Yarn
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装"
    exit 1
fi

if ! command -v yarn &> /dev/null; then
    log_error "Yarn 未安装"
    exit 1
fi

NODE_VERSION=$(node -v)
YARN_VERSION=$(yarn -v)

log_info "Node.js 版本: $NODE_VERSION"
log_info "Yarn 版本: $YARN_VERSION"

# 清理构建产物
if [ "$CLEAN_FLAG" = true ]; then
    log_info "清理构建产物..."
    rm -rf .next
    rm -rf out
    rm -rf node_modules/.cache
    log_success "清理完成"
fi

# 安装依赖
log_info "检查依赖..."
if [ ! -d "node_modules" ]; then
    log_info "安装依赖..."
    yarn install --frozen-lockfile
fi

# 类型检查
log_info "运行类型检查..."
yarn tsc --noEmit || {
    log_error "类型检查失败"
    exit 1
}
log_success "类型检查通过"

# Lint 检查
log_info "运行 Lint 检查..."
yarn lint || {
    log_error "Lint 检查失败"
    exit 1
}
log_success "Lint 检查通过"

# 构建
log_info "开始构建..."
if [ "$ANALYZE_FLAG" = true ]; then
    ANALYZE=true yarn build
else
    yarn build
fi

log_success "构建完成!"

# 显示构建信息
echo ""
echo "============================================"
log_success "构建成功!"
echo "============================================"
echo ""

if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next | cut -f1)
    log_info "构建产物大小: $BUILD_SIZE"
fi

echo ""
log_info "下一步:"
echo "  本地预览: yarn start"
echo "  Docker 部署: ./scripts/deploy.sh test --build"
echo ""

