# API DOCUMENTATION

## Overview

The MoneyLend API is a RESTful API for managing loans, borrowers, lenders, and interest calculations. All endpoints require JWT authentication (except login and initialize).

## Authentication

### Login
**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "username": "admin"
  }
}
```

**Headers for Protected Endpoints:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Initialize Admin
**Endpoint:** `POST /api/auth/initialize`

**Note:** Call only once, creates initial admin account

---

## Borrowers

### Create Borrower
**Endpoint:** `POST /api/borrowers`

**Request:**
```json
{
  "name": "Raj",
  "surname": "Kumar",
  "dob": "1990-01-15",
  "address": "123 Main Street, City",
  "panNumber": "ABCDE1234F",
  "aadhaarNumber": "123456789012",
  "bankAccountNumber": "1234567890123456",
  "ifscCode": "SBIN0001234",
  "bankName": "State Bank of India",
  "branch": "Main Branch"
}
```

**Response (201):**
```json
{
  "message": "Borrower created successfully",
  "borrower": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Raj",
    "surname": "Kumar",
    "dob": "1990-01-15",
    "address": "123 Main Street, City",
    "ifscCode": "SBIN0001234",
    "bankName": "State Bank of India",
    "branch": "Main Branch",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get All Borrowers
**Endpoint:** `GET /api/borrowers?page=1&limit=10`

**Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 10

**Response (200):**
```json
{
  "borrowers": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Raj",
      "surname": "Kumar",
      "dob": "1990-01-15",
      "address": "123 Main Street, City",
      "ifscCode": "SBIN0001234",
      "bankName": "State Bank of India",
      "branch": "Main Branch"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### Search Borrowers
**Endpoint:** `GET /api/borrowers/search?query=raj`

**Parameters:**
- `query` (required): Search string (min 2 characters)

**Response (200):**
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Raj",
    "surname": "Kumar",
    "bankName": "State Bank of India"
  }
]
```

### Get Borrower by ID
**Endpoint:** `GET /api/borrowers/:id`

**Parameters:**
- `id` (required): Borrower ID

**Response (200):** Same as Get All Borrowers (single item)

### Update Borrower
**Endpoint:** `PUT /api/borrowers/:id`

**Request:** (partial update)
```json
{
  "address": "456 New Street, City",
  "bankName": "HDFC Bank"
}
```

**Note:** Cannot update sensitive fields (panNumber, aadhaarNumber, bankAccountNumber)

---

## Lenders

### Create Lender
**Endpoint:** `POST /api/lenders`

**Request:**
```json
{
  "name": "Priya",
  "surname": "Singh",
  "familyGroup": "Singh Family",
  "dob": "1985-05-20",
  "address": "456 Oak Street, City",
  "panNumber": "FGHIJ5678K",
  "aadhaarNumber": "987654321098",
  "bankAccountNumber": "9876543210987654",
  "ifscCode": "HDFC0005678",
  "bankName": "HDFC Bank",
  "branch": "Downtown"
}
```

**Response:** Similar to Borrower create

### Get All Lenders
**Endpoint:** `GET /api/lenders?page=1&limit=10`

**Response:** Same structure as borrowers

### Get Lenders by Family Group
**Endpoint:** `GET /api/lenders/family-group?familyGroup=Singh%20Family`

**Response (200):**
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Priya",
    "surname": "Singh",
    "familyGroup": "Singh Family",
    "bankName": "HDFC Bank"
  }
]
```

### Search Lenders
**Endpoint:** `GET /api/lenders/search?query=priya`

---

## Loans

### Create Loan
**Endpoint:** `POST /api/loans`

**Request:**
```json
{
  "borrowerId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "totalLoanAmount": 1000000,
  "disbursementDate": "2024-01-15",
  "interestRateAnnual": 12,
  "interestPeriodMonths": 3,
  "lenders": [
    {
      "lenderId": "65a1b2c3d4e5f6g7h8i9j0k2",
      "amountContributed": 600000,
      "lenderInterestRate": 12,
      "moneyReceivedDate": "2024-01-15"
    },
    {
      "lenderId": "65a1b2c3d4e5f6g7h8i9j0k3",
      "amountContributed": 400000,
      "lenderInterestRate": 12,
      "moneyReceivedDate": "2024-01-15"
    }
  ]
}
```

**Validation:**
- Total contributed must equal totalLoanAmount
- At least one lender required
- Valid borrowerId and lenderIds required

**Response (201):**
```json
{
  "message": "Loan created successfully",
  "loan": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
    "loanId": "LOAN-1705328400000-1",
    "borrowerId": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Raj",
      "surname": "Kumar"
    },
    "totalLoanAmount": 1000000,
    "disbursementDate": "2024-01-15",
    "interestRateAnnual": 12,
    "interestPeriodMonths": 3,
    "status": "active",
    "lenders": [...]
  }
}
```

### Get All Loans
**Endpoint:** `GET /api/loans?page=1&limit=10&status=active`

**Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): 'active' or 'closed'

### Get Loan by ID
**Endpoint:** `GET /api/loans/:id`

### Get Loans by Borrower
**Endpoint:** `GET /api/loans/borrower/:borrowerId`

**Response:** Array of loans for borrower

### Get Loans by Lender
**Endpoint:** `GET /api/loans/lender/:lenderId`

**Response:** Array of loans where lender participated

### Add Lender to Loan
**Endpoint:** `POST /api/loans/:id/add-lender`

**Request:**
```json
{
  "lenderId": "65a1b2c3d4e5f6g7h8i9j0k5",
  "amountContributed": 100000,
  "lenderInterestRate": 12,
  "moneyReceivedDate": "2024-01-20"
}
```

### Update Loan Status
**Endpoint:** `PUT /api/loans/:id/status`

**Request:**
```json
{
  "status": "closed"
}
```

**Values:** 'active' or 'closed'

---

## Interest

### Generate Interest Records
**Endpoint:** `POST /api/interest/generate/:loanId`

**Request:**
```json
{
  "startDate": "2024-01-15"
}
```

**Response (201):**
```json
{
  "message": "Interest generated successfully",
  "records": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k6",
      "loanId": "65a1b2c3d4e5f6g7h8i9j0k4",
      "lenderId": "65a1b2c3d4e5f6g7h8i9j0k2",
      "principalAmount": 600000,
      "interestRate": 12,
      "startDate": "2024-01-15",
      "endDate": "2024-04-15",
      "daysCount": 92,
      "interestAmount": 18123.29,
      "status": "pending"
    }
  ]
}
```

### Get Pending Interest
**Endpoint:** `GET /api/interest/pending?page=1&limit=10`

**Response (200):**
```json
{
  "records": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k6",
      "loanId": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
        "loanId": "LOAN-1705328400000-1"
      },
      "lenderId": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
        "name": "Priya",
        "surname": "Singh"
      },
      "interestAmount": 18123.29,
      "status": "pending",
      "endDate": "2024-04-15"
    }
  ],
  "pagination": {...}
}
```

### Record Interest Payment
**Endpoint:** `POST /api/interest/record-payment`

**Request:**
```json
{
  "interestRecordId": "65a1b2c3d4e5f6g7h8i9j0k6",
  "amountPaid": 18123.29,
  "paymentDate": "2024-04-15"
}
```

**Response (201):**
```json
{
  "message": "Interest payment recorded successfully",
  "payment": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k7",
    "loanId": "65a1b2c3d4e5f6g7h8i9j0k4",
    "lenderId": "65a1b2c3d4e5f6g7h8i9j0k2",
    "interestRecordId": "65a1b2c3d4e5f6g7h8i9j0k6",
    "amountPaid": 18123.29,
    "paymentDate": "2024-04-15"
  }
}
```

### Get Interest Records for Loan
**Endpoint:** `GET /api/interest/:loanId`

**Response (200):** Array of interest records for loan

---

## Reports

### Dashboard Statistics
**Endpoint:** `GET /api/reports/dashboard-stats`

**Response (200):**
```json
{
  "stats": {
    "totalBorrowers": 25,
    "totalLenders": 15,
    "activeLoans": 18,
    "closedLoans": 7,
    "totalLoanAmount": 50000000,
    "pendingInterest": 2500000,
    "collectedInterest": 1500000
  },
  "monthlyCollection": [
    {
      "_id": "2024-01",
      "amount": 250000
    },
    {
      "_id": "2024-02",
      "amount": 350000
    }
  ]
}
```

### Current Loans
**Endpoint:** `GET /api/reports/current-loans`

### Loans by Borrower
**Endpoint:** `GET /api/reports/loans-by-borrower?borrowerId=optional`

### Loans by Lender
**Endpoint:** `GET /api/reports/loans-by-lender?lenderId=optional`

### Loans by Family Group
**Endpoint:** `GET /api/reports/loans-by-family-group?familyGroup=familyName`

### Pending Interest Report
**Endpoint:** `GET /api/reports/pending-interest`

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "panNumber",
      "message": "Valid PAN number is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "message": "Invalid credentials"
}
```

### 404 Not Found
```json
{
  "message": "Borrower not found"
}
```

### 500 Server Error
```json
{
  "message": "Server error" // In production
  "message": "Detailed error message" // In development
}
```

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production:
```bash
npm install express-ratelimit
```

## Pagination

All list endpoints support pagination:
- `page`: Current page (default 1)
- `limit`: Items per page (default 10)

Response includes:
```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10
  }
}
```

## Status Codes

- `200`: OK
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Server Error

---

**API Version:** 1.0.0  
**Last Updated:** March 2026
