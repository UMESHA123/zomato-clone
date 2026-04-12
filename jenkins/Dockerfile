FROM jenkins/jenkins:lts

USER root

# Install dependencies for Docker and build tools
RUN apt-get update && apt-get install -y \
    lsb-release \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Add Docker's official GPG key and repository
RUN curl -fsSLo /usr/share/keyrings/docker-archive-keyring.asc \
    https://download.docker.com/linux/debian/gpg && \
    echo "deb [arch=$(dpkg --print-architecture) \
    signed-by=/usr/share/keyrings/docker-archive-keyring.asc] \
    https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

# Install Docker CLI and Docker Compose Plugin
RUN apt-get update && apt-get install -y \
    docker-ce-cli \
    docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Add jenkins user to root group to enable socket access (temporary fix for development)
# In production, use tighter socket permissions or run a separate Docker socket proxy
RUN usermod -aG root jenkins

USER jenkins

# Install suggested Jenkins plugins
RUN jenkins-plugin-cli --plugins "blueocean docker-workflow git"
