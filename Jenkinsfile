pipeline {
    agent any

    environment {
        // Registry configuration
        DOCKER_REGISTRY = 'your-docker-registry.com'
        DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
        
        // Versioning
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
        LATEST_TAG = "latest"
        
        // Notification
        SLACK_CHANNEL = '#deployments'
    }

    options {
        // Keep only the last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Abort the pipeline if it's stuck for a long time
        timeout(time: 1, unit: 'HOURS')
        // Add timestamps to the console output
        timestamps()
        // Disable concurrent builds for main branch
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Code Quality & Tests') {
            steps {
                echo "Skipping native local tests. In this architecture, all linting and test validations are integrated into the multi-stage Dockerfile builds. If tests fail, the Docker build will automatically fail."
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    def services = [
                        'api-gateway': './services/api-gateway',
                        'user-service': './services/user-service',
                        'restaurant-service': './services/restaurant-service',
                        'order-service': './services/order-service',
                        'delivery-service': './services/delivery-service',
                        'payment-service': './services/payment-service',
                        'notification-service': './services/notification-service',
                        'chat-service': './services/chat-service',
                        'frontend-customer': './frontend-customer',
                        'frontend-restaurant': './frontend-restaurant',
                        'frontend-driver': './frontend-driver',
                        'frontend-agent': './frontend-agent',
                        'health-check-ui': './health-check-ui'
                    ]

                    // Build in parallel for speed
                    def buildTasks = [:]
                    services.each { name, path ->
                        buildTasks[name] = {
                            echo "Building ${name}..."
                            sh "docker build -t ${DOCKER_REGISTRY}/zomato-${name}:${IMAGE_TAG} -t ${DOCKER_REGISTRY}/zomato-${name}:${LATEST_TAG} ${path}"
                        }
                    }
                    parallel buildTasks
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                script {
                    withDockerRegistry(credentialsId: DOCKER_CREDENTIALS_ID, url: "https://${DOCKER_REGISTRY}") {
                        def services = [
                            'api-gateway', 'user-service', 'restaurant-service', 'order-service',
                            'delivery-service', 'payment-service', 'notification-service', 'chat-service',
                            'frontend-customer', 'frontend-restaurant', 'frontend-driver', 'frontend-agent',
                            'health-check-ui'
                        ]
                        
                        def pushTasks = [:]
                        services.each { name ->
                            pushTasks[name] = {
                                echo "Pushing ${name}..."
                                sh "docker push ${DOCKER_REGISTRY}/zomato-${name}:${IMAGE_TAG}"
                                sh "docker push ${DOCKER_REGISTRY}/zomato-${name}:${LATEST_TAG}"
                            }
                        }
                        parallel pushTasks
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Deploying to production environment..."
                    // In a highly production-grade setup, you'd trigger a deployment tool like ArgoCD (for k8s), 
                    // or Ansible/SSH for a standalone docker server. 
                    // Example with remote SSH and docker-compose:
                    /*
                    sshagent(['production-ssh-key']) {
                        sh """
                            scp docker-compose.prod.yml user@prod-server:/opt/zomato/docker-compose.yml
                            ssh user@prod-server 'cd /opt/zomato && export IMAGE_TAG=${IMAGE_TAG} && docker-compose pull && docker-compose up -d'
                        """
                    }
                    */
                    
                    // As a local simulation, we apply docker-compose up directly if Jenkins has socket mapped
                    // we replace the 'build' in compose with image tag
                    echo "Please configure deployment target here. e.g. SSH into remote server."
                }
            }
        }
    }

    post {
        always {
            // Clean up workspace
            cleanWs()
            // Cleanup dangling images to free up space
            sh 'docker system prune -f || true'
        }
        success {
            echo "Pipeline succeeded!"
            // slackSend color: 'good', channel: SLACK_CHANNEL, message: "SUCCESS: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' deployed to Production. Details at: ${env.BUILD_URL}"
        }
        failure {
            echo "Pipeline failed."
            // slackSend color: 'danger', channel: SLACK_CHANNEL, message: "FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' failed. Details at: ${env.BUILD_URL}"
        }
    }
}
