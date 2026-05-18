ARG NODE_VERSION=24.14.0

# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

