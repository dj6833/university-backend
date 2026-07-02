# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=24.14.0

################################################################################
# Stage 1: Base image configuration
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /usr/src/app


################################################################################
# Stage 2: Install production dependencies
FROM base as deps

# Standard COPY works universally on Railway without violating mount policies
# (Unable to leverage bind mounts to package.json and package-lock.json to avoid having to copy them due to Railway policies)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

################################################################################
# Stage 3: Install dev dependencies and compile TypeScript
FROM base as build

# Pull dependency definitions and all source code
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source files into the image.
COPY . .
# Run the build script.
RUN npm run build

################################################################################
# Stage 4: Clean, minimal production runtime container
FROM base as final

# Use production environment
ENV NODE_ENV production

# Run the application as a non-root user.
USER node

# Copy package.json so that package manager commands can be used.
COPY package.json .

# Copy the production dependencies from the deps stage and also
# the built application from the build stage into the image.
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist


# Expose the port that the application listens on.
EXPOSE 8000

# Run the application.
CMD ["npm", "start"]
