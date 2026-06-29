FROM node:18-bullseye
RUN apt-get update && apt-get install -y ffmpeg python3 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /home/container
COPY package*.json./
RUN npm install
COPY.
CMD ["npm", "run", "pm2"]