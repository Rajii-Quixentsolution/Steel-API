# Steel Project API - Complete Postman Collection

Here's the complete list of all API endpoints with sample data for testing in Postman:

## Base URL
```
http://localhost:3001/v1
```

## Authentication Required
All endpoints (except auth) require Bearer Token in header:
```
Authorization: Bearer <token>
```

---

## 🔐 AUTH ENDPOINTS

### 1. Send OTP
**POST** `/auth/send-verification-code`
```json
{
  "phoneNo": 2222222222,
  "countryCode": "91"
}
```

### 2. Verify OTP & Login
**POST** `/auth/verify-code`
```json
{
  "phoneNo": 2222222222,
  "countryCode": "91",
  "otp": "123456"
}
```

### 3. Get Profile
**GET** `/auth/profile`

### 4. Update Profile
**PUT** `/auth/profile`
```json
{
  "name": "Updated Name"
}
```

### 5. Barbender Self-Registration
**POST** `/auth/register-barbender`
```json
{
  "countryCode": "91",
  "phoneNo": 4444444444,
  "name": "John Doe",
  "email": "john@example.com"
}
```

---

## 👤 USER MANAGEMENT (Super Admin Only)

### 5. Create User
**POST** `/users/create`
```json
{
  "name": "John Doe",
  "phoneNo": 9999999999,
  "countryCode": "91",
  "role": "ASO"
}
```

### 6. Get All Users
**GET** `/users/all?adminId=698c85c8b45d54a215628ca6`

### 7. Update User Status
**PUT** `/users/699695206b95eb5057996cfa/status`
```json
{
  "adminId": "698c85c8b45d54a215628ca6",
  "status": "active"
}
```

### 8. Delete User
**DELETE** `/users/699695206b95eb5057996cfa?adminId=698c85c8b45d54a215628ca6`

---

## 📦 STOCK DISPATCH

### 9. Get Mapped Dealers (ASO)
**GET** `/stock-dispatch/mapped-dealers?asoId=699695206b95eb5057996cfa`

### 10. Get Products
**GET** `/stock-dispatch/products`

### 11. Dispatch Stock (ASO to Dealer)
**POST** `/stock-dispatch/dispatch`
```json
{
  "asoId": "699695206b95eb5057996cfa",
  "dealerId": "699695406b95eb5057996cfe",
  "productId": "699695406b95eb5057996cff",
  "quantityKg": 50
}
```

### 12. Get Pending Stock (Dealer)
**GET** `/stock-dispatch/pending?dealerId=699695406b95eb5057996cfe`

### 13. Get Received Stock (Dealer)
**GET** `/stock-dispatch/received?dealerId=699695406b95eb5057996cfe`

### 14. Receive Stock (Dealer)
**POST** `/stock-dispatch/receive`
```json
{
  "dispatchId": "699695406b95eb5057996cfe",
  "dealerId": "699695406b95eb5057996cfe"
}
```

---

## 🗺️ MAPPING (Super Admin Only)

### 15. Get Unmapped Dealers
**GET** `/mapping/unmapped-dealers?adminId=698c85c8b45d54a215628ca6`

### 16. Get Unmapped ASOs
**GET** `/mapping/unmapped-asos?adminId=698c85c8b45d54a215628ca6`

### 17. Map ASO to Dealer
**POST** `/mapping/aso-dealer`
```json
{
  "adminId": "698c85c8b45d54a215628ca6",
  "asoId": "699695206b95eb5057996cfa",
  "dealerId": "699695406b95eb5057996cfe"
}
```

### 18. Get All Mappings
**GET** `/mapping/all?adminId=698c85c8b45d54a215628ca6`

### 19. Remove Mapping
**DELETE** `/mapping/aso-dealer?adminId=698c85c8b45d54a215628ca6&dealerId=699695406b95eb5057996cfe`

---

## 🏪 BARBENDER

### 20. Get My Barbenders (Dealer)
**GET** `/barbender/dealer/barbenders?dealerId=699695406b95eb5057996cfe`

### 21. Create Barbender (Dealer)
**POST** `/barbender/dealer/barbender`
```json
{
  "dealerId": "699695406b95eb5057996cfe",
  "name": "Barbender 1",
  "phoneNo": 3333333333,
  "countryCode": "91"
}
```

### 22. Update Barbender Status (Dealer)
**PUT** `/barbender/dealer/barbender/699695406b95eb5057996cff/status`
```json
{
  "dealerId": "699695406b95eb5057996cfe",
  "status": "blocked"
}
```

### 23. Get Barbender QR Code
**GET** `/barbender/barbender/qr/699695406b95eb5057996cff`

### 24. Sell to Barbender (Dealer - QR Scan)
**POST** `/barbender/dealer/sell`
```json
{
  "dealerId": "699695406b95eb5057996cfe",
  "barbenderUserId": "699695406b95eb5057996cff",
  "productId": "699695406b95eb5057996cff",
  "quantityKg": 10
}
```

### 25. Get Sales History (Dealer)
**GET** `/barbender/dealer/sales?dealerId=699695406b95eb5057996cfe`

---

## 🎁 REWARD

### 26. Get Dealer Reward Summary
**GET** `/reward/dealer/reward-summary?dealerId=699695406b95eb5057996cfe`

### 27. Claim Dealer Reward
**POST** `/reward/dealer/claim-reward`
```json
{
  "dealerId": "699695406b95eb5057996cfe"
}
```

### 28. Get Barbender Reward Summary
**GET** `/reward/barbender/reward-summary?barbenderId=699695406b95eb5057996cff`

### 29. Claim Barbender Reward
**POST** `/reward/barbender/claim-reward`
```json
{
  "barbenderId": "699695406b95eb5057996cff"
}
```

---

## 🏷️ PRODUCT

### 30. Get All Products
**GET** `/products`

### 31. Create Product (Super Admin)
**POST** `/products`
```json
{
  "productName": "Steel Rod 12mm",
  "productCode": "STL-006",
  "description": "High quality steel rod",
  "isActive": true
}
```

### 32. Update Product (Super Admin)
**PUT** `/products/699695406b95eb5057996cff`
```json
{
  "productName": "Updated Name",
  "isActive": true
}
```

### 33. Delete Product (Super Admin)
**DELETE** `/products/699695406b95eb5057996cff`

---

## 📊 DASHBOARD (Super Admin Only)

### 34. Get Dashboard Summary
**GET** `/dashboard/summary?adminId=698c85c8b45d54a215628ca6&days=5`

### 35. Get Dashboard Counts
**GET** `/dashboard/counts?adminId=698c85c8b45d54a215628ca6&days=5`

### 36. Get Pending Details
**GET** `/dashboard/pending-details?adminId=698c85c8b45d54a215628ca6&days=5&type=all`

---

## 🏞️ AREA MANAGEMENT

### 37. Get All Areas
**GET** `/area`

### 38. Create Area (Super Admin)
**POST** `/area`
```json
{
  "areaName": "North Zone",
  "isActive": true
}
```

### 39. Update Area (Super Admin)
**PUT** `/area/699695406b95eb5057996cff`
```json
{
  "areaName": "Updated North Zone",
  "isActive": true
}
```

### 40. Delete Area (Super Admin)
**DELETE** `/area/699695406b95eb5057996cff`

---

## USER ROLES

| Role | Code | Description |
|------|------|-------------|
| Super Admin | SA | Full system access |
| ASO | ASO | Area Sales Officer - manages dealers |
| Dealer | DLR | Sells to barbenders |
| Barbender | BBR | End customer |

---

## SAMPLE TEST DATA

### User IDs for Testing:
- **Super Admin**: `698c85c8b45d54a215628ca6`
- **ASO**: `699695206b95eb5057996cfa`
- **Dealer**: `699695406b95eb5057996cfe`
- **Barbender**: `699695406b95eb5057996cff`
- **Product**: `699695406b95eb5057996cff`

### Phone Numbers:
- Super Admin: `1111111111`
- ASO: `2222222222`
- Dealer: `3333333333`
- Barbender: `4444444444`

### OTP: `123456`

---

## TESTING WORKFLOW

1. **Start with Authentication**:
   - Send OTP to any phone number
   - Verify OTP to get token

2. **Test User Management** (Super Admin only):
   - Create users with different roles
   - Update user status

3. **Test Mapping** (Super Admin only):
   - Map ASO to Dealer
   - Verify mapping appears in ASO dashboard

4. **Test Stock Dispatch**:
   - ASO dispatches stock to dealer
   - Dealer receives stock

5. **Test Barbender Flow**:
   - Dealer creates barbender
   - Dealer sells to barbender
   - Check reward system

6. **Test Dashboard** (Super Admin only):
   - View summary and counts
   - Check pending details

All endpoints follow REST conventions and return JSON responses with success/error status.