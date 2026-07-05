# 1. Use a lightweight Node base image
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy only package files first to leverage Docker layer caching
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the application source code
COPY . .

# 6. Expose the port the API listens on
EXPOSE 4000

# 7. Command to run the application using the tsx engine
CMD ["npm", "run", "dev"]