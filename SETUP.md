# SETUP GUIDE

## Quick Start (5 minutes)

### Backend

1. **Enter server directory:**
   ```bash
   cd server
   ```

2. **Install packages:**
   ```bash
   npm install
   ```

3. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit .env with your MongoDB credentials:**
   ```
   MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/money-lender
   JWT_SECRET=any_long_random_string_here
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_password
   ```

5. **Start server:**
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5000`

### Frontend

1. **Enter client directory (new terminal):**
   ```bash
   cd client
   ```

2. **Install packages:**
   ```bash
   npm install
   ```

3. **Start frontend:**
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

4. **Login:**
   - Visit `http://localhost:5173`
   - Use credentials from .env (admin/password)

## MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create new cluster
4. Click "Connect" → "Connect Your Application"
5. Copy connection string
6. Replace username and password
7. Add database name: `money-lender`

## Complete Setup Steps

### 1. Prerequisites
- Node.js v16+ installed (`node --version`)
- MongoDB Atlas account (free tier available)
- Git (optional)

### 2. Clone/Download Project
```bash
cd "Money Lender 2.0"
```

### 3. Backend Configuration

```bash
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your MongoDB connection
nano .env
```

Environment variables needed:
```
PORT=5000                                          # Server port
MONGODB_URI=mongodb+srv://user:pass@cluster...   # MongoDB connection
JWT_SECRET=your_super_secret_key_here             # Secret key for JWT
ADMIN_USERNAME=admin                              # Admin username
ADMIN_PASSWORD=secure_password                    # Admin password (change this!)
NODE_ENV=development                              # Environment
```

### 4. Start Backend

**For development (with auto-reload):**
```bash
npm run dev
```

**For production:**
```bash
npm start
```

Backend health check:
```bash
curl http://localhost:5000/api/health
# Response: {"message":"Server is running"}
```

### 5. Initialize Admin

Visit in browser or use curl:
```bash
curl http://localhost:5000/api/auth/initialize
```

Response:
```json
{"message":"Admin initialized successfully"}
```

### 6. Frontend Configuration

Open new terminal:
```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

### 7. Access Application

Open browser:
```
http://localhost:5173
```

Login credentials (from .env):
- Username: `admin`
- Password: `secure_password` (whatever you set)

## Production Deployment

### Backend Deployment (Heroku)

1. **Install Heroku CLI**
2. **Login to Heroku:**
   ```bash
   heroku login
   ```

3. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

4. **Set environment variables:**
   ```bash
   heroku config:set MONGODB_URI=your_mongo_uri
   heroku config:set JWT_SECRET=your_secret
   heroku config:set NODE_ENV=production
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

### Frontend Deployment (Vercel)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy from client directory:**
   ```bash
   cd client
   vercel
   ```

3. **Configure API URL** in frontend for production server

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:**
- Check MongoDB is running
- Verify connection string in .env
- Check IP whitelist in MongoDB Atlas
- Verify username/password

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### npm Install Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend Can't Connect to Backend
```
Error: Network Error or 404
```
**Solution:**
- Ensure backend is running on port 5000
- Check CORS settings in server.js
- Verify API base URL in client/src/services/api.js

### Vite Port Conflict
```bash
# Kill port 5173
lsof -i :5173
kill -9 <PID>

# Or use different port
npm run dev -- --port 3000
```

## Development Workflow

### Day-to-Day Development

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

**Terminal 3 - MongoDB (optional):**
```bash
# Monitor MongoDB Atlas in browser dashboard
```

### Making Changes

**Backend Changes:**
- Edit files in `server/` folders
- Save automatically reloads with nodemon
- API endpoints reflect immediately

**Frontend Changes:**
- Edit files in `client/src/` folders
- Hot Module Replacement (HMR) updates browser automatically
- No manual refresh needed

### Testing APIs

**Using Postman:**
1. Import collection from API endpoints
2. Add Bearer token to Authorization header
3. Test endpoints

**Using curl:**
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Use returned token
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/borrowers
```

## Database Commands

### MongoDB Atlas Console

```javascript
// View all borrowers
db.borrowers.find()

// Count documents
db.loans.countDocuments()

// Delete all demo data
db.borrowers.deleteMany({})

// Create index
db.borrowers.createIndex({ "panNumber": 1 })
```

## Package Updates

Keep dependencies secure:

```bash
# Check for updates
npm outdated

# Update all packages
npm update

# Update specific package
npm install package-name@latest

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Useful Commands

**Backend:**
```bash
npm run dev              # Development server
npm start               # Production server
npm install             # Install dependencies
npm audit              # Check security issues
npm outdated           # Check package updates
```

**Frontend:**
```bash
npm run dev            # Development server
npm run build          # Build for production
npm run preview        # Preview production build
npm install            # Install dependencies
npm audit              # Check security issues
```

## Next Steps

1. ✅ Customize the admin password in production
2. ✅ Add your organization's branding
3. ✅ Configure email notifications
4. ✅ Set up automated backups
5. ✅ Configure monitoring and alerts
6. ✅ Create user documentation
7. ✅ Plan security audit schedule
8. ✅ Set up disaster recovery

## Support

For issues or questions:
1. Check the README.md
2. Review SECURITY.md for security questions
3. Check logs: `tail -f server.log`
4. Verify .env configuration
5. Test API with curl/Postman

---

**Setup Time:** 15-20 minutes
**Deployment Time:** 5-10 minutes (first time)
