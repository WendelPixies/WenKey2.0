# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Accept environment variables as build arguments
# These are required for Vite to inject them into the build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

# Verify that required environment variables are set
RUN if [ -z "$VITE_SUPABASE_URL" ]; then echo "ERROR: VITE_SUPABASE_URL is not set" && exit 1; fi
RUN if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then echo "ERROR: VITE_SUPABASE_PUBLISHABLE_KEY is not set" && exit 1; fi

# Build the application with environment variables
RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
