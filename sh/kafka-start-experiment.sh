#!/bin/bash

# Parameters passed into the script
PRODUCERS=${1:-1} # The number of producer containers to spin up (First argument passed to script or default if not passed)
CONSUMERS=${2:-1} # The number of consumer containers to spin up
MINUTES=${3:-10} # The number of minutes the experiment should run

# Zookeeper and broker settings
ZOOKEEPER_HOSTNAME=zookeeper-node-1
ZOOKEEPER_PORT=2181
BROKER_NAME=kafka-broker-1
BROKER_INTERNAL_PORT=9092
BROKER_EXTERNAL_PORT=19092

# All brokers to send to producers and consumers (separated by commas if multi broker cluster)
BROKERS=$BROKER_NAME:$BROKER_INTERNAL_PORT

# Topic creation
TOPIC_NAME=air-quality-observation-topic
NUMBER_OF_PARTITIONS=$CONSUMERS
REPLICATION_FACTOR=1

# Used by consumer container only
CONSUMER_GROUP_ID=test-consumer-group
DASHBOARD_HOSTNAME=dashboard-app
DASHBOARD_PORT=3000
AGGREGATION_RATE=1000
AGGREGATE_PUBLISH_RATE=1000

# Used by producer container only
LAT=37.5665
LONG=126.9780
MESSAGES_PER_BATCH=24

# Commong network that all containers join
NETWORK=common-network

# Create and run Zookeeper container based on official Zookeeper image from Docker Hub
docker run -d \
--name $ZOOKEEPER_HOSTNAME \
-h $ZOOKEEPER_HOSTNAME \
-p $ZOOKEEPER_PORT:$ZOOKEEPER_PORT \
-e ZOO_MY_ID=1 \
--net $NETWORK \
zookeeper:3.6.2

# Create and run Kafka container based on popular Apache Kafka Docker image that downloads Kafka from Apache's official Kafka website
# Kafka version specified by tag in format: <scala version>-<kafka version>
docker run -d \
--name $BROKER_NAME \
-p $BROKER_EXTERNAL_PORT:$BROKER_EXTERNAL_PORT \
-e KAFKA_ZOOKEEPER_CONNECT=$ZOOKEEPER_HOSTNAME:$ZOOKEEPER_PORT \
-e KAFKA_BROKER_ID=1 \
-e KAFKA_LISTENERS=INTERNAL://$BROKER_NAME:$BROKER_INTERNAL_PORT,EXTERNAL://$BROKER_NAME:$BROKER_EXTERNAL_PORT \
-e KAFKA_ADVERTISED_LISTENERS=INTERNAL://$BROKER_NAME:$BROKER_INTERNAL_PORT,EXTERNAL://localhost:$BROKER_EXTERNAL_PORT \
-e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT \
-e KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL \
-e KAFKA_AUTO_CREATE_TOPICS_ENABLE=false \
--net $NETWORK \
wurstmeister/kafka:2.13-2.7.0

# Create and run one container instance of the Kafka consumer image
for ((i = 1; i <= $CONSUMERS; i++))
do
  docker run -d \
  --name kafka-consumer-service-$i \
  -e NUMBER_OF_MINUTES=$MINUTES \
  -e CONSUMER_ID=consumer-service-$i \
  -e CONSUMER_GROUP_ID=$CONSUMER_GROUP_ID \
  -e TOPIC_NAME=$TOPIC_NAME \
  -e NUMBER_OF_PARTITIONS=$NUMBER_OF_PARTITIONS \
  -e REPLICATION_FACTOR=$REPLICATION_FACTOR \
  -e DASHBOARD_HOSTNAME=$DASHBOARD_HOSTNAME \
  -e DASHBOARD_PORT=$DASHBOARD_PORT \
  -e AGGREGATION_RATE=$AGGREGATION_RATE \
  -e AGGREGATE_PUBLISH_RATE=$AGGREGATE_PUBLISH_RATE \
  -e BROKERS=$BROKERS \
  --net $NETWORK \
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
  -e LAT=$LAT \
  -e LONG=$LONG \
  -e BROKERS=$BROKERS \
  -e MESSAGES_PER_BATCH=$MESSAGES_PER_BATCH \
  --net $NETWORK \
  kafka-producer-image
done
