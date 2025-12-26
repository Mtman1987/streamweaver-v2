FROM node:20-bullseye

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 3100 8090

# Start the app
CMD ["npm", "run", "dev"]
