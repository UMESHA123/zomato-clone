# Zomato Microservices CI/CD Pipeline Setup

This repository is now equipped with a production-grade Continuous Integration and Continuous Deployment (CI/CD) pipeline built using Jenkins and Docker. The pipeline is designed specifically for microservice architectures.

## Architecture & Workflow

The CI/CD pipeline accomplishes the following tasks in sequence:
1. **Checkout**: Fetches the latest code from your configured Git branch.
2. **Code Quality & Tests**: Spawns parallel stages to install dependencies and run linting/testing strictly across all specific microservices (Frontend UI layers and Backend services).
3. **Build Docker Images**: Leveraging Docker Compose / Docker Buildkit, it builds optimal parallel container images for each of the 13+ services running in your application infrastructure.
4. **Push Docker Images**: Connects to your internal or external Docker Registry and pushes tagged versioned images (e.g., using `${BUILD_NUMBER}-${GIT_COMMIT}`) alongside a `latest` tag.
5. **Deploy to Production**: Updates the production environment targeting an execution of `docker-compose.prod.yml` matching the successful deployment tags.

## New Files Created

1. **`Jenkinsfile`**: Contains the Groovy pipeline instructions mapping exactly how a deployment pipeline triggers, tests, and deploys every single piece.
2. **`docker-compose.prod.yml`**: A production-grade `docker-compose` specification. Unlike the local file (which performs builds from context folders), this file solely references pre-built images inside your internal container registry and avoids unnecessary development volume mounts.
3. **`jenkins/Dockerfile`**: A Docker container definition that uses `jenkins/jenkins:lts` as a base but explicitly installs Docker CE tools to run "Docker out of Docker".
4. **`jenkins/docker-compose.yml`**: Designed for spinning up your Jenkins automation engine quickly if you plan to self-host inside the target environment.

## Running the CI/CD Pipeline locally

If you would like to run and review the Jenkins pipeline locally, follow these steps:

1. **Launch the Jenkins Server**:
   ```bash
   cd jenkins
   docker-compose up -d
   ```
2. **Setup Jenkins**: 
   - Wait ~1 minute. Open your browser and navigate to `http://localhost:8089/jenkins`
   - Retrieve the unlock key via terminal using: `docker exec zomato-ci-jenkins cat /var/jenkins_home/secrets/initialAdminPassword`
   - Install the Suggested Plugins.
3. **Add Credentials**: Ensure to add credentials ID named `docker-registry-credentials` into your Jenkins credentials manager containing a Username/Password payload for Dockerhub, AWS ECR, or whatever your chosen registry might be.
4. **Create Pipeline**:
   - Create a New Item > Pipeline.
   - For definition, use **Pipeline script from SCM**, specifying your system's Git repo.
   - Ensure the Script path is targeted to `Jenkinsfile`.
5. **Run the Build!** 

## Customizing The Pipeline

### Variables
Open the `Jenkinsfile` to freely customize key environment values such as:
- `DOCKER_REGISTRY` -> Points to your registry endpoint (e.g. `docker.io/yourusername` or `.dkr.ecr...`)
- `SLACK_CHANNEL` -> The endpoint space for Jenkins to post CI updates.

### Production Environment
The Production Deployment stage simulates triggering an SSH update or updating a cluster. You can customize the `Deploy to Production` stage towards triggering `kubect app` config bumps, Ansible plays, or simply executing `docker-compose up` via a `docker context`.
