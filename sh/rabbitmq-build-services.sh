#!/bin/bash

# Build RabbitMQ consumer Docker image
docker build -t rabbitmq-consumer-image -f ./rabbitmq/consumer-service/Dockerfile .

# Build RabbitMQ producer Docker image
docker build -t rabbitmq-producer-image -f ./rabbitmq/producer-service/Dockerfile .
