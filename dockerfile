# Stage 1
FROM node as build-prod
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build --prod

# Stage 2
FROM nginx
COPY --from=build-prod /usr/src/app/dist/rpsgame/ /usr/share/nginx/html