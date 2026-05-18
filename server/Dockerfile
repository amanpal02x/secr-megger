FROM node:20-alpine

# Install standard CA root certificates to allow secure TLS/SSL connections
RUN apk add --no-cache ca-certificates

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose port (Cloud Run will inject PORT env, Express listens on process.env.PORT || 5000)
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]
