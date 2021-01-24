# Stage 1
FROM node as builder
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build --prod

# Stage 2
FROM nginx
COPY --from=builder /usr/src/app/dist/rpsgame/ /usr/share/nginx/html
COPY --from=builder /usr/src/app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80