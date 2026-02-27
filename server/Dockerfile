FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

---

## Step 2 — Create .dockerignore inside server/ folder

Create a file called `.dockerignore` inside your `server/` folder:
```
node_modules
roomcraft.db
roomcraft.db-shm
roomcraft.db-wal
.env
*.log