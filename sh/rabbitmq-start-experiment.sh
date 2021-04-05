#!/bin/bash

# Parameters passed into the script
PRODUCERS=${1:-1} # The number of producer containers to spin up (First argument passed to script or default if not passed)
MESSAGES=${2:-10000} # The number of messages each producer should produce (Second argument passed to script or default if not passed)

# Create and run RabbitMQ container based on the official RabbitMQ image including management UI.
docker run -d \
--name rabbit-node-1 \
-h rabbit-node-1 \
-p 5672:5672 \
-p 15672:15672 \
--net common-network \
rabbitmq:3.8.14-management

# Create and run one container instance of the RabbitMQ consumer image
docker run -d \
--name rabbitmq-consumer-service-1 \
--net common-network \
rabbitmq-consumer-image

# Create and run a number of RabbitMQ producer containers depending on passed argument
for ((i = 1; i <= $PRODUCERS; i++))
do
  docker run -d \
  --name rabbitmq-producer-service-$i \
  -e STATION_ID=producer-service-$i \
  -e NUMBER_OF_MESSAGES=$MESSAGES \
  --net common-network \
  rabbitmq-producer-image
done
