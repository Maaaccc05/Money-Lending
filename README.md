# 💰 MoneyLender — Community P2P Lending Management System

A complete full-stack internal loan management system for community coordinators ("Control") to track loans, lenders, borrowers, interest calculations, and payments.

---

## 🗂️ Project Structure

```
Money lender/
├── server/           ← Node.js / Express / MongoDB API
└── client/           ← React / Vite / TailwindCSS Frontend
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18+ (check: `node --version`)
- **MongoDB** running locally on port `27017`
  - Install: https://www.mongodb.com/try/download/community
  - Or use MongoDB Atlas (update `MONGO_URI` in `.env`)

---

### Step 1 — Configure Backend

Edit `server/.env` if you want to change credentials:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/money_lender_db
JWT_SECRET=moneylender_super_secret_jwt_key_2024
JWT_EXPIRE=7d
ADMIN_USERNAME=control
ADMIN_PASSWORD=Control@123
```

> **Default login:** username: `control`, password: `Control@123`

---

### Step 2 — Install & Start Backend

```bash
cd server
npm install       # (already done)
npm run dev       # Development with nodemon
# or
npm start         # Production
```

Backend runs on: **http://localhost:5000**

---

### Step 3 — Install & Start Frontend

```bash
cd client
npm install       # (already done)
npm run dev       # Development server
```

Frontend runs on: **http://localhost:5173**

---

## 🔐 Login Credentials

| Field    | Value        |
|----------|--------------|
| Username | `control`    |
| Password | `Control@123`|

---

## 📐 Interest Calculation Formula

```
Daily Rate = Annual Rate / 365
Interest   = Principal × Daily Rate × Number of Days
```

**Example (₹1,00,000 @ 12% for 30 days):**
- Daily Rate = 12 / 100 / 365 = 0.000328767
- Interest = 1,00,000 × 0.000328767 × 30 = ₹986.30

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint            | Description |
|--------|---------------------|-------------|
| POST   | `/api/auth/login`   | Admin login |
| GET    | `/api/auth/me`      | Get current user |

### Borrowers
| Method | Endpoint                    | Description |
|--------|-----------------------------|-------------|
| GET    | `/api/borrowers`            | All borrowers |
| POST   | `/api/borrowers`            | Create borrower |
| GET    | `/api/borrowers/search?q=`  | Search borrowers |
| GET    | `/api/borrowers/:id`        | Get one borrower |
| PUT    | `/api/borrowers/:id`        | Update borrower |

### Lenders
| Method | Endpoint                    | Description |
|--------|-----------------------------|-------------|
| GET    | `/api/lenders`              | All lenders |
| POST   | `/api/lenders`              | Create lender |
| GET    | `/api/lenders/search?q=`    | Search lenders |
| GET    | `/api/lenders/:id`          | Get one lender |
| PUT    | `/api/lenders/:id`          | Update lender |

### Loans
| Method | Endpoint                        | Description |
|--------|---------------------------------|-------------|
| GET    | `/api/loans`                    | All loans (optional ?status=) |
| POST   | `/api/loans`                    | Create loan |
| GET    | `/api/loans/:id`                | Loan details |
| PUT    | `/api/loans/:id`                | Update loan |
| POST   | `/api/loans/:id/add-lender`     | Add lender to existing loan |
| GET    | `/api/loans/borrower/:id`       | Loans by borrower |
| GET    | `/api/loans/lender/:id`         | Loans by lender |

### Interest
| Method | Endpoint                        | Description |
|--------|---------------------------------|-------------|
| POST   | `/api/interest/generate/:loanId`| Generate interest cycle |
| GET    | `/api/interest/pending`         | All pending interest |
| POST   | `/api/interest/receive`         | Record payment |
| GET    | `/api/interest/loan/:id`        | Interest for a loan |
| GET    | `/api/interest/payments/:id`    | Payments for a loan |

### Reports
| Method | Endpoint                        | Description |
|--------|---------------------------------|-------------|
| GET    | `/api/reports/current-loans`    | Active loans report |
| GET    | `/api/reports/loans-by-borrower`| Grouped by borrower |
| GET    | `/api/reports/loans-by-lender`  | Grouped by lender |
| GET    | `/api/reports/family-group?type=`| Family group stats |
| GET    | `/api/reports/pending-interest` | Pending interest report |

---

## 💡 Workflow Guide

### Creating a Loan
1. Go to **Borrowers** → Add borrower
2. Go to **Lenders** → Add lender(s)
3. Go to **Create Loan**:
   - Search & select borrower
   - Set disbursement date, annual interest rate, interest period
   - Add 1 or more lenders with their contributed amounts and individual rates
   - Submit to create with auto-generated Loan ID (e.g., `LN-2024-00001`)

### Recording Interest
1. Go to **Loan Details** → "Generate Next Interest Cycle"
   - Creates interest records for each lender separately
   - Uses the formula: `Principal × (Rate/365) × Days`
2. When interest is paid: click **"Mark Paid"** and enter payment date

### Viewing Reports
- Go to **Reports** → click any report card to load it

---

## 🗄️ Database Schema Summary

| Collection       | Key Fields |
|-------------------|-----------|
| `borrowers`      | name, surname, familyGroup, dob, panNumber, aadhaarNumber, bank info |
| `lenders`        | same as borrowers |
| `loans`          | loanId (auto), borrowerId, totalLoanAmount, interestRateAnnual, interestPeriodMonths, lenders[] |
| `interestrecords`| loanId, lenderId, principalAmount, interestRate, startDate, endDate, daysCount, interestAmount, status |
| `interestpayments`| loanId, lenderId, interestRecordId, amountPaid, paymentDate |

---

## 🛠️ Tech Stack

**Backend**: Node.js • Express.js • MongoDB • Mongoose • JWT • Day.js • bcryptjs

**Frontend**: React.js (Vite) • TailwindCSS v4 • React Router v6 • Axios • React Hook Form • Day.js
# Money-Lending
