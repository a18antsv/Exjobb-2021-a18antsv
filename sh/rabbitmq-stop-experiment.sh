#!/bin/bash

# Forecefully remove all containers related to a RabbitMQ experiment
# Another option would be to stop them first and then remove them
docker rm -f rabbitmq-producer-service-1
docker rm -f rabbitmq-consumer-service-1
docker rm -f rabbit-node-1
