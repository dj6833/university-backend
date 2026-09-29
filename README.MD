# University Management System - Backend Services (Primary)

This repository contains the primary server-side services, API routing, and database migrations for the University Management System.

> [!NOTE]
>
> For an introduction and overview of the University Management System project, please first visit my **[Profile Page](https://github.com/dj6833)**

## 🛠️ Tech Stack

Node.js (Express) | PostgreSQL (Neon Serverless) | Drizzle-ORM | Better-auth | Docker

## 🏁 Getting Started
1. Clone this repository to your machine
2. Install dependencies via your terminal: `npm install`
3. Configure your environment variables file by copying the `.env.example` file, rename the copy to `.env` and update it with your frontend URL, backend-analysis-server credentials, database connection strings, etc
4. Run the development server; the API endpoints will begin listening for frontend requests

## 📜 Available Scripts

### Running the development server.

```bash
npm run dev
```

### Building for production.

```bash
npm run build
```

### Running the production server.

```bash
npm run start
```

### Generate database migration scripts following a schema change.

```bash
npm run db:generate
```

### Apply database migration scripts directly to the database (outside an established CI/CD process).

```bash
npm run db:migrate
```

### Delete ALL database data and repopulate with seed data.

```bash
npm run db:seed
```

## ⚖️ License

This project is published under the terms of the **GNU General Public License v3.0 (GPL-3.0)**.

For full license details, please see the accompanying `LICENSE` file included in the root directory of this repository.