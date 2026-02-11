# Steel Project API Documentation

## Base URL
```
http://localhost:3001/v1
```

## Authentication
All endpoints (except auth) require Bearer Token in header:
```
Authorization: Bearer <token>
```

---

## 🔐 AUTH (`/auth`)

### Send OTP
```http
POST /auth/send-otp
Content-Type: application/json

{
  "phoneNo": 2222222222,
  "countryCode": "91"
}
```
**Response:**
```json
{
  "success": true,
  "message": "OTP sent",
  "expiresAt": "2026-02-11T22:34:00.000Z"
}
```

---

### Verify OTP & Login
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phoneNo": 2222222222,
  "countryCode": "91",
  "otp": "123456"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "...",
    "name": "dealer 1",
    "phoneNo": 2222222222,
    "role": "DLR",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1..."
}
```

---

### Get Profile
```http
GET /auth/profile
Headers: Authorization: Bearer <token>
```

---

### Update Profile
```http
PUT /auth/profile
Headers: Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name"
}
```

---

## 👤 USER MANAGEMENT (`/users`)

### Create User (SA only)
```http
POST /users/create
Headers: Authorization: Bearer <SA_token>
Content-Type: application/json

{
  "name": "John Doe",
  "phoneNo": 9999999999,
  "countryCode": "91",
  "role": "ASO"  // SA, ASO, DLR, BBR
}
```

---

### Get All Users (SA only)
```http
GET /users/all?adminId=<SA_ID>
Headers: Authorization: Bearer <SA_token>
```

---

### Update User Status (SA only)
```http
PUT /users/:id/status
Headers: Authorization: Bearer <SA_token>
Content-Type: application/json

{
  "adminId": "<SA_ID>",
  "status": "active"  // active, blocked
}
```

---

### Delete User (SA only)
```http
DELETE /users/:id?adminId=<SA_ID>
Headers: Authorization: Bearer <SA_token>
```

---

## 📦 STOCK DISPATCH (`/stock-dispatch`)

### Get Mapped Dealers (ASO)
```http
GET /stock-dispatch/mapped-dealers?asoId=<ASO_ID>
Headers: Authorization: Bearer <ASO_token>
```

---

### Get Products
```http
GET /stock-dispatch/products
Headers: Authorization: Bearer <token>
```

---

### Dispatch Stock (ASO → Dealer)
```http
POST /stock-dispatch/dispatch
Headers: Authorization: Bearer <ASO_token>
Content-Type: application/json

{
  "asoId": "<ASO_ID>",
  "dealerId": "<DEALER_ID>",
  "productId": "<PRODUCT_ID>",
  "quantityKg": 50
}
```

---

### Get Pending Stock (Dealer)
```http
GET /stock-dispatch/pending?dealerId=<DEALER_ID>
Headers: Authorization: Bearer <DEALER_token>
```

---

### Get Received Stock (Dealer)
```http
GET /stock-dispatch/received?dealerId=<DEALER_ID>
Headers: Authorization: Bearer <DEALER_token>
```

---

### Receive Stock (Dealer)
```http
POST /stock-dispatch/receive
Headers: Authorization: Bearer <DEALER_token>
Content-Type: application/json

{
  "dispatchId": "<DISPATCH_ID>",
  "dealerId": "<DEALER_ID>"
}
```

---

### Get Summary
```http
GET /stock-dispatch/summary/:dealerId
Headers: Authorization: Bearer <token>
```

---

## 🏪 BARBENDER (`/barbender`)

### Get My Barbenders (Dealer)
```http
GET /barbender/dealer/barbenders?dealerId=<DEALER_ID>
Headers: Authorization: Bearer <DEALER_token>
```

---

### Create Barbender (Dealer)
```http
POST /barbender/dealer/barbender
Headers: Authorization: Bearer <DEALER_token>
Content-Type: application/json

{
  "dealerId": "<DEALER_ID>",
  "name": "Barbender 1",
  "phoneNo": 3333333333,
  "countryCode": "91"
}
```

---

### Update Barbender Status (Dealer)
```http
PUT /barbender/dealer/barbender/:id/status
Headers: Authorization: Bearer <DEALER_token>
Content-Type: application/json

{
  "dealerId": "<DEALER_ID>",
  "status": "blocked"  // blocked, deleted
}
```

---

### Get Barbender QR Code
```http
GET /barbender/barbender/qr/:id
Headers: Authorization: Bearer <token>
```

---

### Sell to Barbender (Dealer - QR Scan)
```http
POST /barbender/dealer/sell
Headers: Authorization: Bearer <DEALER_token>
Content-Type: application/json

{
  "dealerId": "<DEALER_ID>",
  "barbenderUserId": "<BARBENDER_ID>",
  "productId": "<PRODUCT_ID>",
  "quantityKg": 10
}
```

---

### Get Sales History (Dealer)
```http
GET /barbender/dealer/sales?dealerId=<DEALER_ID>
Headers: Authorization: Bearer <DEALER_token>
```

---

## 🗺️ MAPPING (`/mapping`)

### Get Unmapped Dealers (SA)
```http
GET /mapping/unmapped-dealers?adminId=<SA_ID>
Headers: Authorization: Bearer <SA_token>
```

---

### Get Unmapped ASOs (SA)
```http
GET /mapping/unmapped-asos?adminId=<SA_ID>
Headers: Authorization: Bearer <SA_token>
```

---

### Map ASO to Dealer (SA)
```http
POST /mapping/aso-dealer
Headers: Authorization: Bearer <SA_token>
Content-Type: application/json

{
  "adminId": "<SA_ID>",
  "asoId": "<ASO_ID>",
  "dealerId": "<DEALER_ID>"
}
```

---

### Get All Mappings (SA)
```http
GET /mapping/all?adminId=<SA_ID>
Headers: Authorization: Bearer <SA_token>
```

---

### Remove Mapping (SA)
```http
DELETE /mapping/aso-dealer?adminId=<SA_ID>&dealerId=<DEALER_ID>
Headers: Authorization: Bearer <SA_token>
```

---

## 🎁 REWARD (`/reward`)

### Get Dealer Reward Summary
```http
GET /reward/dealer/reward-summary?dealerId=<DEALER_ID>
Headers: Authorization: Bearer <DEALER_token>
```

**Response:**
```json
{
  "success": true,
  "period": { "start": "...", "end": "..." },
  "totalKg": 500,
  "eligibleKg": 500,
  "rewardKg": 25,
  "currentBalance": 100
}
```

---

### Claim Dealer Reward
```http
POST /reward/dealer/claim-reward
Headers: Authorization: Bearer <DEALER_token>
Content-Type: application/json

{
  "dealerId": "<DEALER_ID>"
}
```

---

### Get Barbender Reward Summary
```http
GET /reward/barbender/reward-summary?barbenderId=<BBR_ID>
Headers: Authorization: Bearer <BBR_token>
```

---

### Claim Barbender Reward
```http
POST /reward/barbender/claim-reward
Headers: Authorization: Bearer <BBR_token>
Content-Type: application/json

{
  "barbenderId": "<BBR_ID>"
}
```

---

## 🏷️ PRODUCT (`/products`)

### Get All Products
```http
GET /products
Headers: Authorization: Bearer <token>
```

---

### Create Product (SA)
```http
POST /products
Headers: Authorization: Bearer <SA_token>
Content-Type: application/json

{
  "productName": "Steel Rod 12mm",
  "productCode": "STL-006",
  "description": "High quality steel rod",
  "isActive": true
}
```

---

### Update Product (SA)
```http
PUT /products/:id
Headers: Authorization: Bearer <SA_token>
Content-Type: application/json

{
  "productName": "Updated Name",
  "isActive": true
}
```

---

### Delete Product (SA)
```http
DELETE /products/:id
Headers: Authorization: Bearer <SA_token>
```

---

## 📊 RESPONSE CODES

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 500 | Server Error |

---

## 🔑 USER ROLES

| Role | Code | Description |
|------|------|-------------|
| Super Admin | SA | Full system access |
| ASO | ASO | Area Sales Officer - manages dealers |
| Dealer | DLR | Sells to barbenders |
| Barbender | BBR | End customer |

---

## 🎯 REWARD SYSTEM

- **Every 100kg sold = 5kg reward (5%)**
- Monthly calculation period
- Both Dealer and Barbender earn rewards
- Claims saved to `Reward` collection

---

## 📁 MIDDLEWARE

### Authentication Middleware
```typescript
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

router.get("/protected-route", authMiddleware, (req: AuthRequest, res) => {
  // req.user contains decoded token
  // { _id, role, phoneNo }
});
```

### Role-Based Middleware
```typescript
import { requireRole, requireSuperAdmin, requireASO, requireDealer } from "../middleware";

// Single role
router.post("/admin-only", authMiddleware, requireSuperAdmin, handler);

// Multiple roles
router.post("/sales-routes", authMiddleware, requireAdminOrASO, handler);

// Specific helpers
router.post("/dealer-only", authMiddleware, requireDealer, handler);
```

---

## 📁 DATA COLLECTIONS

| Collection | Description |
|------------|-------------|
| `users` | All users (SA, ASO, DLR, BBR) |
| `stockdispatches` | ASO → Dealer stock movements |
| `barbendersales` | Dealer → Barbender sales |
| `asodmappings` | ASO-Dealer mappings |
| `rewards` | Reward records |
| `products` | Product master |
| `otps` | OTP verification |
| `daily stocks` | Daily stock summaries |
