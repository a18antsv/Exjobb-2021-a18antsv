#!/bin/bash

# Removes all images that often needs to be rebuilt
docker rmi dashboard-app-image
docker rmi kafka-consumer-image
docker rmi kafka-producer-image
docker rmi rabbitmq-consumer-image
docker rmi rabbitmq-producer-image
