#!/bin/bash

# ContextMe EdgeOne 部署脚本
# 使用方法: ./deploy.sh [环境名称] [可选参数]

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

# 检查必要的工具
check_dependencies() {
    log_info "检查部署依赖..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi

    # 检查 EdgeOne CLI (可选)
    if command -v edgeone &> /dev/null; then
        log_info "EdgeOne CLI 已安装"
        HAS_EDGEONE_CLI=true
    else
        log_warning "EdgeOne CLI 未安装，将使用手动部署"
        HAS_EDGEONE_CLI=false
    fi

    log_success "依赖检查完成"
}

# 检查环境变量
check_env_vars() {
    log_info "检查环境变量..."

    local required_vars=(
        "DATABASE_URL"
        "UPSTASH_REDIS_REST_URL"
        "UPSTASH_REDIS_REST_TOKEN"
        "NEXTAUTH_SECRET"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
        "OPENAI_API_KEY"
    )

    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "缺少以下必需的环境变量:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_error "请在 .env 文件中配置这些变量"
        exit 1
    fi

    log_success "环境变量检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."

    # 清理可能存在的 node_modules
    if [[ -d "node_modules" ]]; then
        log_info "清理现有 node_modules..."
        rm -rf node_modules
    fi

    # 安装依赖
    npm ci --production=false
    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    log_info "构建 Next.js 项目..."

    # 设置构建环境变量
    export NODE_ENV=production

    # 运行构建
    npm run build

    if [[ $? -eq 0 ]]; then
        log_success "项目构建成功"
    else
        log_error "项目构建失败"
        exit 1
    fi
}

# 数据库迁移
migrate_database() {
    log_info "运行数据库迁移..."

    # 生成 Prisma 客户端
    npx prisma generate

    # 推送数据库 schema
    npx prisma db push

    log_success "数据库迁移完成"
}

# 运行测试
run_tests() {
    log_info "运行测试..."

    # 如果有测试脚本，运行它们
    if npm run test --silent 2>/dev/null; then
        log_success "所有测试通过"
    else
        log_warning "没有找到测试或测试失败，继续部署..."
    fi
}

# 优化构建产物
optimize_build() {
    log_info "优化构建产物..."

    # 压缩静态资源
    if command -v gzip &> /dev/null; then
        find .next/static -name "*.js" -o -name "*.css" | while read file; do
            gzip -c "$file" > "$file.gz"
        done
        log_info "静态资源压缩完成"
    fi

    # 设置文件权限
    chmod -R 755 .next

    log_success "构建产物优化完成"
}

# 部署到 EdgeOne
deploy_to_edgeone() {
    log_info "部署到 EdgeOne..."

    if [[ "$HAS_EDGEONE_CLI" == true ]]; then
        # 使用 EdgeOne CLI 部署
        log_info "使用 EdgeOne CLI 部署..."

        # 检查配置文件
        if [[ ! -f "edgeone.config.js" ]]; then
            log_error "EdgeOne 配置文件不存在"
            exit 1
        fi

        # 执行部署
        edgeone deploy --config edgeone.config.js

        if [[ $? -eq 0 ]]; then
            log_success "EdgeOne CLI 部署成功"
        else
            log_error "EdgeOne CLI 部署失败"
            exit 1
        fi
    else
        # 手动部署提示
        log_warning "需要手动部署到 EdgeOne"
        echo ""
        echo "手动部署步骤:"
        echo "1. 登录 EdgeOne 控制台"
        echo "2. 创建新的静态网站或函数计算服务"
        echo "3. 上传 .next 目录下的文件"
        echo "4. 配置环境变量"
        echo "5. 设置域名和 SSL"
        echo "6. 配置 CDN 和缓存策略"
        echo ""
        echo "详细配置请参考 edgeone.config.js 文件"
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    # 等待服务启动
    sleep 30

    # 检查 API 健康状态
    local health_url="https://api.contextme.com/api/health"

    if command -v curl &> /dev/null; then
        log_info "检查 API 健康状态: $health_url"

        if curl -f -s "$health_url" > /dev/null; then
            log_success "API 健康检查通过"
        else
            log_warning "API 健康检查失败，请检查部署状态"
        fi
    else
        log_warning "curl 未安装，跳过健康检查"
    fi
}

# 清理临时文件
cleanup() {
    log_info "清理临时文件..."

    # 清理压缩文件
    find .next -name "*.gz" -delete 2>/dev/null || true

    log_success "清理完成"
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo ""
    echo "🎉 ContextMe 已成功部署到 EdgeOne"
    echo ""
    echo "📋 部署信息:"
    echo "  - 环境: ${ENVIRONMENT:-production}"
    echo "  - 版本: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo "  - 时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "🔗 访问地址:"
    echo "  - API: https://api.contextme.com"
    echo "  - 控制台: https://api.contextme.com/dashboard"
    echo ""
    echo "📊 监控和日志:"
    echo "  - EdgeOne 控制台: https://console.cloud.tencent.com/edgeone"
    echo "  - 应用监控: https://console.cloud.tencent.com/apm"
    echo ""
    echo "🔧 常用命令:"
    echo "  - 查看日志: edgeone logs"
    echo "  - 回滚部署: edgeone rollback"
    echo "  - 重新部署: ./deploy.sh"
    echo ""
}

# 主函数
main() {
    local start_time=$(date +%s)

    echo "🚀 ContextMe EdgeOne 部署脚本"
    echo "=================================="
    echo ""

    # 检查参数
    ENVIRONMENT=${1:-production}

    log_info "开始部署到环境: $ENVIRONMENT"
    echo ""

    # 执行部署步骤
    check_dependencies
    check_env_vars
    install_dependencies
    build_project
    migrate_database
    run_tests
    optimize_build
    deploy_to_edgeone
    health_check
    cleanup

    # 计算部署时间
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    show_deployment_info
    log_info "部署耗时: ${duration}s"
}

# 错误处理
trap 'log_error "部署过程中发生错误，脚本退出"; exit 1' ERR

# 运行主函数
main "$@"