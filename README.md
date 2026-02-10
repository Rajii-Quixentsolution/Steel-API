# Steel API

Backend API for Steel project with phone number + OTP authentication.

## Features

- Phone number + OTP verification
- Role-based authentication (SA, ASO, DLR, BBR)
- JWT token generation
- Rate limiting for OTP requests
- MongoDB integration

## Users

| Phone Number | Role | Name |
|-------------|------|------|
| 9999999999 | SA | Super Admin |
| 8888888888 | ASO | ASO |
| 7777777777 | DLR | Dealer |
| 6666666666 | BBR | Barbender |

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and other settings
```

3. Seed users to MongoDB:
```bash
npm run seed
```

4. Start development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run seed` - Seed users to MongoDB
- `npm run lint` - Run ESLint

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 3000) |
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | Secret key for JWT tokens |
| FAST2SMS_API_KEY | SMS API key (use "test_api_key" for test mode) |
| FAST2SMS_URL | SMS API URL |

## API Endpoints

### Authentication
- `POST /v1/auth/send-verification-code` - Send OTP
- `POST /v1/auth/verify-code` - Verify OTP and login
- `POST /v1/auth/verify-token` - Verify JWT token
- `GET /v1/auth/profile` - Get user profile

## License

MIT
