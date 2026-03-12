# MoneyLend - Secure Loan Management Platform

A comprehensive, secure loan management system for personal/internal use designed to help coordinators manage loans between borrowers and lenders with advanced interest calculations and reporting.

## 🔒 Security Features

This application implements enterprise-grade security measures:

- **JWT Authentication**: Secure token-based authentication for admin login
- **Password Hashing**: Bcrypt encryption for password storage
- **Sensitive Data Protection**: PAN, Aadhaar, and bank account numbers are masked and not exposed in API responses
- **Input Validation**: Express-validator prevents injection attacks
- **Helmet Security Headers**: HTTP security headers via helmet middleware
- **Environment Variables**: Credentials stored in `.env` files (never in source code)
- **MongoDB Security**: No credentials in source code
- **CORS Protection**: Configured for secure cross-origin requests

## 📋 System Architecture

### Tech Stack

**Backend:**
- Node.js with Express.js
- MongoDB Atlas with Mongoose ODM
- JWT for authentication
- Bcrypt for password hashing
- Day.js for date calculations
- Express-validator for input validation

**Frontend:**
- React 18 with Vite
- React Router v6 for navigation
- Axios for API requests
- TailwindCSS for styling
- Lucide React for icons

## 📁 Project Structure

```
Money Lender 2.0/
├── server/                          # Backend
│   ├── config/
│   │   └── db.js                   # MongoDB connection
│   ├── models/
│   │   ├── Admin.js               # Admin model
│   │   ├── Borrower.js            # Borrower model
│   │   ├── Lender.js              # Lender model
│   │   ├── Loan.js                # Loan model
│   │   ├── InterestRecord.js       # Interest calculation records
│   │   └── InterestPayment.js      # Interest payment history
│   ├── controllers/                # Business logic
│   │   ├── authController.js
│   │   ├── borrowerController.js
│   │   ├── lenderController.js
│   │   ├── loanController.js
│   │   ├── interestController.js
│   │   └── reportController.js
│   ├── routes/                     # API endpoints
│   │   ├── authRoutes.js
│   │   ├── borrowerRoutes.js
│   │   ├── lenderRoutes.js
│   │   ├── loanRoutes.js
│   │   ├── interestRoutes.js
│   │   └── reportRoutes.js
│   ├── middleware/                 # Auth & validation
│   │   ├── authMiddleware.js
│   │   └── validationMiddleware.js
│   ├── services/
│   │   └── interestCalculator.js  # Interest calculation engine
│   ├── server.js                  # Main server file
│   ├── package.json
│   ├── .env.example
│   └── .env                        # (Create locally)
│
├── client/                          # Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Admin login
│   │   │   ├── Dashboard.jsx       # Dashboard with stats
│   │   │   ├── Borrowers.jsx       # Borrower management
│   │   │   ├── Lenders.jsx         # Lender management
│   │   │   ├── CreateLoan.jsx      # Create new loans
│   │   │   ├── CurrentLoans.jsx    # Active loans view
│   │   │   ├── InterestRecords.jsx # Interest tracking
│   │   │   └── Reports.jsx         # Report generation
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   │   ├── Navbar.jsx          # Top navbar
│   │   │   ├── BorrowerForm.jsx    # Form component
│   │   │   ├── LenderForm.jsx      # Form component
│   │   │   ├── LoanTable.jsx       # Table component
│   │   │   └── InterestTable.jsx   # Table component
│   │   ├── services/
│   │   │   └── api.js              # API client
│   │   ├── App.jsx                 # Main app with routing
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── .gitignore
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (cloud database)
- npm or yarn

### Backend Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/money-lender
   JWT_SECRET=your_super_secret_jwt_key_change_this
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_password
   NODE_ENV=development
   ```

5. **Initialize admin user:**
   ```bash
   npm start
   ```
   Then visit `http://localhost:5000/api/auth/initialize` to create the admin account.

6. **Start development server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Open `http://localhost:5173` in browser
   - Login with credentials from `.env` (default: admin/password)

## 📊 Database Schema

### Borrower
- name, surname, dob, address
- panNumber (encrypted), aadhaarNumber (encrypted), bankAccountNumber (encrypted)
- ifscCode, bankName, branch
- Timestamps

### Lender
- name, surname, familyGroup, dob, address
- panNumber (encrypted), aadhaarNumber (encrypted), bankAccountNumber (encrypted)
- ifscCode, bankName, branch
- Timestamps

### Loan
- loanId (unique), borrowerId (ref)
- totalLoanAmount, disbursementDate
- interestRateAnnual, interestPeriodMonths (1, 3, 6)
- status (active, closed)
- lenders array with contribution details

### InterestRecord
- loanId, lenderId (refs)
- principalAmount, interestRate, startDate, endDate
- daysCount, interestAmount
- status (pending, paid)

### InterestPayment
- loanId, lenderId, interestRecordId (refs)
- amountPaid, paymentDate

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/initialize` - Initialize admin

### Borrowers
- `POST /api/borrowers` - Create borrower
- `GET /api/borrowers` - List borrowers (paginated)
- `GET /api/borrowers/search?query=` - Search borrowers
- `GET /api/borrowers/:id` - Get borrower details
- `PUT /api/borrowers/:id` - Update borrower

### Lenders
- `POST /api/lenders` - Create lender
- `GET /api/lenders` - List lenders (paginated)
- `GET /api/lenders/search?query=` - Search lenders
- `GET /api/lenders/:id` - Get lender details
- `PUT /api/lenders/:id` - Update lender

### Loans
- `POST /api/loans` - Create loan
- `GET /api/loans` - List loans (paginated)
- `GET /api/loans/:id` - Get loan details
- `POST /api/loans/:id/add-lender` - Add lender to loan
- `GET /api/loans/borrower/:borrowerId` - Loans by borrower
- `GET /api/loans/lender/:lenderId` - Loans by lender
- `PUT /api/loans/:id/status` - Update loan status

### Interest
- `POST /api/interest/generate/:loanId` - Generate interest records
- `GET /api/interest/pending` - Get pending interest (paginated)
- `POST /api/interest/record-payment` - Record interest payment
- `GET /api/interest/:loanId` - Get interest records for loan

### Reports
- `GET /api/reports/dashboard-stats` - Dashboard statistics
- `GET /api/reports/current-loans` - Current active loans
- `GET /api/reports/loans-by-borrower` - Loans grouped by borrower
- `GET /api/reports/loans-by-lender` - Loans grouped by lender
- `GET /api/reports/loans-by-family-group` - Loans by lender family group
- `GET /api/reports/pending-interest` - Pending interest report

## 💡 Interest Calculation

### Formula
```
Daily Rate = Annual Rate / 365
Interest = Principal × Daily Rate × Number of Days
```

### Example
```
Loan = ₹100,000
Rate = 12% annually
Days = 30

Daily Rate = 12% / 365 = 0.0329%
Interest = 100,000 × 0.000329 × 30 = ₹987.67
```

### Multiple Lenders
Interest is calculated separately for each lender based on their contributed amount:

```
Loan = ₹10,00,000
Lender A = ₹3,00,000
Lender B = ₹2,00,000
Lender C = ₹4,00,000
Lender D = ₹1,00,000

Interest for A = 3,00,000 × rate × days
Interest for B = 2,00,000 × rate × days
... and so on
```

## 🎨 Frontend Features

### Dashboard
- Overview statistics (total loans, borrowers, lenders)
- Pending interest tracking
- Monthly interest collection chart
- Active vs closed loans

### Borrower Management
- Add new borrowers with validation
- View all borrowers in paginated table
- Search and filter functionality
- Sensitive fields masked in display

### Lender Management
- Add lenders with family group association
- View all lenders by family group
- Search and filter
- Bulk lender operations

### Loan Creation
- Autocomplete borrower search
- Dynamic lender addition
- Real-time amount validation
- Confirmation of loan creation

### Interest Management
- Generate interest for loan periods
- Track pending interest payments
- Record payments with validation
- Payment history

### Reports
- Current loans report
- Loans by borrower
- Loans by lender
- Loans by family group
- Pending interest summary
- CSV export functionality

## 🔐 Security Best Practices Implemented

1. **Password Security**
   - Bcrypt hashing with 10 salt rounds
   - Passwords never returned in API responses
   - Secure password validation

2. **Authentication**
   - JWT tokens with 24-hour expiration
   - Automatic token refresh capability
   - Protected routes with auth middleware

3. **Data Protection**
   - Sensitive fields excluded from queries (select: false)
   - Unique constraints on PAN/Aadhaar
   - No sensitive data in error messages
   - Input sanitization and validation

4. **API Security**
   - Helmet security headers
   - CORS protection
   - Request body size limits
   - Rate limiting ready

5. **Error Handling**
   - Generic error messages in production
   - Detailed logging for debugging
   - No stack traces in production

## 🧪 Testing

### Backend Testing (Manual)
```bash
# Initialize admin
curl http://localhost:5000/api/auth/initialize

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{\"username\": \"admin\", \"password\": \"password\"}'
```

## 📝 Maintenance

### Database Backup
Regular MongoDB Atlas backups are configured automatically. Access backups through Atlas dashboard.

### Monitoring
- Check server logs for errors
- Monitor API response times
- Track database query performance

### Updates
- Keep dependencies updated: `npm update`
- Review security advisories: `npm audit`
- Test thoroughly before production deployment

## 📄 License

This is a private system for authorized use only.

## ⚡ Performance Optimization

- Pagination on large data sets
- Indexed MongoDB queries
- Lazy loading of reports
- Optimized API responses
- Frontend code splitting with Vite

## 🤝 Support & Troubleshooting

### Common Issues

**MongoDB Connection Error**
- Verify connection string in .env
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

**Authentication Fails**
- Verify JWT_SECRET is set in .env
- Check token expiration (24 hours)
- Clear browser localStorage and retry login

**API Not Responding**
- Check if backend server is running
- Verify port 5000 is not in use
- Check CORS settings

## 🎯 Future Enhancements

- Email notifications for pending interest
- SMS alerts for payment reminders
- Advanced reporting with charts
- Bulk import of borrowers/lenders
- Payment schedule automation
- Audit logging for compliance
- Mobile application support
- Blockchain integration for transparency

---

**Version:** 1.0.0  
**Last Updated:** March 2026
