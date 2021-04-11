#!/bin/bash

# Build Kafka consumer Docker image
docker build -t kafka-consumer-image -f ./kafka/consumer-service/Dockerfile .

# Build Kafka producer Docker image
docker build -t kafka-producer-image -f ./kafka/producer-service/Dockerfile .
