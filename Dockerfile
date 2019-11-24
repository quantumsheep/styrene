FROM node:12-alpine

RUN apk add texlive-dvi

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080
CMD [ "node", "." ]
