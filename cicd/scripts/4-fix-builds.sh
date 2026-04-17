#!/bin/bash
#
# Step 4: Fix build failures across all repos
#
# Fixes:
#   1. Add Maven/NodeJS tools block to Jenkinsfiles
#   2. Add JaCoCo Maven plugin to Java service pom.xml files
#   3. Fix api-gateway: use Node.js Jenkinsfile instead of Java
#
# Usage:
#   cd /path/to/zomato-clone
#   bash cicd/scripts/4-fix-builds.sh
#

set -euo pipefail

GITHUB_USER="UMESHA123"
MONOREPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="/tmp/zomato-fix-$(date +%s)"
JENKINSFILES_DIR="${MONOREPO_DIR}/cicd/jenkinsfiles"

echo "============================================"
echo "  Fixing Build Issues Across All Repos"
echo "  Source: ${MONOREPO_DIR}"
echo "  Temp:   ${WORK_DIR}"
echo "============================================"
echo ""

mkdir -p "${WORK_DIR}"

TOTAL=0
SUCCESS=0
FAILED=0

# JaCoCo plugin XML snippet to insert into pom.xml
JACOCO_PLUGIN='            <plugin>\
                <groupId>org.jacoco</groupId>\
                <artifactId>jacoco-maven-plugin</artifactId>\
                <version>0.8.12</version>\
                <executions>\
                    <execution>\
                        <goals>\
                            <goal>prepare-agent</goal>\
                        </goals>\
                    </execution>\
                    <execution>\
                        <id>report</id>\
                        <phase>test</phase>\
                        <goals>\
                            <goal>report</goal>\
                        </goals>\
                    </execution>\
                </executions>\
            </plugin>'

# ---- Fix a service repo ----
fix_repo() {
    local SERVICE_NAME="$1"
    local JENKINSFILE_TYPE="$2"   # java-service | node-service | frontend
    local ADD_JACOCO="$3"         # yes | no
    local REPO_NAME="zomato-${SERVICE_NAME}"
    local TARGET="${WORK_DIR}/${REPO_NAME}"
    TOTAL=$((TOTAL + 1))

    echo ""
    echo "--- [${TOTAL}] ${REPO_NAME} (${JENKINSFILE_TYPE}, jacoco=${ADD_JACOCO}) ---"

    # Clone
    echo "  Cloning..."
    if ! git clone --quiet "https://github.com/${GITHUB_USER}/${REPO_NAME}.git" "${TARGET}" 2>&1; then
        echo "  ERROR: Failed to clone ${REPO_NAME}"
        FAILED=$((FAILED + 1))
        return 1
    fi

    cd "${TARGET}"

    # Update Jenkinsfile with tools block
    echo "  Updating Jenkinsfile (${JENKINSFILE_TYPE} + tools)..."
    cp "${JENKINSFILES_DIR}/Jenkinsfile.${JENKINSFILE_TYPE}" "${TARGET}/Jenkinsfile"

    # Replace placeholders
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|__SERVICE_NAME__|${SERVICE_NAME}|g" "${TARGET}/Jenkinsfile"
        sed -i '' "s|__REPO_NAME__|${REPO_NAME}|g" "${TARGET}/Jenkinsfile"
    else
        sed -i "s|__SERVICE_NAME__|${SERVICE_NAME}|g" "${TARGET}/Jenkinsfile"
        sed -i "s|__REPO_NAME__|${REPO_NAME}|g" "${TARGET}/Jenkinsfile"
    fi

    # Add JaCoCo to pom.xml if needed
    if [[ "${ADD_JACOCO}" == "yes" ]] && [[ -f "${TARGET}/pom.xml" ]]; then
        echo "  Adding JaCoCo plugin to pom.xml..."
        if ! grep -q "jacoco-maven-plugin" "${TARGET}/pom.xml"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "/<plugins>/a\\
${JACOCO_PLUGIN}
" "${TARGET}/pom.xml"
            else
                sed -i "/<plugins>/a\\${JACOCO_PLUGIN}" "${TARGET}/pom.xml"
            fi
        else
            echo "  JaCoCo already present — skipping."
        fi
    fi

    # Commit on main
    git add -A
    if git diff --cached --quiet; then
        echo "  Already up to date on main."
    else
        git commit -m "fix: add build tools config and JaCoCo for Jenkins CI

- Add Maven/NodeJS tools block to Jenkinsfile for auto-install
- Add JaCoCo Maven plugin for code coverage reporting (Java services)
- Fix api-gateway to use Node.js pipeline instead of Java"
        echo "  Committed fixes on main."
    fi

    # Push main
    echo "  Pushing main..."
    git push origin main 2>&1 || echo "  WARNING: main push failed"

    # Update develop branch
    echo "  Updating develop..."
    git checkout develop 2>/dev/null || git checkout -b develop
    git merge main --no-edit 2>&1 || echo "  WARNING: merge to develop had conflicts"
    git push origin develop 2>&1 || echo "  WARNING: develop push failed"

    # Update qa branch
    echo "  Updating qa..."
    git checkout qa 2>/dev/null || git checkout -b qa
    git merge main --no-edit 2>&1 || echo "  WARNING: merge to qa had conflicts"
    git push origin qa 2>&1 || echo "  WARNING: qa push failed"

    SUCCESS=$((SUCCESS + 1))
    cd "${MONOREPO_DIR}"
}

# ---- Java Services (need JaCoCo + Maven tool) ----
echo ""
echo "========== Java Services =========="
fix_repo "user-service"         "java-service"  "yes"
fix_repo "restaurant-service"   "java-service"  "yes"
fix_repo "order-service"        "java-service"  "yes"

# ---- Node Services (need NodeJS tool) ----
echo ""
echo "========== Node Services =========="
fix_repo "api-gateway"          "node-service"  "no"
fix_repo "delivery-service"     "node-service"  "no"
fix_repo "payment-service"      "node-service"  "no"
fix_repo "notification-service" "node-service"  "no"
fix_repo "chat-service"         "node-service"  "no"

# ---- Summary ----
echo ""
echo "============================================"
echo "  Fix Summary"
echo "============================================"
echo "  Total:     ${TOTAL}"
echo "  Success:   ${SUCCESS}"
echo "  Failed:    ${FAILED}"
echo "  Temp dir:  ${WORK_DIR}"
echo ""
echo "  Next: Re-trigger Jenkins builds to verify fixes"
echo "  Clean up: rm -rf ${WORK_DIR}"
echo ""
