#!/bin/bash

# Parameters passed into the script
PRODUCERS=${1:-1} # The number of producer containers to spin up (First argument passed to script or default if not passed)
MINUTES=${2:-10} # The number of miuntes the experiment should run

# Create and run RabbitMQ container based on the official RabbitMQ image including management UI.
docker run -d \
--name rabbit-node-1 \
-h rabbit-node-1 \
-p 5672:5672 \
--net common-network \
rabbitmq:3.8.14
#-p 15672:15672 \
#rabbitmq:3.8.14-management

# Create and run one container instance of the RabbitMQ consumer image
docker run -d \
--name rabbitmq-consumer-service-1 \
-e NUMBER_OF_MINUTES=$MINUTES \
--net common-network \
rabbitmq-consumer-image

# Create and run a number of RabbitMQ producer containers depending on passed argument
for ((i = 1; i <= $PRODUCERS; i++))
do
  docker run -d \
  --name rabbitmq-producer-service-$i \
  -e STATION_ID=producer-service-$i \
  --net common-network \
  rabbitmq-producer-image
done
