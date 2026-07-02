# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=24.14.0

################################################################################
# Stage 1: Base
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /usr/src/app


################################################################################
# Stage 2: Install production dependencies
FROM base as deps

# Standard COPY works universally on Railway without violating mount policies
# (Unable to leverage bind mounts to package.json and package-lock.json to avoid having to copy them due to Railway policies)
COPY package.json package-lock.json ./
# REMOVE --omit=dev from below line. You need drizzle-kit and its tools for migrations.
RUN npm ci

################################################################################
# Stage 3: Build
FROM base as build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

################################################################################
# Stage 4: Final Production Image
FROM base as final

# Use production environment
ENV NODE_ENV production

# IMPORTANT: Stay as root for a second to set up files, then switch to node
WORKDIR /usr/src/app

# Copy Configs
COPY package.json package-lock.json drizzle.config.ts ./

# Copy Artifacts
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY drizzle ./drizzle

# Copy and set up the automated entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh && chown node:node entrypoint.sh

# Final permissions cleanup
RUN chown -R node:node /usr/src/app

USER node

# Expose the port that the application listens on.
EXPOSE 8000

# This runs the new entrypoint script
CMD ["./entrypoint.sh"]
