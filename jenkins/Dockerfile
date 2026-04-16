FROM jenkins/jenkins:lts

USER root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    lsb-release \
    curl \
    jq \
    wget \
    unzip \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# ---- Docker CLI ----
RUN curl -fsSLo /usr/share/keyrings/docker-archive-keyring.asc \
    https://download.docker.com/linux/debian/gpg && \
    echo "deb [arch=$(dpkg --print-architecture) \
    signed-by=/usr/share/keyrings/docker-archive-keyring.asc] \
    https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

RUN apt-get update && apt-get install -y \
    docker-ce-cli \
    docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# ---- Trivy (container security scanner) ----
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# ---- JDK 21 (for Spring Boot services) ----
RUN apt-get update && apt-get install -y \
    openjdk-21-jdk-headless \
    && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# ---- Node.js 22 LTS (for Node services and frontends) ----
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# ---- Maven 3.9 (for Java builds) ----
ARG MAVEN_VERSION=3.9.9
RUN curl -fsSL https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
    | tar -xz -C /opt && \
    ln -s /opt/apache-maven-${MAVEN_VERSION}/bin/mvn /usr/local/bin/mvn

# Docker socket access — use a socket proxy in production
RUN groupadd -f docker && usermod -aG docker jenkins

USER jenkins

# ---- Jenkins Plugins ----
RUN jenkins-plugin-cli --plugins \
    "blueocean \
     docker-workflow \
     git \
     github \
     pipeline-stage-view \
     credentials-binding \
     ssh-agent \
     junit \
     jacoco \
     cobertura \
     nodejs \
     timestamper \
     pipeline-utility-steps \
     ws-cleanup \
     build-discarder \
     slack"
