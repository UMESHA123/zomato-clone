# Zomato Platform — Production CI/CD Setup Guide

## Architecture

```
  Developer pushes code to a service repo
           │
           ▼ (GitHub Webhook)
  ┌───────────────────────────────────────────────────────┐
  │                    JENKINS SERVER                      │
  │                                                       │
  │  Per-service pipeline (13 jobs total):                 │
  │                                                       │
  │  ┌─ Checkout                                          │
  │  ├─ Unit Tests + Coverage (JaCoCo / Istanbul)         │
  │  ├─ Quality Checks (Lint, Type Check, npm audit)      │
  │  ├─ Code Quality Gate (SonarQube — optional)          │
  │  ├─ Build Artifact (JAR / dist)                       │
  │  ├─ Docker Build (BuildKit, OCI labels, layer cache)  │
  │  ├─ Security Scan (Trivy — fails on CRITICAL)         │
  │  ├─ Push Image (retry x3)                             │
  │  ├─ Deploy to Staging (auto on main)                  │
  │  ├─ Smoke Tests (health check verification)           │
  │  ├─ Manual Approval Gate (1hr timeout)                │
  │  ├─ Deploy to Production                              │
  │  └─ Tag Release (git tag v{build}-{commit})           │
  │                                                       │
  │  Branch strategy:                                     │
  │    feature/* → test + build only                      │
  │    main      → test + build + push + deploy           │
  └───────────┬───────────────────────────────────────────┘
              │
  ┌───────────┴───────────────────────────────────────────┐
  │              Docker Hub (umesa123)                      │
  │  umesa123/zomato-{service}:{build}-{commit}            │
  └───────────┬───────────────────────────────────────────┘
              │ deploy.sh pulls + restarts + health checks
  ┌───────────┴───────────────────────────────────────────┐
  │              Production Server                         │
  │  docker-compose.prod.yml                               │
  │  Phase 1: Backend services (ordered)                   │
  │  Phase 2: Frontend services                            │
  │  Health checks verified after each deploy              │
  │  Audit log: /opt/zomato/logs/deploy-YYYYMMDD.log       │
  └───────────────────────────────────────────────────────┘
```

---

## Step-by-Step Setup

### STEP 1: Generate GitHub Token

1. Go to https://github.com/settings/tokens
2. **Generate new token (classic)** with `repo` scope
3. Copy the token

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### STEP 2: Create 14 GitHub Repos

```bash
cd /path/to/zomato-clone
bash cicd/scripts/1-create-repos.sh
```

Creates:

| Repo | Type | Port |
|------|------|------|
| `zomato-api-gateway` | Spring Boot | 8080 |
| `zomato-user-service` | Spring Boot | 8081 |
| `zomato-restaurant-service` | Spring Boot | 8082 |
| `zomato-order-service` | Spring Boot | 8083 |
| `zomato-delivery-service` | Express/TS | 8084 |
| `zomato-payment-service` | Express/TS | 8085 |
| `zomato-notification-service` | Express/TS | 8086 |
| `zomato-chat-service` | Express/TS | 8087 |
| `zomato-frontend-customer` | Next.js | 3000 |
| `zomato-frontend-restaurant` | Next.js | 3001 |
| `zomato-frontend-driver` | Next.js | 3002 |
| `zomato-frontend-agent` | Next.js | 3003 |
| `zomato-health-check-ui` | Express/TS | 3004 |
| `zomato-infrastructure` | Config | — |

### STEP 3: Split Monorepo & Push

```bash
bash cicd/scripts/2-split-and-push.sh
```

Each repo gets:
- Source code from the monorepo
- Production `Jenkinsfile` (type-specific)
- `.gitignore` (language-specific)
- `.dockerignore` (language-specific)

### STEP 4: Install Jenkins Plugins

**Manage Jenkins → Plugins → Available:**

| Plugin | Required For |
|--------|-------------|
| Docker Pipeline | `withDockerRegistry()` |
| GitHub Integration | Webhook triggers |
| Pipeline | Jenkinsfile support |
| Credentials Binding | `credentials()` |
| SSH Agent | `sshagent()` deploys |
| JUnit | Test report publishing |
| JaCoCo | Java coverage reports |
| Cobertura | Node.js coverage reports |
| NodeJS | `tools { nodejs }` |
| Timestamper | `timestamps()` |
| Slack Notification | (Optional) alerts |

### STEP 5: Configure Jenkins Global Tools

**Manage Jenkins → Tools:**

| Tool | Name | Version |
|------|------|---------|
| JDK | `jdk-21` | OpenJDK 21 |
| NodeJS | `node-22` | 22.x LTS |

### STEP 6: Add Jenkins Credentials

**Manage Jenkins → Credentials → System → Global → Add Credentials:**

| ID | Kind | Purpose |
|----|------|---------|
| `docker-registry-credentials` | Username + Password | Docker Hub (user: `umesa123`) |
| `staging-ssh-key` | SSH Username + Private Key | SSH to staging server |
| `production-ssh-key` | SSH Username + Private Key | SSH to prod server |
| `sonarqube-url` | Secret text | SonarQube URL (optional) |

### STEP 7: Create Jenkins Pipeline Jobs

For each of the 13 service repos:

1. **New Item** → name: `zomato-{service-name}` → **Multibranch Pipeline**
2. **Branch Sources → GitHub:**
   - Repo URL: `https://github.com/UMESHA123/zomato-{service-name}`
   - Credentials: GitHub PAT
3. **Build Configuration:**
   - Mode: by Jenkinsfile
   - Path: `Jenkinsfile`
4. **Scan Triggers:** Periodically if not otherwise run → 1 minute
5. **Save**

### STEP 8: GitHub Webhooks

For each repo on GitHub:

1. **Settings → Webhooks → Add webhook**
2. Payload URL: `http://<jenkins-url>/github-webhook/`
3. Content type: `application/json`
4. Events: Push
5. Active: Yes

> If Jenkins is local, expose via ngrok:
> ```bash
> ngrok http 8080
> ```

### STEP 9: Production Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Create deployment directory
sudo mkdir -p /opt/zomato
sudo chown $USER:$USER /opt/zomato

# Clone infrastructure repo
cd /opt/zomato
git clone https://github.com/UMESHA123/zomato-infrastructure.git .

# Configure environment
cp .env.example .env
nano .env    # Set real passwords, secrets, API keys

# Initial deployment
chmod +x deploy.sh rollback.sh
./deploy.sh all latest

# Verify
docker compose -f docker-compose.prod.yml ps
```

### STEP 10: Install Trivy (on Jenkins agent)

```bash
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
trivy --version
```

### STEP 11: SonarQube (Optional)

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
# Login: admin/admin → change password
# Add URL as Jenkins credential ID: sonarqube-url
```

---

## What Each Jenkinsfile Does

### Java Services (api-gateway, user, restaurant, order)

```
Checkout → Unit Tests + JaCoCo Coverage → SonarQube (if configured)
    → Build JAR → Docker Build (BuildKit + OCI labels + layer cache)
    → Trivy Scan (CRITICAL = fail) → Push (retry x3)
    → Deploy Staging → Smoke Tests → Manual Approval → Deploy Prod
    → Git Tag Release
```

### Node Services (delivery, payment, notification, chat)

```
Checkout → Install (npm ci --prefer-offline)
    → [Parallel: Lint + npm audit] → Unit Tests + Coverage
    → Build → Docker Build → Trivy Scan → Push (retry x3)
    → Deploy Staging → Smoke Tests → Manual Approval → Deploy Prod
    → Git Tag Release
```

### Frontends (customer, restaurant, driver, agent)

```
Checkout → Install
    → [Parallel: Lint + TypeScript Check + npm audit]
    → Unit Tests + Coverage → Next.js Build
    → Docker Build → Trivy Scan → Push (retry x3)
    → Deploy Staging → Smoke Tests → Manual Approval → Deploy Prod
    → Git Tag Release
```

---

## deploy.sh Features

- **Phased deployment:** backends first, then frontends
- **Health checks:** waits up to 60s for each service to respond 200
- **Audit logging:** every deploy logged to `/opt/zomato/logs/deploy-YYYYMMDD.log`
- **Service validation:** rejects unknown service names
- **Docker Compose v1/v2:** auto-detects which is installed
- **Cleanup:** prunes dangling images after deploy
- **Failure report:** lists all failed services at the end

## rollback.sh Features

- **Confirmation prompt:** requires typing "yes" to proceed
- **Image listing:** `./rollback.sh --list user-service` shows available tags
- **Updates .env:** fixes the env file so compose uses the correct tag
- **Health verification:** checks service is healthy after rollback
- **Audit logging:** rollbacks are logged separately

---

## Production Best Practices Checklist

| Practice | Implementation |
|----------|---------------|
| Independent deployability | Each service = own repo + own pipeline |
| Immutable artifacts | Tag: `{build#}-{commit7}`, never overwrite |
| Security scanning | Trivy fails build on CRITICAL CVEs |
| Dependency auditing | `npm audit` on every Node.js build |
| Test coverage | JaCoCo (Java) / Istanbul (Node.js) |
| Code quality gate | SonarQube with quality gate wait |
| Manual prod approval | `input` stage, 1hr timeout, named approvers |
| Branch protection | Push image only on `main`/`develop` |
| Abort stale builds | `disableConcurrentBuilds(abortPrevious: true)` |
| Docker layer caching | `--cache-from` previous latest image |
| OCI image labels | Standard labels: created, version, revision, source |
| Retry on network | `retry(3)` on Docker push |
| Phased deployment | Backends → Frontends (ordered) |
| Health verification | Post-deploy health checks with timeout |
| Audit trail | Timestamped deploy/rollback logs |
| Rollback capability | One-command rollback with confirmation |
| Secret management | `.env` never in git, Jenkins credentials |
| Artifact archiving | JARs, Trivy reports, audit reports in Jenkins |
| Release tagging | Git tags on successful production deploy |
| Parallel quality checks | Lint + audit + type check run simultaneously |
