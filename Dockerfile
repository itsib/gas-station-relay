FROM node:14 AS dist
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM node:14-alpine
WORKDIR /app
COPY --from=dist build /app/
COPY --from=dist node_modules /app/node_modules
COPY package.json package-lock.json /app/

CMD ["npm", "start"]
