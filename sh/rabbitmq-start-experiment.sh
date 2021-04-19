#!/bin/bash

# Parameters passed into the script
PRODUCERS=${1:-1} # The number of producer containers to spin up (First argument passed to script or default if not passed)
CONSUMERS=${2:-1} # The number of consumer containers to spin up
MINUTES=${3:-10} # The number of miuntes the experiment should run

# RabbitMQ connection settings
PROTOCOL=amqp
HOSTNAME=rabbitmq-node-1
PORT=5672
USERNAME=guest
PASSWORD=guest
VHOST=/

# RabbitMQ connection retry settings
SECONDS_BETWEEN_CONNECTION_RETRIES=2
MAXIMUM_NUMBER_OF_RETRIES=30

# Queue/Exchange/Binding
NUMBER_OF_QUEUES=$CONSUMERS
QUEUE_NAME=air-quality-observation-queue
EXCHANGE_NAME=air-quality-observation-exchange
EXCHANGE_TYPE=direct
BINDING_KEY=$QUEUE_NAME

# Used by consumer container only
DASHBOARD_HOSTNAME=dashboard-app
DASHBOARD_PORT=3000
AGGREGATION_RATE=1000
AGGREGATE_PUBLISH_RATE=1000

# Commong network that all containers join
NETWORK=common-network

# Create and run RabbitMQ container based on the official RabbitMQ image
docker run -d \
--name $HOSTNAME \
-h $HOSTNAME \
-p $PORT:$PORT \
-e RABBITMQ_DEFAULT_USER=$PASSWORD \
-e RABBITMQ_DEFAULT_PASS=$USERNAME \
-e RABBITMQ_DEFAULT_VHOST=$VHOST \
--net $NETWORK \
rabbitmq:3.8.14

# Create and run one container instance of the RabbitMQ consumer image
for ((i = 1; i <= $CONSUMERS; i++))
do
  docker run -d \
  --name rabbitmq-consumer-service-$i \
  -e NUMBER_OF_MINUTES=$MINUTES \
  -e QUEUE_NAME=$QUEUE_NAME \
  -e NUMBER_OF_QUEUES=$NUMBER_OF_QUEUES \
  -e AGGREGATION_RATE=$AGGREGATION_RATE \
  -e AGGREGATE_PUBLISH_RATE=$AGGREGATE_PUBLISH_RATE \
  -e DASHBOARD_HOSTNAME=$DASHBOARD_HOSTNAME \
  -e DASHBOARD_PORT=$DASHBOARD_PORT \
  -e SECONDS_BETWEEN_CONNECTION_RETRIES=$SECONDS_BETWEEN_CONNECTION_RETRIES \
  -e MAXIMUM_NUMBER_OF_RETRIES=$MAXIMUM_NUMBER_OF_RETRIES \
  -e PROTOCOL=$PROTOCOL \
  -e HOSTNAME=$HOSTNAME \
  -e PORT=$PORT \
  -e USERNAME=$USERNAME \
  -e PASSWORD=$PASSWORD \
  -e VHOST=$VHOST \
  --net $NETWORK \
  rabbitmq-consumer-image
done

# Create and run a number of RabbitMQ producer containers depending on passed argument
for ((i = 1; i <= $PRODUCERS; i++))
do
  docker run -d \
  --name rabbitmq-producer-service-$i \
  -e STATION_ID=producer-service-$i \
  -e QUEUE_NAME=$QUEUE_NAME \
  -e NUMBER_OF_QUEUES=$NUMBER_OF_QUEUES \
  -e EXCHANGE_NAME=$EXCHANGE_NAME \
  -e EXCHANGE_TYPE=$EXCHANGE_TYPE \
  -e BINDING_KEY=$BINDING_KEY \
  -e LAT=$LAT \
  -e LONG=$LONG \
  -e SECONDS_BETWEEN_CONNECTION_RETRIES=$SECONDS_BETWEEN_CONNECTION_RETRIES \
  -e MAXIMUM_NUMBER_OF_RETRIES=$MAXIMUM_NUMBER_OF_RETRIES \
  -e PROTOCOL=$PROTOCOL \
  -e HOSTNAME=$HOSTNAME \
  -e PORT=$PORT \
  -e USERNAME=$USERNAME \
  -e PASSWORD=$PASSWORD \
  -e VHOST=$VHOST \
  --net $NETWORK \
  rabbitmq-producer-image
done
