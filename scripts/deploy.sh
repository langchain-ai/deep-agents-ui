#!/bin/bash
# ============================================================
# Seenos UI 部署脚本
# ============================================================
# 使用方法:
#   ./scripts/deploy.sh [环境] [选项]
#
# 环境:
#   test        测试环境
#   staging     预发布环境
#   production  生产环境
#
# 选项:
#   --build     强制重新构建镜像
#   --no-cache  构建时不使用缓存
#   --pull      拉取最新基础镜像
#   --dry-run   仅显示将要执行的命令
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 默认值
ENVIRONMENT=""
BUILD_FLAG=false
NO_CACHE_FLAG=""
PULL_FLAG=""
DRY_RUN=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        test|staging|production)
            ENVIRONMENT=$1
            shift
            ;;
        --build)
            BUILD_FLAG=true
            shift
            ;;
        --no-cache)
            NO_CACHE_FLAG="--no-cache"
            shift
            ;;
        --pull)
            PULL_FLAG="--pull"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "使用方法: $0 [环境] [选项]"
            echo ""
            echo "环境:"
            echo "  test        测试环境"
            echo "  staging     预发布环境"
            echo "  production  生产环境"
            echo ""
            echo "选项:"
            echo "  --build     强制重新构建镜像"
            echo "  --no-cache  构建时不使用缓存"
            echo "  --pull      拉取最新基础镜像"
            echo "  --dry-run   仅显示将要执行的命令"
            echo "  -h, --help  显示帮助信息"
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

# 检查环境参数
if [ -z "$ENVIRONMENT" ]; then
    log_error "请指定部署环境: test, staging, 或 production"
    echo "使用 -h 或 --help 查看帮助"
    exit 1
fi

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

log_info "项目目录: $PROJECT_ROOT"
log_info "部署环境: $ENVIRONMENT"

# 根据环境设置变量
case $ENVIRONMENT in
    test)
        COMPOSE_FILE="-f docker-compose.yml -f docker-compose.test.yml"
        IMAGE_TAG="test"
        ;;
    staging)
        COMPOSE_FILE="-f docker-compose.yml -f docker-compose.test.yml"
        IMAGE_TAG="staging"
        ;;
    production)
        COMPOSE_FILE="-f docker-compose.yml -f docker-compose.prod.yml"
        IMAGE_TAG="production"
        ;;
esac

export IMAGE_TAG

# 执行或显示命令
run_cmd() {
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] $*"
    else
        log_info "执行: $*"
        eval "$@"
    fi
}

# 步骤 1: 检查 Docker
log_info "检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose 未安装"
    exit 1
fi

# 使用 docker compose 或 docker-compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

log_success "Docker 环境检查通过"

# 步骤 2: 构建镜像
if [ "$BUILD_FLAG" = true ]; then
    log_info "构建 Docker 镜像..."
    run_cmd "$DOCKER_COMPOSE $COMPOSE_FILE build $NO_CACHE_FLAG $PULL_FLAG"
    log_success "镜像构建完成"
fi

# 步骤 3: 停止旧容器
log_info "停止旧容器..."
run_cmd "$DOCKER_COMPOSE $COMPOSE_FILE down --remove-orphans"

# 步骤 4: 启动新容器
log_info "启动新容器..."
run_cmd "$DOCKER_COMPOSE $COMPOSE_FILE up -d"

# 步骤 5: 等待健康检查
if [ "$DRY_RUN" = false ]; then
    log_info "等待服务启动..."
    sleep 5
    
    # 检查容器状态
    CONTAINER_STATUS=$(docker ps --filter "name=seenos-ui" --format "{{.Status}}" | head -1)
    
    if [[ "$CONTAINER_STATUS" == *"Up"* ]]; then
        log_success "服务启动成功!"
        log_info "容器状态: $CONTAINER_STATUS"
    else
        log_error "服务启动失败"
        log_info "查看日志: docker logs seenos-ui"
        exit 1
    fi
fi

# 步骤 6: 显示部署信息
echo ""
echo "============================================"
log_success "部署完成!"
echo "============================================"
echo ""
log_info "环境: $ENVIRONMENT"
log_info "镜像标签: $IMAGE_TAG"
echo ""
log_info "常用命令:"
echo "  查看日志: docker logs -f seenos-ui"
echo "  查看状态: docker ps -a | grep seenos-ui"
echo "  停止服务: $DOCKER_COMPOSE $COMPOSE_FILE down"
echo "  重启服务: $DOCKER_COMPOSE $COMPOSE_FILE restart"
echo ""

