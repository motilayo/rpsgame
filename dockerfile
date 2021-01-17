# Stage 1
FROM node as build-prod
RUN mkdir -p /app
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npm run build --prod

# Stage 2
FROM nginx
COPY --from=build-prod /app/docs /usr/share/nginx/html