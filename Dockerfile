# Use the official Node.js 16 image as the base image
FROM node:16

# Set the working directory in the container to /app
WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the application code to the container
COPY . .

# Expose port 3000 in the container
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
