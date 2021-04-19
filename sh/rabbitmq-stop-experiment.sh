#!/bin/bash

PRODUCERS=${1:-1} # The number of producer containers that should be stopped and removed
CONSUMERS=${2:-1} # The number of consumer containers that should be stopped and removed

# Remove all consumer containers by force
for ((i = 1; i <= $CONSUMERS; i++))
do
  docker rm -f rabbitmq-consumer-service-$i
done

# Remove all producer containers by force
for ((i = 1; i <= $PRODUCERS; i++))
do
  docker rm -f rabbitmq-producer-service-$i
done

# Forecefully remove the rest of the containers related to a RabbitMQ experiment
docker rm -f rabbit-node-1
