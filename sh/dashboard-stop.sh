#!/bin/bash

# Forcefully remove the container even if it is currently running
docker rm -f dashboard-app

# Remove the common network
docker network rm common-network
