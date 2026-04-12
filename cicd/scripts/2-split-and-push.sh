#!/bin/bash
#
# Step 2: Split monorepo into separate repos and push each service
#
# This script:
#   1. Copies each service directory into a temp folder
#   2. Adds the production Jenkinsfile, .gitignore, .dockerignore
#   3. Initializes a git repo and pushes to GitHub
#
# Prerequisites:
#   - Run 1-create-repos.sh first
#   - Be in the root of the Zomato clone monorepo
#
# Usage:
#   cd /path/to/zomato-clone
#   bash cicd/scripts/2-split-and-push.sh
#

set -euo pipefail

GITHUB_USER="UMESHA123"
MONOREPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="/tmp/zomato-split-$(date +%s)"
JENKINSFILES_DIR="${MONOREPO_DIR}/cicd/jenkinsfiles"
TEMPLATES_DIR="${MONOREPO_DIR}/cicd/templates"

echo "============================================"
echo "  Splitting Monorepo into Separate Repos"
echo "  Source: ${MONOREPO_DIR}"
echo "  Temp:   ${WORK_DIR}"
echo "============================================"
echo ""

mkdir -p "${WORK_DIR}"

TOTAL=0
SUCCESS=0
FAILED=0

# ---- Helper function ----
split_and_push() {
    local SERVICE_NAME="$1"
    local SOURCE_PATH="$2"
    local JENKINSFILE_TYPE="$3"   # java-service | node-service | frontend
    local IGNORE_TYPE="$4"        # java | node
    local REPO_NAME="zomato-${SERVICE_NAME}"
    local TARGET="${WORK_DIR}/${REPO_NAME}"
    TOTAL=$((TOTAL + 1))

    echo ""
    echo "--- [${TOTAL}] ${REPO_NAME} ---"

    # Validate source exists
    if [ ! -d "${MONOREPO_DIR}/${SOURCE_PATH}" ]; then
        echo "  ERROR: Source path not found: ${SOURCE_PATH}"
        FAILED=$((FAILED + 1))
        return 1
    fi

    # Copy source
    echo "  Copying ${SOURCE_PATH} ..."
    cp -r "${MONOREPO_DIR}/${SOURCE_PATH}" "${TARGET}"

    # Add Jenkinsfile
    echo "  Adding Jenkinsfile (${JENKINSFILE_TYPE})..."
    cp "${JENKINSFILES_DIR}/Jenkinsfile.${JENKINSFILE_TYPE}" "${TARGET}/Jenkinsfile"

    # Replace placeholders
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|__SERVICE_NAME__|${SERVICE_NAME}|g" "${TARGET}/Jenkinsfile"
        sed -i '' "s|__REPO_NAME__|${REPO_NAME}|g" "${TARGET}/Jenkinsfile"
    else
        sed -i "s|__SERVICE_NAME__|${SERVICE_NAME}|g" "${TARGET}/Jenkinsfile"
        sed -i "s|__REPO_NAME__|${REPO_NAME}|g" "${TARGET}/Jenkinsfile"
    fi

    # Add .gitignore (only if not already present)
    if [ ! -f "${TARGET}/.gitignore" ]; then
        echo "  Adding .gitignore (${IGNORE_TYPE})..."
        cp "${TEMPLATES_DIR}/.gitignore.${IGNORE_TYPE}" "${TARGET}/.gitignore"
    fi

    # Add .dockerignore (only if not already present)
    if [ ! -f "${TARGET}/.dockerignore" ]; then
        echo "  Adding .dockerignore (${IGNORE_TYPE})..."
        cp "${TEMPLATES_DIR}/.dockerignore.${IGNORE_TYPE}" "${TARGET}/.dockerignore"
    fi

    # Remove any .env files that might have been copied
    find "${TARGET}" -name ".env" -delete 2>/dev/null || true
    find "${TARGET}" -name ".env.local" -delete 2>/dev/null || true

    # Initialize git and push
    cd "${TARGET}"
    git init -b main
    git add -A
    git commit -m "Initial commit: extract ${SERVICE_NAME} from monorepo

Extracted from https://github.com/${GITHUB_USER}/zomato-clone
Includes:
- Production Jenkins CI/CD pipeline
- Docker multi-stage build
- .gitignore and .dockerignore"

    git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

    if git push -u origin main 2>&1; then
        echo "  Pushed to https://github.com/${GITHUB_USER}/${REPO_NAME}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "  ERROR: Failed to push ${REPO_NAME}"
        FAILED=$((FAILED + 1))
    fi

    cd "${MONOREPO_DIR}"
}

# ---- Java Services (Spring Boot) ----
echo ""
echo "========== Java Services =========="
split_and_push "api-gateway"          "services/api-gateway"          "java-service"  "java"
split_and_push "user-service"         "services/user-service"         "java-service"  "java"
split_and_push "restaurant-service"   "services/restaurant-service"   "java-service"  "java"
split_and_push "order-service"        "services/order-service"        "java-service"  "java"

# ---- Node Services (Express + TypeScript) ----
echo ""
echo "========== Node Services =========="
split_and_push "delivery-service"     "services/delivery-service"     "node-service"  "node"
split_and_push "payment-service"      "services/payment-service"      "node-service"  "node"
split_and_push "notification-service" "services/notification-service" "node-service"  "node"
split_and_push "chat-service"         "services/chat-service"         "node-service"  "node"

# ---- Frontends (Next.js) ----
echo ""
echo "========== Frontends =========="
split_and_push "frontend-customer"    "frontend-customer"             "frontend"      "node"
split_and_push "frontend-restaurant"  "frontend-restaurant"           "frontend"      "node"
split_and_push "frontend-driver"      "frontend-driver"               "frontend"      "node"
split_and_push "frontend-agent"       "frontend-agent"                "frontend"      "node"

# ---- Health Check UI ----
echo ""
echo "========== Health Check UI =========="
split_and_push "health-check-ui"      "health-check-ui"               "node-service"  "node"

# ---- Infrastructure repo (special) ----
echo ""
echo "========== Infrastructure =========="
echo "--- zomato-infrastructure ---"
TOTAL=$((TOTAL + 1))
INFRA_TARGET="${WORK_DIR}/zomato-infrastructure"
mkdir -p "${INFRA_TARGET}"

# Copy infrastructure files
cp "${MONOREPO_DIR}/docker-compose.yml" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/docker-compose.prod.yml" "${INFRA_TARGET}/" 2>/dev/null || true
cp "${MONOREPO_DIR}/docker-compose.monitoring.yml" "${INFRA_TARGET}/" 2>/dev/null || true
cp -r "${MONOREPO_DIR}/docker" "${INFRA_TARGET}/" 2>/dev/null || true
cp -r "${MONOREPO_DIR}/monitoring" "${INFRA_TARGET}/" 2>/dev/null || true
cp -r "${MONOREPO_DIR}/cicd/infrastructure/"* "${INFRA_TARGET}/" 2>/dev/null || true

# Add infra .gitignore
cat > "${INFRA_TARGET}/.gitignore" <<'GITIGNORE'
.env
.env.local
*.pem
*.key
logs/
.DS_Store
GITIGNORE

cd "${INFRA_TARGET}"
git init -b main
git add -A
git commit -m "Initial commit: infrastructure configs for Zomato platform

Docker Compose, monitoring, deployment, and rollback scripts.
Extracted from https://github.com/${GITHUB_USER}/zomato-clone"

git remote add origin "https://github.com/${GITHUB_USER}/zomato-infrastructure.git"

if git push -u origin main 2>&1; then
    echo "  Pushed to https://github.com/${GITHUB_USER}/zomato-infrastructure"
    SUCCESS=$((SUCCESS + 1))
else
    echo "  ERROR: Failed to push zomato-infrastructure"
    FAILED=$((FAILED + 1))
fi

cd "${MONOREPO_DIR}"

# ---- Summary ----
echo ""
echo "============================================"
echo "  Split Summary"
echo "============================================"
echo "  Total:     ${TOTAL}"
echo "  Success:   ${SUCCESS}"
echo "  Failed:    ${FAILED}"
echo "  Temp dir:  ${WORK_DIR}"
echo ""

if [ ${FAILED} -gt 0 ]; then
    echo "  Some repos failed. Check output above."
    echo "  You can re-run this script — it will fail on existing repos."
    echo "  Delete and re-create failed repos, then re-run."
    exit 1
else
    echo "  All repos pushed successfully!"
    echo "  You can clean up: rm -rf ${WORK_DIR}"
fi

echo ""
echo "Next step: Set up Jenkins jobs (see PRODUCTION-SETUP.md)"
