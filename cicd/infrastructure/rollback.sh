#!/bin/bash
#
# Rollback script — reverts a service to a previous image tag
# Supports multi-environment rollbacks (dev, qa, prod)
#
# Usage:
#   ./rollback.sh <service-name> <previous-image-tag> [environment]
#   ./rollback.sh user-service 41-def5678 prod
#   ./rollback.sh user-service qa-15-abc1234 qa
#   ./rollback.sh --list user-service          # List available tags
#

set -euo pipefail

DEPLOY_DIR="/opt/zomato"
DOCKER_REGISTRY="docker.io/umesa123"
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_INTERVAL=5

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

# ---- List available tags ----
if [ "${1:-}" = "--list" ]; then
    SERVICE="${2:?Usage: ./rollback.sh --list <service-name>}"
    echo "Available local images for zomato-${SERVICE}:"
    docker images "${DOCKER_REGISTRY}/zomato-${SERVICE}" --format "  {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -20
    exit 0
fi

# ---- Parse args ----
SERVICE="${1:?Usage: ./rollback.sh <service-name> <image-tag> [environment]}"
ROLLBACK_TAG="${2:?Usage: ./rollback.sh <service-name> <image-tag> [environment]}"
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
if [ ! -f "${ENV_FILE}" ]; then
    ENV_FILE="${DEPLOY_DIR}/.env"
fi

LOG_DIR="${DEPLOY_DIR}/logs"
LOG_FILE="${LOG_DIR}/rollback-${ENVIRONMENT}-$(date +%Y%m%d).log"
FULL_IMAGE="${DOCKER_REGISTRY}/zomato-${SERVICE}:${ROLLBACK_TAG}"

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

compose() {
    if docker compose version &>/dev/null 2>&1; then
        docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
    else
        docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
    fi
}

wait_for_healthy() {
    local svc="$1"
    local port="${SERVICE_PORTS[$svc]:-}"
    local path="${HEALTH_PATHS[$svc]:-/}"

    if [ -z "$port" ]; then
        return 0
    fi

    log "  Waiting for ${svc} to become healthy..."

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

    log_error "${svc} health check failed after ${HEALTH_CHECK_TIMEOUT}s"
    return 1
}

echo ""
log "============================================"
log "  ROLLBACK: ${SERVICE} in ${ENVIRONMENT}"
log "  Target tag:  ${ROLLBACK_TAG}"
log "  Compose:     ${COMPOSE_FILE}"
log "  Time:        $(date)"
log "  User:        $(whoami)"
log "============================================"

# ---- Confirmation ----
echo ""
echo "WARNING: This will rollback ${SERVICE} to tag ${ROLLBACK_TAG} in ${ENVIRONMENT}"
echo ""
read -r -p "Are you sure? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

cd "${DEPLOY_DIR}"

# Record current state before rollback
CURRENT_IMAGE=$(compose ps --format json "${SERVICE}" 2>/dev/null | grep -o '"Image":"[^"]*"' | head -1 || echo "unknown")
log "  Current image: ${CURRENT_IMAGE}"
log "  Rolling back to: ${FULL_IMAGE}"

# Pull the rollback image
log "  Pulling ${FULL_IMAGE}..."
docker pull "${FULL_IMAGE}" 2>&1 | tee -a "${LOG_FILE}"

# Update .env with rollback tag (compatible sed)
if grep -q "^IMAGE_TAG=" "${ENV_FILE}" 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^IMAGE_TAG=.*|IMAGE_TAG=${ROLLBACK_TAG}|" "${ENV_FILE}"
    else
        sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=${ROLLBACK_TAG}|" "${ENV_FILE}"
    fi
else
    echo "IMAGE_TAG=${ROLLBACK_TAG}" >> "${ENV_FILE}"
fi

# Stop and restart
log "  Stopping ${SERVICE}..."
compose stop "${SERVICE}" 2>&1 | tee -a "${LOG_FILE}"

log "  Starting ${SERVICE} with tag ${ROLLBACK_TAG}..."
compose up -d --no-deps "${SERVICE}" 2>&1 | tee -a "${LOG_FILE}"

# Verify health
if wait_for_healthy "${SERVICE}"; then
    log ""
    log "Rollback successful! ${SERVICE} is now running ${ROLLBACK_TAG} in ${ENVIRONMENT}"
else
    log_error ""
    log_error "Rollback completed but health check failed!"
    log_error "Check logs: compose logs --tail=100 ${SERVICE}"
fi

log ""
log "Verify:"
log "  docker compose -f ${COMPOSE_FILE} ps ${SERVICE}"
log "  docker compose -f ${COMPOSE_FILE} logs --tail=50 ${SERVICE}"
