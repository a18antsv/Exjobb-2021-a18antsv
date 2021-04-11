#!/bin/bash

PRODUCERS=${1:-1} # The number of producer containers that should be stopped and removed

# Remove all producer containers by force
for ((i = 1; i <= $PRODUCERS; i++))
do
  docker rm -f kafka-producer-service-$i
done

# Forecefully remove the rest of the containers related to a Kafka experiement
# Another option would be to stop them first and then remove them
docker rm -f kafka-consumer-service-1
docker rm -f kafka-broker-1
docker rm -f zookeeper-node-1
