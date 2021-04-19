#!/bin/bash

# Parameters passed into the script
PRODUCERS=${1:-1} # The number of producer containers to spin up (First argument passed to script or default if not passed)
CONSUMERS=${2:-1} # The number of consumer containers to spin up
MINUTES=${3:-10} # The number of miuntes the experiment should run

# Create and run RabbitMQ container based on the official RabbitMQ image including management UI.
docker run -d \
--name rabbit-node-1 \
-h rabbit-node-1 \
-p 5672:5672 \
-p 15672:15672 \
--net common-network \
rabbitmq:3.8.14-management

# Create and run a number of RabbitMQ consumer containers depending on passed argument
for ((i = 1; i <= $CONSUMERS; i++))
do
  docker run -d \
  --name rabbitmq-consumer-service-$i \
  -e NUMBER_OF_MINUTES=$MINUTES \
  --net common-network \
  rabbitmq-consumer-image
done

# Create and run a number of RabbitMQ producer containers depending on passed argument
for ((i = 1; i <= $PRODUCERS; i++))
do
  docker run -d \
  --name rabbitmq-producer-service-$i \
  -e STATION_ID=producer-service-$i \
  --net common-network \
  rabbitmq-producer-image
done
