FROM node:20-alpine as build
ARG ENVIRONMENT
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm install -g @angular/cli
RUN ng build --configuration=${ENVIRONMENT}

FROM nginx:latest
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build app/dist/sponspay/browser /usr/share/nginx/html
EXPOSE 80