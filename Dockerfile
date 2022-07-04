FROM node:16 AS dist
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build
RUN npm run doc

FROM node:16-alpine
WORKDIR /app
COPY --from=dist public /app/public
COPY --from=dist build /app/build
COPY --from=dist node_modules /app/node_modules
COPY package.json package-lock.json /app/
EXPOSE 3000
CMD ["npm", "start"]
