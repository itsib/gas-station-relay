FROM node:14

ADD ./build /app
WORKDIR /app

COPY ./package.json .
COPY ./package-lock.json .

RUN npm install

CMD ["npm", "start"]


