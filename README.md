# TaskFlow — Task 2 Full-Stack Task Management Application

A ready-to-run full-stack project matching the assignment: authentication & authorization, task CRUD, optional real-time updates using WebSockets (Socket.IO), responsive design, API integration, and dynamic data handling.

## Tech stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: SQLite (local file, no MySQL setup needed)
- Authentication: JWT + bcrypt
- Real-time: Socket.IO

## Run locally
### 1. Install Node.js
Install Node.js LTS from the official Node.js website if it is not already installed.

### 2. Start backend
Open PowerShell in `backend`:
```powershell
npm install
npm start
```
Keep this terminal running. Backend runs at `http://localhost:5000`.

### 3. Start frontend
Because this frontend is static, open `frontend/index.html` with a local server. In VS Code, install/use Live Server, then right-click `frontend/index.html` → **Open with Live Server**.

If you have Python installed, you can instead run inside `frontend`:
```powershell
python -m http.server 5500
```
Then open `http://localhost:5500`.

## GitHub
Create a GitHub repository, then from the project root:
```powershell
git init
git add .
git commit -m "Build Task 2 task management application"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Do not commit `backend/data/tasks.db` if you don't want local demo data in GitHub. The project can create the database automatically.
