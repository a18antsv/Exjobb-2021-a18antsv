#!/bin/bash

# Parameters passed into the script
PRODUCERS=${1:-1} # The number of producer containers to spin up (First argument passed to script or default if not passed)
CONSUMERS=${2:-1} # The number of consumer containers to spin up
MINUTES=${3:-10} # The number of minutes the experiment should run

# Topic creation
TOPIC_NAME=air-quality-observation-topic
NUMBER_OF_PARTITIONS=10
REPLICATION_FACTOR=1

# Create and run Zookeeper container based on official Zookeeper image from Docker Hub
docker run -d \
--name zookeeper-node-1 \
-h zookeeper-node-1 \
-p 2181:2181 \
-e ZOO_MY_ID=1 \
--net common-network \
zookeeper:3.6.2

# Create and run Kafka container based on popular Apache Kafka Docker image that downloads Kafka from Apache's official Kafka website
# Kafka version specified by tag in format: <scala version>-<kafka version>
# Create topic with 10 partitions and replication factor 1 if it does not already exists (special for the wurstmeister Kafka image)
# Could have used the kafkajs admin client to create the topic instead
docker run -d \
--name kafka-broker-1 \
-p 19092:19092 \
-e KAFKA_ZOOKEEPER_CONNECT=zookeeper-node-1:2181 \
-e KAFKA_BROKER_ID=1 \
-e KAFKA_LISTENERS=INTERNAL://kafka-broker-1:9092,EXTERNAL://kafka-broker-1:19092 \
-e KAFKA_ADVERTISED_LISTENERS=INTERNAL://kafka-broker-1:9092,EXTERNAL://localhost:19092 \
-e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT \
-e KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL \
-e KAFKA_AUTO_CREATE_TOPICS_ENABLE=false \
--net common-network \
wurstmeister/kafka:2.13-2.7.0

# Create and run a number of Kafka consumer containers depending on passed argument
for ((i = 1; i <= $CONSUMERS; i++))
do
  docker run -d \
  --name kafka-consumer-service-$i \
  -e NUMBER_OF_MINUTES=$MINUTES \
  -e TOPIC_NAME=$TOPIC_NAME \
  -e NUMBER_OF_PARTITIONS=$NUMBER_OF_PARTITIONS \
  -e REPLICATION_FACTOR=$REPLICATION_FACTOR \
  --net common-network \
  kafka-consumer-image
done

# Create and run a number of Kafka producer containers depending on passed argument
for ((i = 1; i <= $PRODUCERS; i++))
do
  docker run -d \
  --name kafka-producer-service-$i \
  -e STATION_ID=producer-service-$i \
  -e TOPIC_NAME=$TOPIC_NAME \
  -e NUMBER_OF_PARTITIONS=$NUMBER_OF_PARTITIONS \
  -e REPLICATION_FACTOR=$REPLICATION_FACTOR \
  --net common-network \
  kafka-producer-image
done
