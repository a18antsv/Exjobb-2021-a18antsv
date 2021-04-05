# Use official Docker image of Docker as base image to run Docker inside of Docker
# This image is based on the Alpine Linux distribution
FROM docker:20.10.5

# Install Node.js and NPM with commands working for Alpine since docker base image does not include it
# Install bash shell since it does not come with Alpine
RUN apk add --update nodejs nodejs-npm bash

# Create working directory in container and set it as default location for subsequent commands
WORKDIR /usr/src/dashboard

# Copy package.json and package-lock.json in separate layer to facilitate caching as dependencies do not change often
COPY ./dashboard/package*.json ./

# Install dependencies specified in package.json
RUN npm install

# Copy the rest of the files in the same directory as the Dockerfile to the set image working directory
COPY ./dashboard ./

# Documentation purpose for which ports are intended to be exposed by container instance
EXPOSE 3000

# Command to execute when container instance is created based on image (starts application in container)
CMD [ "npm", "run", "start" ]
