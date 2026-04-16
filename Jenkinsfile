pipeline {
    agent any

    environment {
        DOCKER_REGISTRY     = 'docker.io/umesa123'
        DOCKER_CREDS        = 'docker-registry-credentials'
        DOCKER_BUILDKIT     = '1'
        IMAGE_TAG           = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 2, unit: 'HOURS')
        timestamps()
        disableConcurrentBuilds()
    }

    stages {

        // ==================== CHECKOUT ====================
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_AUTHOR = sh(script: "git log -1 --pretty=format:'%an'", returnStdout: true).trim()
                    env.GIT_MSG    = sh(script: "git log -1 --pretty=format:'%s'",  returnStdout: true).trim()
                    env.GIT_SHORT  = env.GIT_COMMIT.take(7)

                    // Determine target environment from branch
                    if (env.BRANCH_NAME == 'main') {
                        env.DEPLOY_ENV = 'prod'
                    } else if (env.BRANCH_NAME == 'develop') {
                        env.DEPLOY_ENV = 'dev'
                    } else if (env.BRANCH_NAME?.startsWith('release/') || env.BRANCH_NAME == 'qa') {
                        env.DEPLOY_ENV = 'qa'
                    } else {
                        env.DEPLOY_ENV = 'none'
                    }

                    // Environment-prefixed image tag: dev-42-abc1234
                    env.ENV_IMAGE_TAG = (env.DEPLOY_ENV != 'none')
                        ? "${env.DEPLOY_ENV}-${IMAGE_TAG}"
                        : IMAGE_TAG

                    echo "Branch: ${env.BRANCH_NAME} | Env: ${env.DEPLOY_ENV} | Tag: ${env.ENV_IMAGE_TAG}"
                }
            }
        }

        // ==================== BUILD & TEST (parallel per service type) ====================
        stage('Build & Test') {
            parallel {
                stage('Java Services') {
                    steps {
                        script {
                            def javaServices = [
                                'api-gateway':          './services/api-gateway',
                                'user-service':         './services/user-service',
                                'restaurant-service':   './services/restaurant-service',
                                'order-service':        './services/order-service'
                            ]
                            def tasks = [:]
                            javaServices.each { name, path ->
                                tasks[name] = {
                                    dir(path) {
                                        sh 'chmod +x mvnw 2>/dev/null || true'
                                        sh './mvnw clean verify -B -q || mvn clean verify -B -q'
                                    }
                                }
                            }
                            parallel tasks
                        }
                    }
                }
                stage('Node Services') {
                    steps {
                        script {
                            def nodeServices = [
                                'delivery-service':     './services/delivery-service',
                                'payment-service':      './services/payment-service',
                                'notification-service':  './services/notification-service',
                                'chat-service':         './services/chat-service'
                            ]
                            def tasks = [:]
                            nodeServices.each { name, path ->
                                tasks[name] = {
                                    dir(path) {
                                        sh 'npm ci --prefer-offline'
                                        sh 'npm run lint 2>/dev/null || true'
                                        sh 'npm test 2>/dev/null || true'
                                        sh 'npm run build'
                                    }
                                }
                            }
                            parallel tasks
                        }
                    }
                }
                stage('Frontends') {
                    steps {
                        script {
                            def frontends = [
                                'frontend-customer':    './frontend-customer',
                                'frontend-restaurant':  './frontend-restaurant',
                                'frontend-driver':      './frontend-driver',
                                'frontend-agent':       './frontend-agent',
                                'health-check-ui':      './health-check-ui'
                            ]
                            def tasks = [:]
                            frontends.each { name, path ->
                                tasks[name] = {
                                    dir(path) {
                                        sh 'npm ci --prefer-offline'
                                        sh 'npm run lint 2>/dev/null || true'
                                        sh 'npm test 2>/dev/null || true'
                                        sh 'npm run build'
                                    }
                                }
                            }
                            parallel tasks
                        }
                    }
                }
            }
        }

        // ==================== DOCKER BUILD (all services) ====================
        stage('Docker Build') {
            steps {
                script {
                    def allServices = [
                        'api-gateway':          './services/api-gateway',
                        'user-service':         './services/user-service',
                        'restaurant-service':   './services/restaurant-service',
                        'order-service':        './services/order-service',
                        'delivery-service':     './services/delivery-service',
                        'payment-service':      './services/payment-service',
                        'notification-service': './services/notification-service',
                        'chat-service':         './services/chat-service',
                        'frontend-customer':    './frontend-customer',
                        'frontend-restaurant':  './frontend-restaurant',
                        'frontend-driver':      './frontend-driver',
                        'frontend-agent':       './frontend-agent',
                        'health-check-ui':      './health-check-ui'
                    ]

                    def buildTasks = [:]
                    allServices.each { name, path ->
                        buildTasks[name] = {
                            def fullImage = "${DOCKER_REGISTRY}/zomato-${name}"
                            sh """
                                docker build \
                                    --label org.opencontainers.image.created=\$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
                                    --label org.opencontainers.image.version=${env.ENV_IMAGE_TAG} \
                                    --label org.opencontainers.image.revision=${env.GIT_COMMIT} \
                                    --label org.opencontainers.image.title=zomato-${name} \
                                    --cache-from ${fullImage}:latest \
                                    -t ${fullImage}:${env.ENV_IMAGE_TAG} \
                                    -t ${fullImage}:latest \
                                    ${path}
                            """
                        }
                    }
                    parallel buildTasks
                }
            }
        }

        // ==================== SECURITY SCAN ====================
        stage('Security Scan') {
            steps {
                script {
                    def trivyInstalled = sh(script: 'which trivy', returnStatus: true) == 0
                    if (!trivyInstalled) {
                        echo "WARNING: Trivy not installed — skipping security scan"
                        return
                    }

                    def services = [
                        'api-gateway', 'user-service', 'restaurant-service', 'order-service',
                        'delivery-service', 'payment-service', 'notification-service', 'chat-service',
                        'frontend-customer', 'frontend-restaurant', 'frontend-driver', 'frontend-agent',
                        'health-check-ui'
                    ]

                    def scanTasks = [:]
                    services.each { name ->
                        scanTasks[name] = {
                            def fullImage = "${DOCKER_REGISTRY}/zomato-${name}:${env.ENV_IMAGE_TAG}"
                            sh """
                                trivy image --severity HIGH,CRITICAL \
                                    --format json --output trivy-${name}.json \
                                    ${fullImage} || true
                            """
                            // Fail on CRITICAL only
                            sh """
                                trivy image --severity CRITICAL \
                                    --exit-code 1 --format table \
                                    ${fullImage}
                            """
                        }
                    }
                    parallel scanTasks
                    archiveArtifacts artifacts: 'trivy-*.json', allowEmptyArchive: true
                }
            }
        }

        // ==================== PUSH IMAGES ====================
        stage('Push Images') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    branch pattern: 'release/.*', comparator: 'REGEXP'
                    branch 'qa'
                }
            }
            steps {
                script {
                    def services = [
                        'api-gateway', 'user-service', 'restaurant-service', 'order-service',
                        'delivery-service', 'payment-service', 'notification-service', 'chat-service',
                        'frontend-customer', 'frontend-restaurant', 'frontend-driver', 'frontend-agent',
                        'health-check-ui'
                    ]

                    retry(3) {
                        withDockerRegistry(credentialsId: DOCKER_CREDS, url: 'https://index.docker.io/v1/') {
                            def pushTasks = [:]
                            services.each { name ->
                                pushTasks[name] = {
                                    def fullImage = "${DOCKER_REGISTRY}/zomato-${name}"
                                    sh "docker push ${fullImage}:${env.ENV_IMAGE_TAG}"
                                    sh "docker push ${fullImage}:latest"
                                }
                            }
                            parallel pushTasks
                        }
                    }
                }
            }
        }

        // ==================== DEPLOY TO DEV ====================
        stage('Deploy to Dev') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    echo "Deploying all services to DEV (tag: ${env.ENV_IMAGE_TAG})..."
                    sshagent(['dev-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no deployer@\${DEV_SERVER} \
                                'cd /opt/zomato && ./deploy.sh all ${env.ENV_IMAGE_TAG} dev'
                        """
                    }
                }
            }
        }

        // ==================== DEPLOY TO QA ====================
        stage('Deploy to QA') {
            when {
                anyOf {
                    branch pattern: 'release/.*', comparator: 'REGEXP'
                    branch 'qa'
                }
            }
            steps {
                script {
                    echo "Deploying all services to QA (tag: ${env.ENV_IMAGE_TAG})..."
                    sshagent(['qa-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no deployer@\${QA_SERVER} \
                                'cd /opt/zomato && ./deploy.sh all ${env.ENV_IMAGE_TAG} qa'
                        """
                    }
                }
            }
        }

        // ==================== QA SMOKE TESTS ====================
        stage('QA Smoke Tests') {
            when {
                anyOf {
                    branch pattern: 'release/.*', comparator: 'REGEXP'
                    branch 'qa'
                }
            }
            steps {
                script {
                    echo "Running smoke tests against QA..."
                    retry(5) {
                        sleep(time: 10, unit: 'SECONDS')
                        sh """
                            HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' \
                                --max-time 10 http://\${QA_SERVER}:8080/actuator/health)
                            if [ "\$HTTP_CODE" != "200" ]; then
                                echo "QA health check returned \$HTTP_CODE"
                                exit 1
                            fi
                            echo "QA smoke test passed (HTTP \$HTTP_CODE)"
                        """
                    }
                }
            }
        }

        // ==================== DEPLOY TO STAGING (pre-prod) ====================
        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Deploying all services to STAGING (tag: ${env.ENV_IMAGE_TAG})..."
                    sshagent(['staging-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no deployer@\${STAGING_SERVER} \
                                'cd /opt/zomato && ./deploy.sh all ${env.ENV_IMAGE_TAG} prod'
                        """
                    }
                }
            }
        }

        // ==================== STAGING SMOKE TESTS ====================
        stage('Staging Smoke Tests') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Running smoke tests against staging..."
                    def endpoints = [
                        "http://\${STAGING_SERVER}:8080/actuator/health",
                        "http://\${STAGING_SERVER}:8081/actuator/health",
                        "http://\${STAGING_SERVER}:3000/"
                    ]
                    endpoints.each { url ->
                        retry(5) {
                            sleep(time: 10, unit: 'SECONDS')
                            sh """
                                HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 ${url})
                                if [ "\$HTTP_CODE" != "200" ]; then
                                    echo "Smoke test failed for ${url} (HTTP \$HTTP_CODE)"
                                    exit 1
                                fi
                                echo "Passed: ${url}"
                            """
                        }
                    }
                }
            }
        }

        // ==================== PRODUCTION APPROVAL ====================
        stage('Production Approval') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 2, unit: 'HOURS') {
                    input message: "Deploy ${env.ENV_IMAGE_TAG} to PRODUCTION?",
                          ok: 'Approve & Deploy',
                          submitter: 'admin,deployer',
                          parameters: [
                              string(name: 'APPROVER_NOTE', defaultValue: '', description: 'Reason for approval')
                          ]
                }
            }
        }

        // ==================== DEPLOY TO PRODUCTION ====================
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Deploying all services to PRODUCTION (tag: ${env.ENV_IMAGE_TAG})..."
                    sshagent(['production-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no deployer@\${PROD_SERVER} \
                                'cd /opt/zomato && ./deploy.sh all ${env.ENV_IMAGE_TAG} prod'
                        """
                    }
                }
            }
        }

        // ==================== PRODUCTION SMOKE TESTS ====================
        stage('Production Smoke Tests') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Verifying production deployment..."
                    retry(5) {
                        sleep(time: 10, unit: 'SECONDS')
                        sh """
                            HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' \
                                --max-time 10 http://\${PROD_SERVER}:8080/actuator/health)
                            if [ "\$HTTP_CODE" != "200" ]; then
                                echo "Production health check failed (HTTP \$HTTP_CODE)"
                                exit 1
                            fi
                            echo "Production is healthy"
                        """
                    }
                }
            }
        }

        // ==================== TAG RELEASE ====================
        stage('Tag Release') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sh """
                        git tag -a "v${IMAGE_TAG}" -m "Production release ${IMAGE_TAG}"
                        git push origin "v${IMAGE_TAG}" || true
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'docker system prune -f || true'
            cleanWs()
        }
        success {
            echo "SUCCESS: ${env.DEPLOY_ENV} | ${env.ENV_IMAGE_TAG} | ${env.GIT_MSG} | by ${env.GIT_AUTHOR}"
            // slackSend color: 'good', channel: '#deployments',
            //     message: "*${env.DEPLOY_ENV}* `${env.ENV_IMAGE_TAG}` — SUCCESS\n> ${env.GIT_MSG}\n> <${env.BUILD_URL}|View Build>"
        }
        failure {
            echo "FAILED: ${env.DEPLOY_ENV} | ${env.ENV_IMAGE_TAG} | ${env.GIT_MSG} | by ${env.GIT_AUTHOR}"
            // slackSend color: 'danger', channel: '#deployments',
            //     message: "*${env.DEPLOY_ENV}* — FAILED\n> ${env.GIT_MSG}\n> <${env.BUILD_URL}|View Build>"
        }
    }
}
