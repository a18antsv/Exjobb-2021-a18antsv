# Use official Node.js Docker image as base image to include all its functionality
FROM node:14.16.0-alpine

# Create working directory in container and set it as default location for subsequent commands
WORKDIR /usr/src/producer-service

# Copy package.json and package-lock.json in separate layer to facilitate caching as dependencies do not change often
COPY ./kafka/producer-service/package*.json ./

# Argument passed when building image, used to determine the environment to build image for.
ARG NODE_ENV=development

# Install different dependencies specified in package.json depending on environment argument
RUN if [ "${NODE_ENV}" = "development" ]; \
  then npm install; \
  else npm install --only=production; \
  fi

# Copy the rest of the files in the same directory as the Dockerfile to the set image working directory
COPY ./kafka/producer-service/ ./

# Copy shared utils file to shared directory of set image working directory
COPY ./shared/utils.js ./shared/air-quality-data-generator.js ./shared/

# Command to execute when container instance is created based on image (starts application in container)
CMD [ "npm", "run", "dev" ]