#!/bin/bash
# ============================================================
# Seenos UI 开发环境启动脚本
# ============================================================
# 使用方法:
#   ./scripts/dev.sh [选项]
#
# 选项:
#   --install   强制重新安装依赖
#   --clean     清理缓存后启动
# ============================================================

set -e

# 颜色定义
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 默认值
INSTALL_FLAG=false
CLEAN_FLAG=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --install)
            INSTALL_FLAG=true
            shift
            ;;
        --clean)
            CLEAN_FLAG=true
            shift
            ;;
        -h|--help)
            echo "使用方法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --install   强制重新安装依赖"
            echo "  --clean     清理缓存后启动"
            echo "  -h, --help  显示帮助信息"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

log_info "项目目录: $PROJECT_ROOT"

# 检查环境配置
if [ ! -f ".env.local" ]; then
    log_warning ".env.local 文件不存在"
    log_info "从 env.example 创建 .env.local..."
    cp env.example .env.local
    log_success ".env.local 已创建，请根据需要修改配置"
fi

# 清理缓存
if [ "$CLEAN_FLAG" = true ]; then
    log_info "清理缓存..."
    rm -rf .next
    rm -rf node_modules/.cache
    log_success "缓存已清理"
fi

# 安装依赖
if [ "$INSTALL_FLAG" = true ] || [ ! -d "node_modules" ]; then
    log_info "安装依赖..."
    yarn install
    log_success "依赖安装完成"
fi

# 启动开发服务器
echo ""
log_success "启动开发服务器..."
echo ""
echo "============================================"
echo "  Seenos UI 开发服务器"
echo "  访问: http://localhost:3000"
echo "  按 Ctrl+C 停止"
echo "============================================"
echo ""

yarn dev

