# Stage 1: Build the React Application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . .

# Declare build-time argument and set it as env
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the React production bundle
RUN npm run build

# Stage 2: Serve the build directory using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from build stage to Nginx public HTML directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port (Cloud Run will inject PORT env, Nginx will dynamically bind to it)
EXPOSE 80

# Substitute the default Nginx port (80) with Cloud Run's injected $PORT variable on startup
CMD ["/bin/sh", "-c", "sed -i 's/listen  *80;/listen '\"$PORT\"';/g' /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
