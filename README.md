# LegacyVault Backend

LegacyVault is a secure digital vault backend built with Node.js, Express, Sequelize, and PostgreSQL. It supports:

- User signup/login with JWT authentication
- Vault item management for personal and shared records
- Trusted contact relationships
- Access request workflow for delegate approval
- Quorum-based voting decisions
- Activity logging for vault events
- Centralized validation and error handling

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Sequelize
- Joi
- JWT
- bcryptjs
- dotenv
- Helmet
- CORS

## Project Structure

```bash
legacyvault-backend/
├── app.js
├── .env
├── .env.example
├── package.json
├── postman_collection.json
├── README.md
├── src/
│   ├── config/
│   ├── controllers/
│   ├── errors/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── utils/
└──
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set your environment values before starting the app

Example:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
DB_HOST=localhost
DB_PORT=5432
DB_NAME=legacyvault
DB_USER=postgres
DB_PASSWORD=postgres
```

## Installation

```bash
npm install
```

## Start the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server URL:

```bash
http://localhost:3000
```

## API Base URL

```bash
http://localhost:3000/api
```

## Authentication

Most endpoints are protected with JWT.

1. Sign up or log in to receive a token.
2. Send the token in the request header:

```http
Authorization: Bearer <your_token>
```

## Main API Routes

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `PUT /api/auth/quorum-threshold`

### Vault Items

- `POST /api/vault-items`
- `GET /api/vault-items`
- `GET /api/vault-items/shared/:owner_id`
- `PUT /api/vault-items/:id`
- `DELETE /api/vault-items/:id`

### Trusted Contacts

- `POST /api/trusted-contacts`
- `GET /api/trusted-contacts`
- `DELETE /api/trusted-contacts/:id`

### Access Requests

- `POST /api/access-requests`
- `GET /api/access-requests/incoming`
- `GET /api/access-requests/to-vote`

### Votes

- `POST /api/votes/request/:request_id`

### Activity Logs

- `GET /api/activity-logs`

## Postman Collection

A ready-to-import collection file is included:

```bash
postman_collection.json
```

Import it into Postman and use the variables for login token and IDs.

## Example Testing Flow

1. Create two users with `/api/auth/signup`
2. Log in as Alice and save the token
3. Log in as Bob and save the token
4. Alice adds Bob as a trusted contact
5. Bob creates an access request for Alice's vault
6. Alice checks incoming requests
7. Alice votes on the request
8. Confirm request status changes based on quorum logic
9. Fetch activity logs

## Notes

- The app performs a database connection check at startup.
- Validation is centralized with Joi schemas.
- Error responses are returned through the global error middleware.
- This project is intended for development and backend validation workflows.

## Future Improvements

- Add automated tests with Jest/Supertest
- Add pagination and filtering to listing routes
- Add refresh token support
- Add stronger audit logging and admin endpoints
- Improve notification hooks for access request events
