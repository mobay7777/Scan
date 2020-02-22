# Rupaya Explorer - Scan

Scan is a BlockExplorer for **Rupaya**, built with VueJS, Nuxt and MongoDB. Scan allows you to explore and search the **Rupaya Blockchain** for transactions, addresses, tokens, prices and other activities taking place on the **Rupaya Blockchain**.


## Current Features
- Browse blocks, transactions, accounts and contracts
- View pending transactions
- Upload & verify contract sources
- Display the current state of verified contracts
- Responsive layout

## Getting started

### Requirements
- [NodeJS](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)

### Setup

Copy and modify your config
```bash
cp client/.env.example client/.env
cp server/config/default.json server/config/local.json
```

Install library
```bash
cd client/ && npm install
```

```bash
cd server/ && npm install
```

### Run
After modify your config & install library. Your environment is ready to start

- Run client to view in browser
```bash
cd client/ && npm run dev
```

- Run API server for client
```bash
cd server/ && npm run server-dev
```

- Run crawl data for API server
```bash
cd server/ && npm run crawl-dev
```

- Get transaction pending
```bash
cd server/ && npm run subscribe-pending-tx-dev
```
