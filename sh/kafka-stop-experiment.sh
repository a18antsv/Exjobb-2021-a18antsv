#!/bin/bash

# Forecefully remove all containers related to a Kafka experiement
# Another option would be to stop them first and then remove them
docker rm -f kafka-producer-service-1
docker rm -f kafka-consumer-service-1
docker rm -f kafka-broker-1
docker rm -f zookeeper-node-1
