#!/bin/bash

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

# Create and run one container instance of the RabbitMQ producer image
docker run -d \
--name rabbitmq-producer-service-1 \
--net common-network \
rabbitmq-producer-image
