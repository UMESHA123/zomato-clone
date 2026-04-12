#!/bin/bash
#
# Step 1: Create separate GitHub repos for each microservice
#
# Prerequisites:
#   - Generate a GitHub Personal Access Token (PAT) at: https://github.com/settings/tokens
#   - Token needs 'repo' scope (full control of private repositories)
#
# Usage:
#   export GITHUB_TOKEN="ghp_your_token_here"
#   bash 1-create-repos.sh
#

set -euo pipefail

GITHUB_USER="UMESHA123"
GITHUB_TOKEN="${GITHUB_TOKEN:?ERROR: Set GITHUB_TOKEN environment variable first}"
GITHUB_API="https://api.github.com"

# All repos to create
REPOS=(
    "zomato-api-gateway"
    "zomato-user-service"
    "zomato-restaurant-service"
    "zomato-order-service"
    "zomato-delivery-service"
    "zomato-payment-service"
    "zomato-notification-service"
    "zomato-chat-service"
    "zomato-frontend-customer"
    "zomato-frontend-restaurant"
    "zomato-frontend-driver"
    "zomato-frontend-agent"
    "zomato-health-check-ui"
    "zomato-infrastructure"
)

DESCRIPTIONS=(
    "API Gateway - Routes all frontend requests to microservices"
    "User Service - Authentication, profiles, JWT (Spring Boot + PostgreSQL)"
    "Restaurant Service - Menu management, reviews (Spring Boot + PostgreSQL)"
    "Order Service - Order lifecycle management (Spring Boot + PostgreSQL)"
    "Delivery Service - Driver tracking, assignment (Express + MongoDB)"
    "Payment Service - Payment processing (Express + PostgreSQL)"
    "Notification Service - Email, push notifications (Express + RabbitMQ)"
    "Chat Service - Real-time customer support (Express + Socket.IO + MongoDB)"
    "Customer Frontend - Customer-facing web app (Next.js)"
    "Restaurant Frontend - Restaurant owner portal (Next.js)"
    "Driver Frontend - Delivery driver app (Next.js)"
    "Agent Frontend - Support agent dashboard (Next.js)"
    "Health Check UI - Service health monitoring dashboard"
    "Infrastructure - Docker Compose, monitoring, deployment configs"
)

echo "============================================"
echo "  Creating ${#REPOS[@]} GitHub Repositories"
echo "  GitHub User: ${GITHUB_USER}"
echo "============================================"
echo ""

for i in "${!REPOS[@]}"; do
    REPO="${REPOS[$i]}"
    DESC="${DESCRIPTIONS[$i]}"

    echo -n "Creating ${REPO}... "

    HTTP_CODE=$(curl -s -o /tmp/gh_response.json -w "%{http_code}" \
        -X POST "${GITHUB_API}/user/repos" \
        -H "Authorization: token ${GITHUB_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${REPO}\",
            \"description\": \"${DESC}\",
            \"private\": false,
            \"auto_init\": false,
            \"has_issues\": true,
            \"has_projects\": false,
            \"has_wiki\": false
        }")

    if [ "$HTTP_CODE" = "201" ]; then
        echo "CREATED"
    elif [ "$HTTP_CODE" = "422" ]; then
        echo "ALREADY EXISTS (skipped)"
    else
        echo "FAILED (HTTP ${HTTP_CODE})"
        cat /tmp/gh_response.json
        echo ""
    fi
done

echo ""
echo "Done! All repos created under https://github.com/${GITHUB_USER}/"
echo ""
echo "Next step: Run ./2-split-and-push.sh to split the monorepo"
