# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Ensure .env is available or arguments are passed. 
# For this setup, we assume .env is successfully copied if it exists in the context.
RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
