### Compile ###
FROM node:22.6.0-slim AS builder

WORKDIR /usr/app

COPY package*.json ./.
RUN npm ci --legacy-peer-deps

COPY . .

ARG FRONT_HREF
RUN npm run build -- --configuration production --base-href ${FRONT_HREF}/

### Run ###
FROM httpd:alpine
RUN rm -r /usr/local/apache2/htdocs/*
COPY --from=builder /usr/app/dist/ /usr/local/apache2/htdocs/
COPY ./httpd.conf /usr/local/apache2/conf/

# Read only for user daemon
RUN chown -R root:daemon \
  /usr/local/apache2/htdocs/*
RUN chmod -R 440 \
  /usr/local/apache2/htdocs/*
RUN find /usr/local/apache2/htdocs/ -mindepth 1 -type d -exec chmod +x {} \;
