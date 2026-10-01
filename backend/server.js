const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = 5000;
const JWT_SECRET = "task-manager-demo-secret";

app.use(cors());
app.use(express.json());

const dataFolder = path.join(__dirname, "data");
const dataFile = path.join(dataFolder, "tasks.json");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

let database = {
    users: [],
    tasks: [],
    nextUserId: 1,
    nextTaskId: 1
};

if (fs.existsSync(dataFile)) {
    try {
        database = JSON.parse(
            fs.readFileSync(dataFile, "utf8")
        );
    } catch {
        console.log("Starting with empty database.");
    }
}

function saveDatabase() {
    fs.writeFileSync(
        dataFile,
        JSON.stringify(database, null, 2)
    );
}

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function authenticate(req, res, next) {

    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    const token = header.substring(7);

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}


/* HEALTH CHECK */

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "Task Manager API is running"
    });

});


/* REGISTER */

app.post("/api/auth/register", (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {

        return res.status(400).json({
            message: "Name, email and password are required"
        });

    }

    if (password.length < 6) {

        return res.status(400).json({
            message: "Password must contain at least 6 characters"
        });

    }

    const normalizedEmail = email
        .trim()
        .toLowerCase();

    const existingUser = database.users.find(
        user => user.email === normalizedEmail
    );

    if (existingUser) {

        return res.status(409).json({
            message: "Email already registered"
        });

    }

    const user = {

        id: database.nextUserId++,

        name: name.trim(),

        email: normalizedEmail,

        password: bcrypt.hashSync(password, 10),

        created_at: new Date().toISOString()

    };

    database.users.push(user);

    saveDatabase();

    const safeUser = {

        id: user.id,

        name: user.name,

        email: user.email

    };

    res.status(201).json({

        user: safeUser,

        token: createToken(safeUser)

    });

});


/* LOGIN */

app.post("/api/auth/login", (req, res) => {

    const { email, password } = req.body;

    const user = database.users.find(
        user =>
            user.email ===
            (email || "").trim().toLowerCase()
    );

    if (!user) {

        return res.status(401).json({
            message: "Invalid email or password"
        });

    }

    const passwordCorrect =
        bcrypt.compareSync(
            password || "",
            user.password
        );

    if (!passwordCorrect) {

        return res.status(401).json({
            message: "Invalid email or password"
        });

    }

    const safeUser = {

        id: user.id,

        name: user.name,

        email: user.email

    };

    res.json({

        user: safeUser,

        token: createToken(safeUser)

    });

});


/* CURRENT USER */

app.get("/api/auth/me", authenticate, (req, res) => {

    const user = database.users.find(
        user => user.id === req.user.id
    );

    if (!user) {

        return res.status(404).json({
            message: "User not found"
        });

    }

    res.json({

        user: {

            id: user.id,

            name: user.name,

            email: user.email

        }

    });

});


/* GET TASKS */

app.get("/api/tasks", authenticate, (req, res) => {

    const tasks = database.tasks.filter(
        task => task.user_id === req.user.id
    );

    res.json(tasks);

});


/* CREATE TASK */

app.post("/api/tasks", authenticate, (req, res) => {

    const {
        title,
        description = "",
        status = "todo",
        priority = "medium",
        due_date = null
    } = req.body;

    if (!title || !title.trim()) {

        return res.status(400).json({
            message: "Task title is required"
        });

    }

    const task = {

        id: database.nextTaskId++,

        user_id: req.user.id,

        title: title.trim(),

        description,

        status,

        priority,

        due_date,

        created_at: new Date().toISOString(),

        updated_at: new Date().toISOString()

    };

    database.tasks.push(task);

    saveDatabase();

    io.to(`user:${req.user.id}`).emit(
        "tasks:changed"
    );

    res.status(201).json(task);

});


/* UPDATE TASK */

app.put("/api/tasks/:id", authenticate, (req, res) => {

    const taskId = Number(req.params.id);

    const task = database.tasks.find(
        task =>
            task.id === taskId &&
            task.user_id === req.user.id
    );

    if (!task) {

        return res.status(404).json({
            message: "Task not found"
        });

    }

    task.title =
        req.body.title ?? task.title;

    task.description =
        req.body.description ?? task.description;

    task.status =
        req.body.status ?? task.status;

    task.priority =
        req.body.priority ?? task.priority;

    task.due_date =
        req.body.due_date ?? task.due_date;

    task.updated_at =
        new Date().toISOString();

    saveDatabase();

    io.to(`user:${req.user.id}`).emit(
        "tasks:changed"
    );

    res.json(task);

});


/* DELETE TASK */

app.delete("/api/tasks/:id", authenticate, (req, res) => {

    const taskId = Number(req.params.id);

    const index = database.tasks.findIndex(
        task =>
            task.id === taskId &&
            task.user_id === req.user.id
    );

    if (index === -1) {

        return res.status(404).json({
            message: "Task not found"
        });

    }

    database.tasks.splice(index, 1);

    saveDatabase();

    io.to(`user:${req.user.id}`).emit(
        "tasks:changed"
    );

    res.json({
        message: "Task deleted successfully"
    });

});


/* SOCKET.IO */

io.on("connection", socket => {

    socket.on("join", token => {

        try {

            const user = jwt.verify(
                token,
                JWT_SECRET
            );

            socket.join(`user:${user.id}`);

        } catch {

            console.log(
                "Socket authentication failed"
            );

        }

    });

});


server.listen(PORT, () => {

    console.log(
        `Task Manager backend running at http://localhost:${PORT}`
    );

});