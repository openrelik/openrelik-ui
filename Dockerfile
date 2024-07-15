# Use the node image from official Docker Hub
FROM node:21-bookworm-slim as build-stage
# set the working directory
WORKDIR /app
# Copy the working directory in the container
COPY package.json ./
COPY yarn.lock ./
# Install the project dependencies
RUN yarn install
# Copy the rest of the project files to the container
COPY . .
# Build the Vue.js application to the production mode to dist folder
RUN yarn build
# Use the lightweight Nginx image from the previous stage for the nginx container
FROM nginx:stable-alpine as production-stage
# Copy the build application from the previous stage to the Nginx container
COPY --from=build-stage /app/dist /usr/share/nginx/html/
# Copy the nginx configuration file
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
# Substitute env variables at runtime
COPY ./nginx/substitute_env_variables.sh /docker-entrypoint.d/substitute_env_variables.sh
RUN chmod +x /docker-entrypoint.d/substitute_env_variables.sh
# Expose the port 80
EXPOSE 80
# Start Nginx to serve the application
CMD ["nginx", "-g", "daemon off;"]
