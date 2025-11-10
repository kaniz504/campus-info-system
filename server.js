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

// Redirect root to homepage (must be before static middleware)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/home.html');
});

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

// Cafeteria API Routes

// Get all menu items (accessible to all authenticated users)
app.get('/api/cafeteria/menu', authenticateToken, async (req, res) => {
    try {
        const { category, availability, search } = req.query;
        const menuItems = await db.getAllMenuItems({ category, availability, search });
        res.json(menuItems);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

// Get menu item by ID (accessible to all authenticated users)
app.get('/api/cafeteria/menu/:id', authenticateToken, async (req, res) => {
    try {
        const menuItem = await db.getMenuItemById(req.params.id);
        if (menuItem) {
            res.json(menuItem);
        } else {
            res.status(404).json({ error: 'Menu item not found' });
        }
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ error: 'Failed to fetch menu item' });
    }
});

// Add new menu item (admin only)
app.post('/api/cafeteria/menu', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const newItem = await db.createMenuItem(req.body);
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error creating menu item:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Menu item already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create menu item' });
        }
    }
});

// Update menu item (admin only)
app.put('/api/cafeteria/menu/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const updatedItem = await db.updateMenuItem(req.params.id, req.body);
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// Delete menu item (admin only)
app.delete('/api/cafeteria/menu/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.deleteMenuItem(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

// Get cafeteria info (accessible to all authenticated users)
app.get('/api/cafeteria/info', authenticateToken, async (req, res) => {
    try {
        const cafeteriaInfo = await db.getCafeteriaInfo();
        res.json(cafeteriaInfo);
    } catch (error) {
        console.error('Error fetching cafeteria info:', error);
        res.status(500).json({ error: 'Failed to fetch cafeteria info' });
    }
});

// Update cafeteria info (admin only)
app.put('/api/cafeteria/info', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const updatedInfo = await db.updateCafeteriaInfo(req.body);
        res.json(updatedInfo);
    } catch (error) {
        console.error('Error updating cafeteria info:', error);
        res.status(500).json({ error: 'Failed to update cafeteria info' });
    }
});

// Schedule Routes

// Get schedules for a specific resource
app.get('/api/schedules/:type/:id', authenticateToken, async (req, res) => {
    try {
        const { day } = req.query;
        const schedules = await db.getSchedulesByResource(req.params.type, req.params.id, day);
        res.json(schedules);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

// Create a new schedule entry (admin only)
app.post('/api/schedules', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { resource_type, resource_id, day_of_week, start_time, end_time, subject, instructor, course_code } = req.body;

        if (!resource_type || !resource_id || !day_of_week || !start_time || !end_time || !subject) {
            return res.status(400).json({ error: 'Required fields: resource_type, resource_id, day_of_week, start_time, end_time, subject' });
        }

        const schedule = await db.createSchedule({
            resource_type,
            resource_id,
            day_of_week,
            start_time,
            end_time,
            subject,
            instructor,
            course_code
        });

        res.status(201).json(schedule);
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});

// Update a schedule entry (admin only)
app.put('/api/schedules/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const updated = await db.updateSchedule(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ error: error.message || 'Failed to update schedule' });
    }
});

// Delete a schedule entry (admin only)
app.delete('/api/schedules/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.deleteSchedule(req.params.id);
        res.json({ message: 'Schedule deleted successfully', ...result });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

// Booking Request Routes

// Create a new booking request (all authenticated users)
app.post('/api/booking-requests', authenticateToken, async (req, res) => {
    try {
        const { resource_type, resource_id, date, start_time, end_time, program_name, description, participant_count } = req.body;

        if (!resource_type || !resource_id || !date || !start_time || !end_time || !program_name) {
            return res.status(400).json({ error: 'Required fields: resource_type, resource_id, date, start_time, end_time, program_name' });
        }

        const bookingRequest = await db.createBookingRequest({
            user_id: req.user.id,
            resource_type,
            resource_id,
            date,
            start_time,
            end_time,
            program_name,
            description,
            participant_count
        });

        res.status(201).json(bookingRequest);
    } catch (error) {
        console.error('Error creating booking request:', error);
        res.status(500).json({ error: 'Failed to create booking request' });
    }
});

// Get all booking requests (admin sees all, users see only their own)
app.get('/api/booking-requests', authenticateToken, async (req, res) => {
    try {
        const { status, resource_type, resource_id } = req.query;
        const filters = { status, resource_type };
        
        if (resource_id) {
            filters.resource_id = parseInt(resource_id);
        }
        
        // If not admin, only show user's own requests (unless viewing approved bookings for a resource)
        if (req.user.role !== 'admin' && status !== 'approved') {
            filters.user_id = req.user.id;
        }

        const bookingRequests = await db.getAllBookingRequests(filters);
        res.json(bookingRequests);
    } catch (error) {
        console.error('Error fetching booking requests:', error);
        res.status(500).json({ error: 'Failed to fetch booking requests' });
    }
});

// Get booking request by ID
app.get('/api/booking-requests/:id', authenticateToken, async (req, res) => {
    try {
        const bookingRequest = await db.getBookingRequestById(req.params.id);
        
        if (!bookingRequest) {
            return res.status(404).json({ error: 'Booking request not found' });
        }

        // Users can only view their own requests, admins can view all
        if (req.user.role !== 'admin' && bookingRequest.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(bookingRequest);
    } catch (error) {
        console.error('Error fetching booking request:', error);
        res.status(500).json({ error: 'Failed to fetch booking request' });
    }
});

// Update booking request status (admin only)
app.patch('/api/booking-requests/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, admin_notes } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
        }

        const result = await db.updateBookingRequestStatus(req.params.id, status, req.user.id, admin_notes);
        res.json(result);
    } catch (error) {
        console.error('Error updating booking request status:', error);
        res.status(500).json({ error: 'Failed to update booking request status' });
    }
});

// Delete booking request (user can delete their own pending requests, admin can delete any)
app.delete('/api/booking-requests/:id', authenticateToken, async (req, res) => {
    try {
        const bookingRequest = await db.getBookingRequestById(req.params.id);
        
        if (!bookingRequest) {
            return res.status(404).json({ error: 'Booking request not found' });
        }

        // Users can only delete their own pending requests
        if (req.user.role !== 'admin') {
            if (bookingRequest.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (bookingRequest.status !== 'pending') {
                return res.status(400).json({ error: 'Can only delete pending requests' });
            }
        }

        const result = await db.deleteBookingRequest(req.params.id);
        res.json({ message: 'Booking request deleted successfully', ...result });
    } catch (error) {
        console.error('Error deleting booking request:', error);
        res.status(500).json({ error: 'Failed to delete booking request' });
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