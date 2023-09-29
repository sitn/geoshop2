### Compile ###
FROM node:18.18-alpine as builder
WORKDIR /usr/src/app
ENV PATH=${PATH}:./node_modules/.bin
ENV NODE_PATH=/usr/src/app/node_modules
COPY package*.json ./
RUN npm install --no-progress --loglevel=error --no-audit
COPY . .
ARG FRONT_HREF
RUN npm run ng build -- --configuration production --base-href ${FRONT_HREF}/

### Run ###
FROM httpd:alpine
RUN rm -r /usr/local/apache2/htdocs/*
COPY --from=builder /usr/src/app/dist/ /usr/local/apache2/htdocs/
COPY ./httpd.conf /usr/local/apache2/conf/

# Read only for user daemon
RUN chown -R root:daemon \
  /usr/local/apache2/htdocs/*
RUN chmod -R 440 \
  /usr/local/apache2/htdocs/*
RUN find /usr/local/apache2/htdocs/ -mindepth 1 -type d -exec chmod +x {} \;
