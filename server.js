// server.js - Node.js + Express Backend with SQLite Database and Authentication
const express = require('express');
const cors = require('cors');
const Database = require('./database');
const { generateToken, authenticateToken, requireAdmin, requireAuth } = require('./auth');

const app = express();
const PORT = 3000;

// Initialize database
const db = new Database();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// Initialize database on startup
async function initializeServer() {
    try {
        await db.init();
        console.log('🚀 Database initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
}

// API Routes

// Authentication Routes

// Student signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { student_id, name, password } = req.body;
        
        // Validate input
        if (!student_id || !name || !password) {
            return res.status(400).json({ error: 'Student ID, name, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existingUser = await db.findUserByStudentId(student_id);
        if (existingUser) {
            return res.status(400).json({ error: 'Student ID already exists' });
        }

        // Create new student user
        const newUser = await db.createUser({
            student_id,
            name,
            password,
            role: 'student'
        });

        // Generate token
        const token = generateToken(newUser);

        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: newUser.id,
                student_id: newUser.student_id,
                name: newUser.name,
                role: newUser.role
            },
            token
        });

    } catch (error) {
        console.error('Error in signup:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Student ID already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create account' });
        }
    }
});

// User signin (both admin and student)
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { student_id, password } = req.body;
        
        // Validate input
        if (!student_id || !password) {
            return res.status(400).json({ error: 'Student ID and password are required' });
        }

        // Find user
        const user = await db.findUserByStudentId(student_id);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Validate password
        const isValidPassword = await db.validatePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Sign in successful',
            user: {
                id: user.id,
                student_id: user.student_id,
                name: user.name,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('Error in signin:', error);
        res.status(500).json({ error: 'Failed to sign in' });
    }
});

// User signout (client-side token removal, server acknowledges)
app.post('/api/auth/signout', authenticateToken, (req, res) => {
    res.json({ message: 'Sign out successful' });
});

// Get current user info
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            student_id: req.user.student_id,
            name: req.user.name,
            role: req.user.role
        }
    });
});

// Admin: Get all users
app.get('/api/auth/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Protected Routes (require authentication)

// Get all classrooms (accessible to all authenticated users)
app.get('/api/classrooms', authenticateToken, async (req, res) => {
    try {
        const { dept, search } = req.query;
        const classrooms = await db.getAllClassrooms({ dept, search });
        res.json(classrooms);
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        res.status(500).json({ error: 'Failed to fetch classrooms' });
    }
});

// Get classroom by ID (accessible to all authenticated users)
app.get('/api/classrooms/:id', authenticateToken, async (req, res) => {
    try {
        const classroom = await db.getClassroomById(req.params.id);
        if (classroom) {
            res.json(classroom);
        } else {
            res.status(404).json({ error: 'Classroom not found' });
        }
    } catch (error) {
        console.error('Error fetching classroom:', error);
        res.status(500).json({ error: 'Failed to fetch classroom' });
    }
});

// Add new classroom (admin only)
app.post('/api/classrooms', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const newClassroom = await db.createClassroom(req.body);
        res.status(201).json(newClassroom);
    } catch (error) {
        console.error('Error creating classroom:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Room number already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create classroom' });
        }
    }
});

// Update classroom (admin only)
app.put('/api/classrooms/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const updatedClassroom = await db.updateClassroom(req.params.id, req.body);
        res.json(updatedClassroom);
    } catch (error) {
        console.error('Error updating classroom:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Room number already exists' });
        } else {
            res.status(500).json({ error: 'Failed to update classroom' });
        }
    }
});

// Delete classroom (admin only)
app.delete('/api/classrooms/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.deleteClassroom(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting classroom:', error);
        res.status(500).json({ error: 'Failed to delete classroom' });
    }
});

// Get all labs (accessible to all authenticated users)
app.get('/api/labs', authenticateToken, async (req, res) => {
    try {
        const { status, search } = req.query;
        const labs = await db.getAllLabs({ status, search });
        res.json(labs);
    } catch (error) {
        console.error('Error fetching labs:', error);
        res.status(500).json({ error: 'Failed to fetch labs' });
    }
});

// Update lab status (admin only)
app.patch('/api/labs/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const updatedLab = await db.updateLabStatus(req.params.id, req.body.status);
        res.json(updatedLab);
    } catch (error) {
        console.error('Error updating lab status:', error);
        if (error.message === 'Lab not found') {
            res.status(404).json({ error: 'Lab not found' });
        } else {
            res.status(500).json({ error: 'Failed to update lab status' });
        }
    }
});

// Get all buses (accessible to all authenticated users)
app.get('/api/buses', authenticateToken, async (req, res) => {
    try {
        const { search } = req.query;
        const buses = await db.getAllBuses({ search });
        res.json(buses);
    } catch (error) {
        console.error('Error fetching buses:', error);
        res.status(500).json({ error: 'Failed to fetch buses' });
    }
});

// Add new bus route (admin only)
app.post('/api/buses', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const newBus = await db.createBus(req.body);
        res.status(201).json(newBus);
    } catch (error) {
        console.error('Error creating bus:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Bus number already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create bus route' });
        }
    }
});

// Update bus route (admin only)
app.put('/api/buses/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const updatedBus = await db.updateBus(req.params.id, req.body);
        res.json(updatedBus);
    } catch (error) {
        console.error('Error updating bus:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Bus number already exists' });
        } else {
            res.status(500).json({ error: 'Failed to update bus route' });
        }
    }
});

// Delete bus route (admin only)
app.delete('/api/buses/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.deleteBus(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting bus:', error);
        res.status(500).json({ error: 'Failed to delete bus route' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Campus Info API is running with SQLite database' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    db.close();
    process.exit(0);
});

// Initialize database and start server
initializeServer().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
        console.log(`💾 Using SQLite database: campus_info.db`);
    });
}).catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});