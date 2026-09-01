# LegacyVault API Test Suite
## Authentication & User Lifecycle (Signup → Login → Logout)

**Application Context:**
- **App Type:** FinTech SaaS - Digital Legacy & Emergency Access Planner
- **Auth Mechanism:** JWT (Access Token, 30-day expiration)
- **Database:** PostgreSQL 15 with Sequelize ORM
- **Backend:** Express.js with Joi validation
- **API Base URL:** `http://localhost:5000/api`

---

## 📋 Test Coverage Map

| Endpoint | HTTP Method | Priority | Test Cases |
|----------|------------|----------|-----------|
| `/auth/signup` | POST | Critical | 35+ |
| `/auth/login` | POST | Critical | 30+ |
| `/auth/logout` | POST | High | 12+ |
| `/auth/quorum-threshold` | PUT | Medium | 15+ |

---

## 🔐 ENDPOINT 1: POST `/auth/signup`

### 1.1 Happy Path (Positive Testing)

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| SIGNUP-001 | Valid signup with all required fields | User signs up with valid email and password | `{ "email": "user@example.com", "password": "SecurePass123" }` | 201 Created | `{ "status": "success", "data": { "user": { "user_id": "UUID", "email": "user@example.com", "quorum_threshold": 2 }, "token": "JWT_TOKEN" } }` |
| SIGNUP-002 | Signup with minimum password length | User signs up with exactly 8-char password | `{ "email": "min@test.com", "password": "Pass1234" }` | 201 Created | Valid token + user object |
| SIGNUP-003 | Signup with complex password | User signs up with special chars, numbers, uppercase | `{ "email": "complex@test.com", "password": "P@ssw0rd!#2024" }` | 201 Created | Valid token + user object |
| SIGNUP-004 | Signup with long email address | User signs up with valid long email | `{ "email": "user+tag+nested@subdomain.example.co.uk", "password": "Secure123!" }` | 201 Created | Valid token + user object |
| SIGNUP-005 | Token is valid JWT | Returned token can be decoded | Response contains valid JWT | 201 Created | JWT has `{ id: "user_id" }` payload, expires in 30d |
| SIGNUP-006 | Default quorum_threshold set to 2 | New user has quorum_threshold = 2 | `{ "email": "quorum@test.com", "password": "Test1234!" }` | 201 Created | `user.quorum_threshold === 2` |

---

### 1.2 Negative Testing (Input Validation)

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| SIGNUP-101 | Missing email field | Request sent without email | `{ "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" is required" }` |
| SIGNUP-102 | Missing password field | Request sent without password | `{ "email": "test@example.com" }` | 400 Bad Request | `{ "status": "fail", "message": "\"password\" is required" }` |
| SIGNUP-103 | Both fields missing | Request with empty object | `{}` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" is required" }` |
| SIGNUP-104 | Invalid email format (no @) | Email missing @ symbol | `{ "email": "userexample.com", "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" must be a valid email" }` |
| SIGNUP-105 | Invalid email format (no domain) | Email with @ but no domain | `{ "email": "user@", "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" must be a valid email" }` |
| SIGNUP-106 | Email is not a string | Email sent as number | `{ "email": 12345, "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" must be a string" }` |
| SIGNUP-107 | Password too short (7 chars) | Password less than 8 characters | `{ "email": "test@example.com", "password": "Test123" }` | 400 Bad Request | `{ "status": "fail", "message": "Password must be at least 8 characters long." }` |
| SIGNUP-108 | Password is empty string | Password is empty | `{ "email": "test@example.com", "password": "" }` | 400 Bad Request | `{ "status": "fail", "message": "Password must be at least 8 characters long." }` |
| SIGNUP-109 | Password is not a string | Password sent as number | `{ "email": "test@example.com", "password": 12345678 }` | 400 Bad Request | `{ "status": "fail", "message": "\"password\" must be a string" }` |
| SIGNUP-110 | Email with spaces | Email containing spaces | `{ "email": "user @example.com", "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" must be a valid email" }` |
| SIGNUP-111 | Malformed JSON payload | Missing closing brace | `{ "email": "test@example.com", "password": "Test1234!"` | 400 Bad Request | `SyntaxError: Unexpected end of JSON input` |
| SIGNUP-112 | Extra unknown fields | Request with additional fields | `{ "email": "test@example.com", "password": "Test1234!", "username": "testuser", "age": 30 }` | 201 Created | Extra fields are ignored, success |
| SIGNUP-113 | Email is null | Email set to null | `{ "email": null, "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" must be a string" }` |
| SIGNUP-114 | Password is null | Password set to null | `{ "email": "test@example.com", "password": null }` | 400 Bad Request | `{ "status": "fail", "message": "\"password\" must be a string" }` |

---

### 1.3 Edge Cases & Boundary Constraints

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| SIGNUP-201 | Email with leading/trailing spaces | Email has whitespace padding | `{ "email": " test@example.com ", "password": "Test1234!" }` | 400 Bad Request | Email validation should fail (Joi doesn't trim by default) |
| SIGNUP-202 | Extremely long email (255+ chars) | Email exceeds database VARCHAR limit | `{ "email": "a" * 250 + "@test.com", "password": "Test1234!" }` | 400 Bad Request or 500 | Database constraint error or validation error |
| SIGNUP-203 | Password with only spaces (8 chars) | Password is "        " (8 spaces) | `{ "email": "test@example.com", "password": "        " }` | 201 Created | Password accepted (no regex validation in schema) |
| SIGNUP-204 | Email case sensitivity (uppercase) | Email with uppercase letters | `{ "email": "TEST@EXAMPLE.COM", "password": "Test1234!" }` | 201 Created | Email stored in DB; later login must handle case-insensitively |
| SIGNUP-205 | Email with subdomain variations | Email with multiple subdomains | `{ "email": "user@mail.example.co.uk", "password": "Test1234!" }` | 201 Created | Valid email, token issued |
| SIGNUP-206 | Password with 1000+ characters | Extremely long password | `{ "email": "test@example.com", "password": "P@ss" + "a" * 1000 }` | 201 Created or 400 | Either accepted or validation error (no length limit in schema) |
| SIGNUP-207 | Unicode characters in email | Email with non-ASCII chars | `{ "email": "用户@example.com", "password": "Test1234!" }` | 400 Bad Request | Email validation should fail |
| SIGNUP-208 | Special characters in password | Password with symbols | `{ "email": "test@example.com", "password": "P@$$w0rd!#%" }` | 201 Created | Password accepted, token issued |
| SIGNUP-209 | Password with newline character | Password contains \n | `{ "email": "test@example.com", "password": "Test1234\n" }` | 201 Created | Password accepted with escaped character |
| SIGNUP-210 | Email with multiple @ symbols | Email with duplicate @ | `{ "email": "user@@example.com", "password": "Test1234!" }` | 400 Bad Request | Email validation fails |

---

### 1.4 Security & Token Manipulation

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| SIGNUP-301 | Duplicate email registration | Attempt signup with already-registered email | `{ "email": "existing@example.com", "password": "NewPass123!" }` | 409 Conflict | `{ "status": "fail", "message": "Email is already registered." }` |
| SIGNUP-302 | SQL injection in email | Malicious SQL payload in email field | `{ "email": "'; DROP TABLE users; --@example.com", "password": "Test1234!" }` | 400 Bad Request | Email validation should reject (Joi validates format); query is parameterized |
| SIGNUP-303 | XSS payload in email | JavaScript payload in email | `{ "email": "<script>alert('xss')</script>@test.com", "password": "Test1234!" }` | 400 Bad Request | Invalid email format |
| SIGNUP-304 | XSS payload in password | JavaScript payload in password | `{ "email": "test@example.com", "password": "<script>alert('xss')</script>" }` | 201 Created | Password is hashed; output encoding handled by frontend |
| SIGNUP-305 | Rapid sequential requests (rate limit) | 10+ signup requests in 1 second | Same email variation | 429 Too Many Requests (if implemented) | `{ "status": "fail", "message": "Too many requests, please retry after..." }` |
| SIGNUP-306 | CORS preflight request | OPTIONS request to /auth/signup | No body | 200 OK | CORS headers returned (Access-Control-Allow-Origin, etc.) |
| SIGNUP-307 | Request without Content-Type header | POST without Content-Type | `{ "email": "test@example.com", "password": "Test1234!" }` | 400 Bad Request or 415 | May fail JSON parsing or validation |
| SIGNUP-308 | Request with wrong Content-Type | Content-Type: text/plain | Valid JSON body | 400 Bad Request | Body parsing fails |

---

### 1.5 State & Lifecycle Scenarios

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| SIGNUP-401 | Signup twice with same email | First signup succeeds, second with same email fails | Same email in 2 requests | 201 (1st), 409 (2nd) | 1st: token issued; 2nd: "Email is already registered" |
| SIGNUP-402 | Signup, then immediately login | User signs up and can immediately login | `{ "email": "test@example.com", "password": "Test1234!" }` | 201 | User created and verified immediately (no email verification step) |
| SIGNUP-403 | Returned token works immediately | Use token from signup response in protected endpoint | Signup token → GET /vault-items | 200 OK | Token is valid; returns empty vault items list |
| SIGNUP-404 | User can update quorum after signup | After signup, user can PUT /auth/quorum-threshold | Token from signup → PUT quorum | 200 OK | Quorum updated successfully |

---

## 🔐 ENDPOINT 2: POST `/auth/login`

### 2.1 Happy Path (Positive Testing)

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGIN-001 | Valid login with correct credentials | User logs in with registered email and password | `{ "email": "existing@example.com", "password": "CorrectPass123" }` | 200 OK | `{ "status": "success", "data": { "user": { "user_id": "UUID", "email": "existing@example.com", "quorum_threshold": 2 }, "token": "JWT_TOKEN" } }` |
| LOGIN-002 | Login returns fresh token | Token from login is different from previous tokens | Multiple logins with same credentials | 200 OK | Each login returns a new JWT token |
| LOGIN-003 | Login with uppercase email | User logs in with uppercase version of email | `{ "email": "EXISTING@EXAMPLE.COM", "password": "CorrectPass123" }` | 200 OK or 401 | Depends on DB case sensitivity; ideally should normalize to lowercase |
| LOGIN-004 | Token in response is valid | Returned token can be decoded and used | Token → GET protected endpoint | 200 OK | Token accepted by protected endpoints |

---

### 2.2 Negative Testing (Input Validation)

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGIN-101 | Missing email field | Request without email | `{ "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" is required" }` |
| LOGIN-102 | Missing password field | Request without password | `{ "email": "test@example.com" }` | 400 Bad Request | `{ "status": "fail", "message": "\"password\" is required" }` |
| LOGIN-103 | Both fields missing | Request with empty object | `{}` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" is required" }` |
| LOGIN-104 | Invalid email format | Email missing @ symbol | `{ "email": "userexample.com", "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" must be a valid email" }` |
| LOGIN-105 | Password is empty string | Password field is empty | `{ "email": "test@example.com", "password": "" }` | 400 Bad Request | `{ "status": "fail", "message": "\"password\" is required" }` |
| LOGIN-106 | Email is not a string | Email as number | `{ "email": 12345, "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" must be a string" }` |
| LOGIN-107 | Password is not a string | Password as number | `{ "email": "test@example.com", "password": 12345 }` | 400 Bad Request | `{ "status": "fail", "message": "\"password\" must be a string" }` |
| LOGIN-108 | Email is null | Email set to null | `{ "email": null, "password": "Test1234!" }` | 400 Bad Request | `{ "status": "fail", "message": "\"email\" must be a string" }` |
| LOGIN-109 | Password is null | Password set to null | `{ "email": "test@example.com", "password": null }` | 400 Bad Request | `{ "status": "fail", "message": "\"password\" must be a string" }` |
| LOGIN-110 | Malformed JSON | Missing closing brace | `{ "email": "test@example.com", "password": "Test1234!"` | 400 Bad Request | `SyntaxError: Unexpected end of JSON input` |

---

### 2.3 Edge Cases & Boundary Constraints

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGIN-201 | Nonexistent email | Login with email not in database | `{ "email": "notregistered@example.com", "password": "AnyPass123" }` | 401 Unauthorized | `{ "status": "fail", "message": "Invalid email or password." }` |
| LOGIN-202 | Correct email, wrong password | Email exists but password is incorrect | `{ "email": "existing@example.com", "password": "WrongPass123" }` | 401 Unauthorized | `{ "status": "fail", "message": "Invalid email or password." }` |
| LOGIN-203 | Email with leading/trailing spaces | Email has whitespace padding | `{ "email": " test@example.com ", "password": "Test1234!" }` | 400 Bad Request | Email validation fails |
| LOGIN-204 | Password case sensitivity | Login with different password case | `{ "email": "test@example.com", "password": "correctpass123" }` (vs "CorrectPass123") | 401 Unauthorized | Bcrypt comparison is case-sensitive; should fail |
| LOGIN-205 | Extremely long password attempt | Password exceeds expected length | `{ "email": "test@example.com", "password": "P" * 1000 }` | 401 Unauthorized | Password hash comparison fails; invalid password |
| LOGIN-206 | Special characters in wrong password | Wrong password with special chars | `{ "email": "test@example.com", "password": "P@ssw0rd!#$" }` (incorrect) | 401 Unauthorized | Invalid password |
| LOGIN-207 | Login attempts with slight email variations | Email with dots/plus addressing | `{ "email": "user.name+tag@example.com", "password": "Test1234!" }` (if registered) | 200 OK or 401 | Email must match exact DB entry |
| LOGIN-208 | Rapid sequential login attempts (brute force) | 10+ login attempts in < 1 minute | Same credentials repeatedly | 429 Too Many Requests (if rate limit implemented) | Rate limit exceeded response |

---

### 2.4 Security & Token Manipulation

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGIN-301 | SQL injection in email | Malicious SQL payload | `{ "email": "'; DROP TABLE users; --@test.com", "password": "Test1234!" }` | 400 Bad Request | Joi validates email format; query parameterized |
| LOGIN-302 | SQL injection in password | SQL payload in password | `{ "email": "test@example.com", "password": "' OR '1'='1" }` | 401 Unauthorized | Parameterized query prevents injection; fails password verification |
| LOGIN-303 | XSS payload in email | JavaScript payload in email | `{ "email": "<script>alert('xss')</script>@test.com", "password": "Test1234!" }` | 400 Bad Request | Invalid email format |
| LOGIN-304 | XSS payload in password | JavaScript payload in password | `{ "email": "test@example.com", "password": "<img src=x onerror=alert(1)>" }` | 401 Unauthorized | Password doesn't match; bcrypt comparison fails |
| LOGIN-305 | CORS preflight request | OPTIONS request before actual POST | No body | 200 OK | CORS headers returned |
| LOGIN-306 | Missing Authorization header (not required for login) | POST without auth header | Valid credentials | 200 OK | Login doesn't require prior auth |
| LOGIN-307 | Request with wrong Content-Type | Content-Type: text/plain | Valid JSON body | 400 Bad Request | Body parsing fails |

---

### 2.5 State & Lifecycle Scenarios

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGIN-401 | Login after logout | User logs out then logs back in | Same credentials after logout | 200 OK | Fresh token issued; previous token no longer valid |
| LOGIN-402 | Multiple concurrent logins | Same user logged in from 2 browsers simultaneously | Same email/password in parallel requests | 200 OK (both) | Both sessions valid; can issue multiple tokens |
| LOGIN-403 | Login with unverified email (if email verification required) | User tries to login before email confirmation | Registered but unverified email | 401 or 403 | Should fail (depends on app design; LegacyVault has no email verification) |
| LOGIN-404 | Login after password change | If password was reset externally | Old password | 401 Unauthorized | Old password should fail |

---

## 🔐 ENDPOINT 3: POST `/auth/logout`

### 3.1 Happy Path (Positive Testing)

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGOUT-001 | Valid logout with valid token | User logged in, sends logout request with valid JWT | Headers: `Authorization: Bearer <VALID_JWT>` | 200 OK | `{ "status": "success", "message": "Logged out successfully." }` |
| LOGOUT-002 | Token becomes invalid after logout | After logout, token is no longer accepted | Use token from response in protected endpoint | 401 Unauthorized | Protected endpoints reject the token |

---

### 3.2 Negative Testing (Input Validation)

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGOUT-101 | Missing Authorization header | Request without auth header | No Authorization header | 401 Unauthorized | `{ "status": "fail", "message": "Authorization token is required" }` |
| LOGOUT-102 | Invalid token format | Authorization header with invalid format | `Authorization: InvalidToken` | 401 Unauthorized | `{ "status": "fail", "message": "Invalid token format" }` or similar |
| LOGOUT-103 | Malformed JWT | Authorization with malformed JWT | `Authorization: Bearer malformed.jwt.here` | 401 Unauthorized | `{ "status": "fail", "message": "Invalid token" }` |
| LOGOUT-104 | Empty Authorization header | Authorization header is empty string | `Authorization: ` | 401 Unauthorized | No token provided |
| LOGOUT-105 | Authorization header with only "Bearer" | Missing token after Bearer | `Authorization: Bearer ` | 401 Unauthorized | Token missing |

---

### 3.3 Edge Cases & Boundary Constraints

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGOUT-201 | Logout with expired token | User's JWT has expired | Expired JWT in Authorization header | 401 Unauthorized | `{ "status": "fail", "message": "Token has expired" }` |
| LOGOUT-202 | Logout twice with same token | Logout succeeds, then logout again with same token | Same JWT used twice | 200 OK (1st), 401 (2nd) | 1st succeeds; 2nd fails (token consumed or already invalid) |
| LOGOUT-303 | Authorization header case sensitivity | Bearer vs bearer | `Authorization: bearer <TOKEN>` | 401 or 200 | Depends on implementation; some use case-insensitive check |
| LOGOUT-204 | Extra whitespace in header | Multiple spaces in Authorization | `Authorization:  Bearer  <TOKEN>` | 401 or 200 | Parsing may fail or ignore extra spaces |
| LOGOUT-205 | Logout with modified token | Token signature tampered with | Modified JWT string | 401 Unauthorized | Signature verification fails |

---

### 3.4 Security & Token Manipulation

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGOUT-301 | Token from another user | Use JWT from different user | Another user's token | 401 Unauthorized | Attempt to use another user's token fails (invalid signature or user mismatch) |
| LOGOUT-302 | Replayed token after logout | Capture and reuse token after logout | Previously used token | 401 Unauthorized | Token is either blacklisted, expired, or invalid |
| LOGOUT-303 | Token signed with wrong secret | JWT created with different secret | Forged JWT | 401 Unauthorized | Signature verification fails |
| LOGOUT-304 | CORS preflight request | OPTIONS request to /auth/logout | No body, Authorization header | 200 OK | CORS headers returned |
| LOGOUT-305 | Request without Content-Type | POST without Content-Type (body is empty) | Authorization header only | 200 OK | No body needed for logout |

---

### 3.5 State & Lifecycle Scenarios

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| LOGOUT-401 | Logout, then try protected endpoint | After logout, token should be rejected | Logout → GET /vault-items with same token | 200 OK (logout), 401 (protected) | Token no longer works |
| LOGOUT-402 | Logout, then login again | User can login after logout | Logout → Login with same credentials | 200 OK (logout), 200 OK (login) | New token issued; old token invalid |
| LOGOUT-403 | Multiple logouts in rapid succession | Send multiple logout requests quickly | Same token used in parallel requests | 200 OK (1st), 401 (subsequent) | 1st succeeds; subsequent fail |

---

## 🔐 ENDPOINT 4: PUT `/auth/quorum-threshold`

### 4.1 Happy Path (Positive Testing)

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| QUORUM-001 | Update quorum threshold to valid value | User updates threshold to 3 | `{ "quorum_threshold": 3 }` with valid token | 200 OK | `{ "status": "success", "data": { "quorum_threshold": 3 } }` |
| QUORUM-002 | Update quorum to minimum (1) | User sets threshold to minimum allowed | `{ "quorum_threshold": 1 }` with valid token | 200 OK | `{ "status": "success", "data": { "quorum_threshold": 1 } }` |
| QUORUM-003 | Update quorum multiple times | User updates threshold 3 times sequentially | 1 → 2 → 3 | 200 OK (all) | Each update succeeds; final value is 3 |

---

### 4.2 Negative Testing (Input Validation)

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| QUORUM-101 | Missing quorum_threshold field | Request without threshold field | `{}` | 400 Bad Request | `{ "status": "fail", "message": "\"quorum_threshold\" is required" }` |
| QUORUM-102 | quorum_threshold is string | Threshold as string instead of number | `{ "quorum_threshold": "3" }` | 400 Bad Request | `{ "status": "fail", "message": "\"quorum_threshold\" must be a number" }` |
| QUORUM-103 | quorum_threshold is float | Threshold is decimal number | `{ "quorum_threshold": 3.5 }` | 400 Bad Request | `{ "status": "fail", "message": "\"quorum_threshold\" must be an integer" }` |
| QUORUM-104 | quorum_threshold is zero | Threshold set to 0 | `{ "quorum_threshold": 0 }` | 400 Bad Request | `{ "status": "fail", "message": "Threshold must be at least 1" }` |
| QUORUM-105 | quorum_threshold is negative | Threshold is negative number | `{ "quorum_threshold": -5 }` | 400 Bad Request | `{ "status": "fail", "message": "Threshold must be at least 1" }` |
| QUORUM-106 | quorum_threshold is null | Threshold set to null | `{ "quorum_threshold": null }` | 400 Bad Request | `{ "status": "fail", "message": "\"quorum_threshold\" must be a number" }` |
| QUORUM-107 | Missing Authorization header | Request without auth token | `{ "quorum_threshold": 3 }` (no Authorization) | 401 Unauthorized | `{ "status": "fail", "message": "Authorization token is required" }` |
| QUORUM-108 | Invalid token in Authorization | Request with invalid/malformed token | `{ "quorum_threshold": 3 }` (invalid token) | 401 Unauthorized | `{ "status": "fail", "message": "Invalid token" }` |
| QUORUM-109 | Malformed JSON | Request body has syntax error | `{ "quorum_threshold": 3` (missing closing brace) | 400 Bad Request | `SyntaxError: Unexpected end of JSON input` |
| QUORUM-110 | Extra unknown fields | Request with additional fields | `{ "quorum_threshold": 3, "extra": "field" }` | 200 OK | Extra fields ignored; threshold updated |

---

### 4.3 Edge Cases & Boundary Constraints

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| QUORUM-201 | Very large threshold (1000000) | Threshold set to extremely high value | `{ "quorum_threshold": 1000000 }` | 200 OK | Accepted; may cause issues if compared against 0 trusted contacts |
| QUORUM-202 | Threshold equals number of contacts (valid case) | User has 3 trusted contacts, sets threshold to 3 | `{ "quorum_threshold": 3 }` | 200 OK | Valid; any subset of 3 contacts can approve |
| QUORUM-203 | Threshold exceeds number of contacts | User has 2 contacts but sets threshold to 5 | `{ "quorum_threshold": 5 }` with 2 contacts | 200 OK | Accepted (no validation against contact count); may be problematic in practice |
| QUORUM-204 | Same value update | Update threshold to current value | User has threshold 2, update to 2 | `{ "quorum_threshold": 2 }` | 200 OK | No change; accepted |
| QUORUM-205 | Maximum safe integer | Threshold set to MAX_SAFE_INTEGER | `{ "quorum_threshold": 9007199254740991 }` | 200 OK or 400 | May overflow; depends on DB constraints |

---

### 4.4 Security & Token Manipulation

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| QUORUM-301 | Update quorum with expired token | Token has expired | `{ "quorum_threshold": 3 }` with expired JWT | 401 Unauthorized | `{ "status": "fail", "message": "Token has expired" }` |
| QUORUM-302 | Update quorum with forged token | JWT signed with wrong secret | `{ "quorum_threshold": 3 }` with forged token | 401 Unauthorized | Token signature verification fails |
| QUORUM-303 | Update another user's quorum | Attempt to modify different user's threshold | User A's token, but endpoint modifies User B | 403 Forbidden or 401 | Should not be able to update another user's data |
| QUORUM-304 | SQL injection in quorum_threshold | Payload with SQL injection | `{ "quorum_threshold": "'; DROP TABLE users; --" }` | 400 Bad Request | Type validation catches non-numeric value |
| QUORUM-305 | CORS preflight request | OPTIONS request to /auth/quorum-threshold | Authorization header | 200 OK | CORS headers returned |
| QUORUM-306 | Request with wrong Content-Type | Content-Type: text/plain | Valid JSON body | 400 Bad Request | Body parsing fails |

---

### 4.5 State & Lifecycle Scenarios

| Test ID | Test Name | Scenario | Request Body | Expected Status | Expected Response |
|---------|-----------|----------|--------------|-----------------|-------------------|
| QUORUM-401 | Update quorum after login | Immediately after login, update quorum | Login → PUT quorum-threshold | 200 OK | Token is valid; quorum updated |
| QUORUM-402 | Update quorum, logout, login, verify persistence | Update quorum, logout, login again, check quorum | Update 3 → Logout → Login → GET user | 200 OK (all) | New token shows quorum_threshold = 3 |
| QUORUM-403 | Multiple users update own thresholds | User A sets threshold to 2, User B sets to 5 | Parallel requests from different users | 200 OK (both) | Each user's threshold is independently updated |

---

## 🛡️ Cross-Endpoint Security Test Cases

| Test ID | Test Name | Scenario | Expected Outcome |
|---------|-----------|----------|------------------|
| SEC-001 | HTTPS enforcement | All requests over HTTP instead of HTTPS | 401 Unauthorized or 308 redirect (depends on server config) |
| SEC-002 | Password not logged | Signup/login with password; check logs | Password should not appear in access logs |
| SEC-003 | Token not in URL | Ensure token is never in query params | Token in Authorization header only |
| SEC-004 | HSTS header present | Check response headers for HSTS | `Strict-Transport-Security` header present |
| SEC-005 | No sensitive data in error messages | Signup with duplicate email | Error message doesn't leak user existence |
| SEC-006 | Rate limiting on login | 50+ failed login attempts in 1 minute | 429 Too Many Requests after threshold |
| SEC-007 | No default credentials | Attempt login with common defaults | 401 Unauthorized |
| SEC-008 | Helmet security headers | Check all responses for security headers | CSP, X-Frame-Options, X-Content-Type-Options, etc. |

---

## 📊 Test Execution Summary Template

```
Test Suite: LegacyVault Authentication API
Environment: Development (http://localhost:5000/api)
Executed: [Date & Time]
Total Tests: 92+
Passed: [X]
Failed: [Y]
Skipped: [Z]

Critical Issues Found:
- [Issue 1]
- [Issue 2]

Medium Issues Found:
- [Issue 1]

Recommendations:
- [Action 1]
- [Action 2]
```

---

## 📝 Implementation Notes

### Tools Recommended:
1. **Postman** - API testing, collection runner
2. **Newman** - CLI runner for Postman collections
3. **Jest** - Unit/integration testing
4. **Supertest** - HTTP assertions for Express
5. **OWASP ZAP** - Security scanning
6. **Locust** - Load/stress testing

### Running Tests:
```bash
# Run Postman collection
newman run LegacyVault-Auth-Tests.postman_collection.json --environment dev.postman_environment.json

# Run Jest tests
npm test -- --testPathPattern=auth

# OWASP ZAP scanning
zaproxy -cmd -quickurl http://localhost:5000/api -quickout results.html
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-01  
**Maintained By:** QA Automation Team
