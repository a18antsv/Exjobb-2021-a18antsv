# Use official Node.js Docker image as base image to include all its functionality
FROM node:14.16.0-alpine

# Create working directory in container and set it as default location for subsequent commands
WORKDIR /usr/src/consumer-service

# Copy package.json and package-lock.json in separate layer to facilitate caching as dependencies do not change often
COPY ./kafka/consumer-service/package*.json ./

# Install dependencies specified in package.json
RUN npm install

# Copy the rest of the files in the same directory as the Dockerfile to the set image working directory
COPY ./kafka/consumer-service/ ./

# Command to execute when container instance is created based on image (starts application in container)
CMD [ "npm", "run", "start" ]