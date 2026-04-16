#!/bin/bash
#
# Production-grade deployment script for the Zomato platform
# Supports multi-environment deployments (dev, qa, prod)
#
# Usage:
#   ./deploy.sh [all|service-name] [image-tag] [environment]
#
# Examples:
#   ./deploy.sh all latest prod              # Deploy all to production
#   ./deploy.sh user-service 42-abc1234 qa   # Deploy one service to QA
#   ./deploy.sh all dev-15-def5678 dev       # Deploy all to dev
#   ./deploy.sh all                          # Deploy all with latest to prod (default)
#

set -euo pipefail

# ---- Configuration ----
DEPLOY_DIR="/opt/zomato"
DOCKER_REGISTRY="docker.io/umesa123"
SERVICE="${1:-all}"
IMAGE_TAG="${2:-latest}"
ENVIRONMENT="${3:-prod}"

# Validate environment
case "${ENVIRONMENT}" in
    dev|qa|prod) ;;
    *)
        echo "ERROR: Invalid environment '${ENVIRONMENT}'. Must be: dev, qa, prod"
        exit 1
        ;;
esac

# Environment-specific compose file
case "${ENVIRONMENT}" in
    dev)  COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml" ;;
    qa)   COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.qa.yml" ;;
    prod) COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml" ;;
esac

ENV_FILE="${DEPLOY_DIR}/.env.${ENVIRONMENT}"
# Fallback to .env if environment-specific file doesn't exist
if [ ! -f "${ENV_FILE}" ]; then
    ENV_FILE="${DEPLOY_DIR}/.env"
fi

LOG_DIR="${DEPLOY_DIR}/logs"
LOG_FILE="${LOG_DIR}/deploy-${ENVIRONMENT}-$(date +%Y%m%d).log"
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_INTERVAL=5

# ---- Service definitions in deployment order ----
BACKEND_SERVICES=(
    api-gateway
    user-service
    restaurant-service
    order-service
    delivery-service
    payment-service
    notification-service
    chat-service
)

FRONTEND_SERVICES=(
    frontend-customer
    frontend-restaurant
    frontend-driver
    frontend-agent
    health-check-ui
)

ALL_SERVICES=("${BACKEND_SERVICES[@]}" "${FRONTEND_SERVICES[@]}")

# ---- Health check ports ----
declare -A SERVICE_PORTS=(
    [api-gateway]=8080
    [user-service]=8081
    [restaurant-service]=8082
    [order-service]=8083
    [delivery-service]=8084
    [payment-service]=8085
    [notification-service]=8086
    [chat-service]=8087
    [frontend-customer]=3000
    [frontend-restaurant]=3001
    [frontend-driver]=3002
    [frontend-agent]=3003
    [health-check-ui]=3004
)

# Java services use /actuator/health, Node/frontend use /health or /
declare -A HEALTH_PATHS=(
    [api-gateway]=/actuator/health
    [user-service]=/actuator/health
    [restaurant-service]=/actuator/health
    [order-service]=/actuator/health
    [delivery-service]=/health
    [payment-service]=/health
    [notification-service]=/health
    [chat-service]=/health
    [frontend-customer]=/
    [frontend-restaurant]=/
    [frontend-driver]=/
    [frontend-agent]=/
    [health-check-ui]=/
)

# ---- Logging ----
mkdir -p "${LOG_DIR}"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [${ENVIRONMENT}] $1"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [${ENVIRONMENT}] ERROR: $1"
    echo "${msg}" >&2
    echo "${msg}" >> "${LOG_FILE}"
}

# ---- Pre-flight checks ----
preflight() {
    log "Running pre-flight checks..."

    if ! command -v docker &>/dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! docker compose version &>/dev/null && ! docker-compose version &>/dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    if [ ! -f "${COMPOSE_FILE}" ]; then
        log_error "Compose file not found: ${COMPOSE_FILE}"
        exit 1
    fi

    if [ ! -f "${ENV_FILE}" ]; then
        log_error ".env file not found: ${ENV_FILE}"
        log_error "Copy .env.example to ${ENV_FILE} and configure it first"
        exit 1
    fi

    log "Pre-flight checks passed."
}

# ---- Docker Compose wrapper (supports v1 and v2) ----
compose() {
    if docker compose version &>/dev/null 2>&1; then
        docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
    else
        docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
    fi
}

# ---- Update .env file ----
update_env() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
        # Use compatible sed for both macOS and Linux
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
        fi
    else
        echo "${key}=${value}" >> "${ENV_FILE}"
    fi
}

# ---- Health check ----
wait_for_healthy() {
    local svc="$1"
    local port="${SERVICE_PORTS[$svc]:-}"
    local path="${HEALTH_PATHS[$svc]:-/}"

    if [ -z "$port" ]; then
        log "  No health check port configured for ${svc}. Skipping health check."
        return 0
    fi

    log "  Waiting for ${svc} to become healthy (localhost:${port}${path})..."

    local elapsed=0
    while [ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]; do
        local http_code
        http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:${port}${path}" 2>/dev/null || echo "000")

        if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
            log "  ${svc} is healthy (HTTP ${http_code}) after ${elapsed}s"
            return 0
        fi

        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
    done

    log_error "${svc} failed health check after ${HEALTH_CHECK_TIMEOUT}s (last HTTP: ${http_code})"
    return 1
}

# ---- Deploy a single service ----
deploy_service() {
    local svc="$1"
    local tag="$2"

    log ""
    log "--- Deploying ${svc}:${tag} to ${ENVIRONMENT} ---"

    # Record current image for rollback reference
    local current_image
    current_image=$(compose ps --format json "${svc}" 2>/dev/null | grep -o '"Image":"[^"]*"' | head -1 || echo "none")
    log "  Previous image: ${current_image}"

    # Pull new image
    log "  Pulling image..."
    compose pull "${svc}" 2>&1 | tee -a "${LOG_FILE}"

    # Rolling restart: stop old, start new (--no-deps prevents restarting dependencies)
    log "  Restarting container..."
    compose up -d --no-deps --remove-orphans "${svc}" 2>&1 | tee -a "${LOG_FILE}"

    # Health check
    if wait_for_healthy "${svc}"; then
        log "  ${svc} deployed successfully to ${ENVIRONMENT}."
        return 0
    else
        log_error "${svc} deployment may have failed. Check logs:"
        log_error "  docker compose -f ${COMPOSE_FILE} logs --tail=50 ${svc}"
        return 1
    fi
}

# ==================== MAIN ====================

echo ""
log "============================================"
log "  Zomato Platform Deployment"
log "  Environment: ${ENVIRONMENT}"
log "  Target:      ${SERVICE}"
log "  Tag:         ${IMAGE_TAG}"
log "  Time:        $(date)"
log "  User:        $(whoami)"
log "  Compose:     ${COMPOSE_FILE}"
log "============================================"

preflight

# Update .env
update_env "IMAGE_TAG" "${IMAGE_TAG}"
update_env "DOCKER_REGISTRY" "${DOCKER_REGISTRY}"

cd "${DEPLOY_DIR}"

FAILED_SERVICES=()

if [ "${SERVICE}" = "all" ]; then
    # Ensure infrastructure is running first
    log ""
    log "=== Phase 0: Infrastructure Services ==="
    compose up -d postgres mongodb redis rabbitmq 2>&1 | tee -a "${LOG_FILE}"
    log "  Waiting for infrastructure to be healthy..."
    sleep 10

    log ""
    log "=== Phase 1: Backend Services ==="
    for svc in "${BACKEND_SERVICES[@]}"; do
        if ! deploy_service "${svc}" "${IMAGE_TAG}"; then
            FAILED_SERVICES+=("${svc}")
        fi
    done

    log ""
    log "=== Phase 2: Frontend Services ==="
    for svc in "${FRONTEND_SERVICES[@]}"; do
        if ! deploy_service "${svc}" "${IMAGE_TAG}"; then
            FAILED_SERVICES+=("${svc}")
        fi
    done
else
    # Validate service name
    VALID=false
    for svc in "${ALL_SERVICES[@]}"; do
        if [ "${svc}" = "${SERVICE}" ]; then
            VALID=true
            break
        fi
    done

    if [ "${VALID}" = false ]; then
        log_error "Unknown service: ${SERVICE}"
        log_error "Valid services: ${ALL_SERVICES[*]}"
        exit 1
    fi

    if ! deploy_service "${SERVICE}" "${IMAGE_TAG}"; then
        FAILED_SERVICES+=("${SERVICE}")
    fi
fi

# ---- Cleanup ----
log ""
log "--- Cleaning up dangling images ---"
docker image prune -f >> "${LOG_FILE}" 2>&1

# ---- Summary ----
log ""
log "============================================"
log "  Deployment Summary (${ENVIRONMENT})"
log "============================================"
compose ps 2>&1 | tee -a "${LOG_FILE}"

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    log ""
    log_error "FAILED SERVICES: ${FAILED_SERVICES[*]}"
    log_error "Check logs: ${LOG_FILE}"
    log_error "Rollback with: ./rollback.sh <service-name> <previous-tag> ${ENVIRONMENT}"
    exit 1
else
    log ""
    log "All deployments successful in ${ENVIRONMENT}!"
fi
