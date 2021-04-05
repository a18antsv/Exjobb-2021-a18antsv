#!/bin/bash

# Builds a Docker image for the dashboard application
docker build -t dashboard-app-image -f ./dashboard/Dockerfile .
