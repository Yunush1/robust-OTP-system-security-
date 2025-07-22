# OTP System with Progressive Rate Limiting

## Overview
Enhanced OTP (One-Time Password) system with progressive delays and 24-hour blocking to prevent abuse while maintaining user experience.

## Key Features

### 🔒 Security Features
- **SHA-256 OTP Hashing** - All OTPs are hashed before storage
- **Progressive Rate Limiting** - Increasing delays after multiple attempts
- **24-Hour Auto-Block** - Temporary block after excessive attempts
- **Input Validation** - Email format and OTP format validation
- **Attempt Tracking** - Per-OTP attempt counting with 3-attempt limit

### ⏱️ Rate Limiting Strategy
| Attempt | Delay | Action |
|---------|-------|--------|
| 1-3     | None  | Send immediately |
| 4th     | 5min  | Wait before next request |
| 5th     | 10min | Wait before next request |
| 6th     | 20min | Wait before next request |
| 7th     | 40min | Wait before next request |
| 8th+    | 80min | Wait before next request |
| After 7 attempts | 24hrs | Complete block |

## API Endpoints

### 1. Send OTP
**POST** `/api/send-otp`

```json
{
  "email": "user@example.com"
}
```

**Responses:**
```json
// Success
{
  "message": "OTP sent successfully",
  "attempt": 2,
  "warning": "Next OTP request will have a 5 minute delay."
}

// Rate Limited
{
  "error": "Please wait 15 minutes before requesting another OTP."
}

// Blocked
{
  "error": "You have been blocked from requesting OTP. Please try again after 12 hours."
}
```

### 2. Verify OTP
**POST** `/api/verify-otp`

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Responses:**
```json
// Success
{
  "message": "OTP verified successfully",
  "data": {
    "token": "jwt_token_here",
    "user": { /* user object */ },
    "total_points": 150
  }
}

// Invalid OTP
{
  "error": "Invalid OTP. 2 attempts remaining."
}

// Too Many Attempts
{
  "error": "Too many failed attempts. OTP blocked for 5 minutes."
}
```

## Database Schema

### OTP Verification Table
```sql
otp_verification {
  id: Primary Key
  email: String (indexed)
  otp_number: String (SHA-256 hashed)
  is_verified: Boolean
  otp_count: Integer (attempt number)
  attempt_count: Integer (verification attempts)
  expires_in: DateTime (10min validity)
  blockUntil: DateTime (optional)
  createdAt: DateTime (indexed)
}
```

## Technical Implementation

### Progressive Delay Logic
```javascript
// Delay calculation based on total attempts
switch (totalAttempts) {
  case 3: requiredDelayMinutes = 5; break;
  case 4: requiredDelayMinutes = 10; break;
  case 5: requiredDelayMinutes = 20; break;
  case 6: requiredDelayMinutes = 40; break;
  default: requiredDelayMinutes = 80;
}
```

### Security Measures
- **Time-based tracking** - 24-hour rolling window
- **Active OTP check** - Prevents multiple valid OTPs
- **Hashed storage** - OTPs never stored in plaintext
- **Automatic cleanup** - Old records removed after 24 hours

## Configuration

### Environment Variables
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
JWT_SECRET=your-jwt-secret
```

### OTP Settings
- **Length**: 6 digits (100000-999999)
- **Validity**: 10 minutes
- **Max Verification Attempts**: 3 per OTP
- **Verification Block**: 5 minutes after max attempts

## Monitoring & Maintenance

### Recommended Tasks
1. **Daily Cleanup** - Run `cleanupOldOtpRecords()` via cron
2. **Database Indexes** - Ensure indexes on `email` and `createdAt`
3. **Rate Limit Monitoring** - Track blocked users for abuse patterns
4. **Email Delivery Monitoring** - Monitor SMTP failures

### Performance Considerations
- Uses database queries with proper indexing
- Minimal memory footprint with time-based cleanup
- Efficient lookup with sorted results by creation time

## Security Benefits
- **Brute Force Prevention** - Progressive delays make attacks impractical
- **Account Lockout Protection** - Temporary blocks prevent permanent lockouts
- **Resource Conservation** - Rate limiting reduces server load
- **User Experience** - Clear feedback on wait times and remaining attempts
