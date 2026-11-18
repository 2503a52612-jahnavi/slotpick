SlotPick

Smart Delivery Slot Scheduling Platform

SlotPick allows customers to choose their preferred delivery time slot once a parcel reaches the local delivery hub. Instead of waiting all day for a delivery, customers can select an available slot while delivery agents and administrators manage deliveries through a unified platform.

📌 Problem Statement

Current e-commerce platforms notify customers about order placement, shipping, and estimated delivery dates, but customers often do not know the exact delivery time.

SlotPick solves this problem by providing:

Delivery slot selection
Real-time delivery status tracking
Agent assignment and management
Role-based access control
Customer-friendly scheduling workflow
✨ Features
Customer
User registration and login
JWT-based authentication
View assigned deliveries
Select available delivery slots
View booking status
Track delivery progress
Delivery Agent
View assigned deliveries
Update delivery status
Mark deliveries as:
Scheduled
Out for Delivery
Delivered
Administrator
Create delivery agents
Create deliveries
Manage available delivery slots
Assign deliveries to agents
🏗 Architecture
Plain Text
React Web App
│
▼
Node.js + Express API
│
▼
MongoDB Atlas
│
┌──────┼──────┐
▼ ▼ ▼
Admin Customer Agent
🛠 Tech Stack
Frontend
React
Webpack
CSS
Backend
Node.js
Express.js
JWT Authentication
REST APIs
Database
MongoDB Atlas
Mongoose
Development Tools
Git
GitHub
Postman
Deployment
Vercel (Frontend)
Render (Backend)
MongoDB Atlas (Database)
🔐 Authentication

SlotPick implements:

JWT Authentication
Password Hashing
Protected Routes
Role-Based Access Control (RBAC)

Roles:

Plain Text
Admin
Customer
Agent
📦 API Endpoints
Authentication
HTTP
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
Customer
HTTP
GET /api/customer/deliveries
POST /api/customer/deliveries/:deliveryId/slot
Delivery Agent
HTTP
GET /api/agent/deliveries
PATCH /api/agent/deliveries/:deliveryId/status
Admin
HTTP
GET /api/admin/ping
POST /api/admin/agents
POST /api/admin/deliveries

### Development order lookup data

From `apps/api`, configure `MONGODB_URI` in `.env`, then seed or reseed the
demo records with:

```powershell
npm run seed-demo
```

The script is development-only and refuses to run with `NODE_ENV=production`.
It creates five orders, each with three delivery slots:

| Platform | Order ID |
| --- | --- |
| Amazon | `ID_101` |
| Flipkart | `ID_102` |
| Myntra | `ID_103` |
| Ajio | `ID_104` |
| Meesho | `ID_105` |

Test sign-in credentials for the seeded customer and agent:

- Customer: `demo-customer@slotpick.example` / `DemoCustomer123!`
- Agent: `demo-agent@slotpick.example` / `DemoAgent123!`

These are development-only credentials. Each reseed restores these passwords;
override them with `DEMO_CUSTOMER_EMAIL`, `DEMO_CUSTOMER_PASSWORD`,
`DEMO_AGENT_EMAIL`, and `DEMO_AGENT_PASSWORD` when appropriate. Sign in with
the demo customer account to view its deliveries; platform and order ID alone
do not grant access.
🚚 Delivery Workflow
Plain Text
Admin Creates Delivery
│
▼
Customer Receives Delivery
│
▼
Customer Selects Slot
│
▼
Delivery Scheduled
│
▼
Agent Marks Out For Delivery
│
▼
Agent Marks Delivered
🚀 Local Setup
Clone Repository
Shell
git clone https://github.com/2503a52612-jahnavi/slotpick.git
Backend
Shell
cd apps/api
npm install
npm run dev
Frontend
Shell
cd slotpick/web
npm install
npm start
🌍 Environment Variables

Create a .env file:

Shell
env isn’t fully supported. Syntax highlighting is based on Shell.
PORT=4000
NODE_ENV=development
 
MONGODB_URI=your-mongodb-uri
 
JWT_SECRET=your-secret
 
JWT_EXPIRES_IN=7d
 
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-password
📸 Screenshots

Add screenshots after deployment:

Login Page
Customer Dashboard
Slot Selection
Agent Dashboard
Delivery Tracking
📈 Future Enhancements
WhatsApp Notifications
Email Notifications
AWS Deployment
Mobile Application
Custom Domain
Live Tracking
E-commerce Platform Integration
👩‍💻 Author

Jahnavi

B.Tech CSE (AI & ML)

SR University

⭐ Project Status
Plain Text
✅ Authentication
✅ MongoDB Integration
✅ Customer Dashboard
✅ Slot Booking
✅ Delivery Tracking
✅ Agent Workflow
✅ Admin Workflow
🔄 Deployment
🔄 WhatsApp Notifications

Now save this as:

Plain Text
README.md

at the root of your repository, then run:

Shell
git add README.md
git commit -m "Update project README"
git push
