#!/bin/bash
#
# Step 3: Update all split repos with fixed Jenkinsfiles and create env branches
#
# This script:
#   1. Clones each service repo
#   2. Updates the Jenkinsfile with the fixed multi-env version
#   3. Creates develop and qa branches
#   4. Pushes everything
#
# Usage:
#   cd /path/to/zomato-clone
#   bash cicd/scripts/3-update-repos.sh
#

set -euo pipefail

GITHUB_USER="UMESHA123"
MONOREPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="/tmp/zomato-update-$(date +%s)"
JENKINSFILES_DIR="${MONOREPO_DIR}/cicd/jenkinsfiles"

echo "============================================"
echo "  Updating All Microservice Repos"
echo "  Source: ${MONOREPO_DIR}"
echo "  Temp:   ${WORK_DIR}"
echo "============================================"
echo ""

mkdir -p "${WORK_DIR}"

TOTAL=0
SUCCESS=0
FAILED=0

# ---- Update a service repo ----
update_service_repo() {
    local SERVICE_NAME="$1"
    local JENKINSFILE_TYPE="$2"   # java-service | node-service | frontend
    local REPO_NAME="zomato-${SERVICE_NAME}"
    local TARGET="${WORK_DIR}/${REPO_NAME}"
    TOTAL=$((TOTAL + 1))

    echo ""
    echo "--- [${TOTAL}] ${REPO_NAME} ---"

    # Clone
    echo "  Cloning..."
    if ! git clone "https://github.com/${GITHUB_USER}/${REPO_NAME}.git" "${TARGET}" 2>&1; then
        echo "  ERROR: Failed to clone ${REPO_NAME}"
        FAILED=$((FAILED + 1))
        return 1
    fi

    cd "${TARGET}"

    # Update Jenkinsfile
    echo "  Updating Jenkinsfile (${JENKINSFILE_TYPE})..."
    cp "${JENKINSFILES_DIR}/Jenkinsfile.${JENKINSFILE_TYPE}" "${TARGET}/Jenkinsfile"

    # Replace placeholders
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|__SERVICE_NAME__|${SERVICE_NAME}|g" "${TARGET}/Jenkinsfile"
        sed -i '' "s|__REPO_NAME__|${REPO_NAME}|g" "${TARGET}/Jenkinsfile"
    else
        sed -i "s|__SERVICE_NAME__|${SERVICE_NAME}|g" "${TARGET}/Jenkinsfile"
        sed -i "s|__REPO_NAME__|${REPO_NAME}|g" "${TARGET}/Jenkinsfile"
    fi

    # Commit on main
    git add Jenkinsfile
    if git diff --cached --quiet; then
        echo "  Jenkinsfile already up to date."
    else
        git commit -m "feat: production-grade multi-env CI/CD pipeline (dev/qa/prod)

- Branch mapping: develop→dev, release/*|qa→qa, main→prod
- Environment-prefixed image tags (e.g. dev-42-abc1234)
- Trivy security scanning, smoke tests, manual prod approval
- SSH-based deploy via deploy.sh with environment parameter"
        echo "  Committed Jenkinsfile update."
    fi

    # Push main
    echo "  Pushing main..."
    git push origin main 2>&1 || echo "  WARNING: main push failed"

    # Create and push develop branch
    echo "  Creating develop branch..."
    git branch develop 2>/dev/null || true
    git push origin develop 2>&1 || echo "  WARNING: develop push failed (may already exist)"

    # Create and push qa branch
    echo "  Creating qa branch..."
    git branch qa 2>/dev/null || true
    git push origin qa 2>&1 || echo "  WARNING: qa push failed (may already exist)"

    SUCCESS=$((SUCCESS + 1))
    cd "${MONOREPO_DIR}"
}

# ---- Java Services ----
echo ""
echo "========== Java Services =========="
update_service_repo "user-service"         "java-service"
update_service_repo "restaurant-service"   "java-service"
update_service_repo "order-service"        "java-service"

# ---- Node Services ----
echo ""
echo "========== Node Services =========="
update_service_repo "api-gateway"          "node-service"
update_service_repo "delivery-service"     "node-service"
update_service_repo "payment-service"      "node-service"
update_service_repo "notification-service" "node-service"
update_service_repo "chat-service"         "node-service"

# ---- Frontends ----
echo ""
echo "========== Frontends =========="
update_service_repo "frontend-customer"    "frontend"
update_service_repo "frontend-restaurant"  "frontend"
update_service_repo "frontend-driver"      "frontend"
update_service_repo "frontend-agent"       "frontend"

# ---- Health Check UI ----
echo ""
echo "========== Health Check UI =========="
update_service_repo "health-check-ui"      "node-service"

# ---- Infrastructure Repo (special) ----
echo ""
echo "========== Infrastructure =========="
TOTAL=$((TOTAL + 1))
INFRA_TARGET="${WORK_DIR}/zomato-infrastructure"

echo "--- [${TOTAL}] zomato-infrastructure ---"
echo "  Cloning..."
git clone "https://github.com/${GITHUB_USER}/zomato-infrastructure.git" "${INFRA_TARGET}" 2>&1

cd "${INFRA_TARGET}"

# Copy updated infrastructure files
echo "  Updating compose files..."
cp "${MONOREPO_DIR}/docker-compose.yml" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/docker-compose.prod.yml" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/docker-compose.qa.yml" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/docker-compose.monitoring.yml" "${INFRA_TARGET}/" 2>/dev/null || true

echo "  Updating deploy scripts..."
cp "${MONOREPO_DIR}/cicd/infrastructure/deploy.sh" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/cicd/infrastructure/rollback.sh" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/cicd/infrastructure/.env.example" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/cicd/infrastructure/.env.dev" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/cicd/infrastructure/.env.qa" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/cicd/infrastructure/.env.prod" "${INFRA_TARGET}/" 2>/dev/null || true

echo "  Updating nginx config..."
mkdir -p "${INFRA_TARGET}/nginx/ssl"
cp "${MONOREPO_DIR}/nginx/nginx.conf" "${INFRA_TARGET}/nginx/" 2>/dev/null || true
touch "${INFRA_TARGET}/nginx/ssl/.gitkeep"

echo "  Updating monitoring..."
cp -r "${MONOREPO_DIR}/monitoring" "${INFRA_TARGET}/" 2>/dev/null || true
cp -r "${MONOREPO_DIR}/docker" "${INFRA_TARGET}/" 2>/dev/null || true

# Commit and push
git add -A
if git diff --cached --quiet; then
    echo "  Infrastructure already up to date."
else
    git commit -m "feat: multi-env deployment infra (dev/qa/prod)

- Add docker-compose.qa.yml for QA environment
- Fix docker-compose.prod.yml: restart policies, resource limits, nginx proxy
- Make deploy.sh/rollback.sh environment-aware (3rd param: dev|qa|prod)
- Add per-environment .env templates (.env.dev, .env.qa, .env.prod)
- Add nginx reverse proxy with rate limiting, gzip, security headers"
    echo "  Committed infrastructure updates."
fi

echo "  Pushing main..."
git push origin main 2>&1 || echo "  WARNING: main push failed"

echo "  Creating develop branch..."
git branch develop 2>/dev/null || true
git push origin develop 2>&1 || echo "  WARNING: develop push failed"

echo "  Creating qa branch..."
git branch qa 2>/dev/null || true
git push origin qa 2>&1 || echo "  WARNING: qa push failed"

SUCCESS=$((SUCCESS + 1))
cd "${MONOREPO_DIR}"

# ---- Summary ----
echo ""
echo "============================================"
echo "  Update Summary"
echo "============================================"
echo "  Total:     ${TOTAL}"
echo "  Success:   ${SUCCESS}"
echo "  Failed:    ${FAILED}"
echo "  Temp dir:  ${WORK_DIR}"
echo ""
echo "  Each repo now has: main, develop, qa branches"
echo "  Clean up: rm -rf ${WORK_DIR}"
echo ""
