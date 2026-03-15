#!/bin/bash
# 部署脚本

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
ENV_FILE="${ENV_FILE:-.env.production}"
DEPLOY_MODE="${DEPLOY_MODE:-docker}" # docker, pm2, vercel

echo -e "${BLUE}🚀 AI 招聘应用部署脚本${NC}\n"

# 检查环境变量文件
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ 错误: 环境变量文件 $ENV_FILE 不存在${NC}"
    echo -e "${YELLOW}提示: 请创建 $ENV_FILE 并配置所有必需的环境变量${NC}"
    exit 1
fi

# 加载环境变量
set -a
source "$ENV_FILE"
set +a

# 检查必需的环境变量
REQUIRED_VARS=(
    "DATABASE_URL"
    "BETTER_AUTH_SECRET"
    "CLAUDE_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ 错误: 以下必需环境变量未设置:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo -e "${GREEN}✅ 环境变量检查通过${NC}\n"

# 根据部署模式执行
case "$DEPLOY_MODE" in
    docker)
        echo -e "${BLUE}🐳 使用 Docker Compose 部署...${NC}\n"
        
        # 构建镜像
        echo -e "${YELLOW}📦 构建 Docker 镜像...${NC}"
        docker-compose -f docker-compose.prod.yml build
        
        # 启动服务
        echo -e "${YELLOW}🚀 启动服务...${NC}"
        docker-compose -f docker-compose.prod.yml up -d
        
        # 等待数据库就绪
        echo -e "${YELLOW}⏳ 等待数据库就绪...${NC}"
        sleep 5
        
        # 运行迁移
        echo -e "${YELLOW}🔄 运行数据库迁移...${NC}"
        docker-compose -f docker-compose.prod.yml exec -T app pnpm db:migrate || {
            echo -e "${YELLOW}⚠️  迁移可能已存在，继续...${NC}"
        }
        
        echo -e "\n${GREEN}✅ Docker 部署完成${NC}"
        echo -e "${GREEN}📊 查看日志: docker-compose -f docker-compose.prod.yml logs -f${NC}"
        ;;
        
    pm2)
        echo -e "${BLUE}⚡ 使用 PM2 部署...${NC}\n"
        
        # 安装依赖
        echo -e "${YELLOW}📦 安装依赖...${NC}"
        pnpm install --frozen-lockfile
        
        # 构建应用
        echo -e "${YELLOW}🔨 构建应用...${NC}"
        pnpm build
        
        # 运行迁移
        echo -e "${YELLOW}🔄 运行数据库迁移...${NC}"
        pnpm db:migrate || {
            echo -e "${YELLOW}⚠️  迁移可能已存在，继续...${NC}"
        }
        
        # 启动 PM2
        echo -e "${YELLOW}🚀 启动 PM2...${NC}"
        pm2 start ecosystem.config.js
        pm2 save
        
        echo -e "\n${GREEN}✅ PM2 部署完成${NC}"
        echo -e "${GREEN}📊 查看日志: pm2 logs ai-recruitment-app${NC}"
        ;;
        
    vercel)
        echo -e "${BLUE}▲ 使用 Vercel 部署...${NC}\n"
        
        # 检查 Vercel CLI
        if ! command -v vercel &> /dev/null; then
            echo -e "${RED}❌ Vercel CLI 未安装${NC}"
            echo -e "${YELLOW}安装: npm i -g vercel${NC}"
            exit 1
        fi
        
        # 部署
        echo -e "${YELLOW}🚀 部署到 Vercel...${NC}"
        vercel --prod
        
        echo -e "\n${GREEN}✅ Vercel 部署完成${NC}"
        echo -e "${YELLOW}⚠️  注意: 请确保在 Vercel 控制台中配置了所有环境变量${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ 未知的部署模式: $DEPLOY_MODE${NC}"
        echo -e "${YELLOW}支持的模式: docker, pm2, vercel${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 部署完成！${NC}"

