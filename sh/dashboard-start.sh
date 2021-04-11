#!/bin/bash

# Create a common network that all containers that need to communicate with another container will join.
docker network create common-network

# Run the dashboard application in a container based on created Docker image.
# Exposes the containers port 3000 to port 3000 on the host for the front-end.
# When starting and stopping experiments from the application, Docker commands need to run on the host,
# therefore we mount the host's Docker socket into the container so Docker commands can run on the host from within the container.
# The Dashboard Docker image is based on the Docker in Docker image so the container will have Docker installed.
docker run -d \
--name dashboard-app \
-p 3000:3000 \
-v /var/run/docker.sock:/var/run/docker.sock \
--net common-network \
dashboard-app-image
