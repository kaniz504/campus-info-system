// server.js - Node.js + Express Backend
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// In-memory database (replace with MongoDB/MySQL in production)
const database = {
    classrooms: [
        // Ground Floor
        { id: 1, room: 'G-101', dept: 'CSE', floor: 'Ground Floor', capacity: 60 },
        { id: 2, room: 'G-102', dept: 'EEE', floor: 'Ground Floor', capacity: 50 },
        { id: 3, room: 'G-103', dept: 'BBA', floor: 'Ground Floor', capacity: 70 },
        // 1st Floor
        { id: 4, room: '1-201', dept: 'CSE', floor: '1st Floor', capacity: 80 },
        { id: 5, room: '1-202', dept: 'CSE', floor: '1st Floor', capacity: 60 },
        { id: 6, room: '1-203', dept: 'EEE', floor: '1st Floor', capacity: 55 },
        // 2nd Floor
        { id: 7, room: '2-301', dept: 'BBA', floor: '2nd Floor', capacity: 90 },
        { id: 8, room: '2-302', dept: 'Civil', floor: '2nd Floor', capacity: 65 },
        { id: 9, room: '2-303', dept: 'Civil', floor: '2nd Floor', capacity: 70 },
        // 3rd Floor
        { id: 10, room: '3-401', dept: 'CSE', floor: '3rd Floor', capacity: 75 },
        { id: 11, room: '3-402', dept: 'EEE', floor: '3rd Floor', capacity: 60 },
        { id: 12, room: '3-403', dept: 'BBA', floor: '3rd Floor', capacity: 85 }
    ],
    
    labs: [
        { id: 1, name: 'CSE Programming Lab 1', dept: 'CSE', location: '1st Floor, Room 1-105', computers: 50, status: 'open', hours: '8:00 AM - 6:00 PM' },
        { id: 2, name: 'CSE Programming Lab 2', dept: 'CSE', location: '1st Floor, Room 1-106', computers: 45, status: 'open', hours: '8:00 AM - 8:00 PM' },
        { id: 3, name: 'EEE Circuit Lab', dept: 'EEE', location: '2nd Floor, Room 2-205', computers: 30, status: 'closed', hours: 'Maintenance until 3:00 PM' },
        { id: 4, name: 'Physics Lab', dept: 'Physics', location: 'Ground Floor, Room G-015', computers: 25, status: 'open', hours: '9:00 AM - 5:00 PM' },
        { id: 5, name: 'Chemistry Lab', dept: 'Chemistry', location: 'Ground Floor, Room G-016', computers: 30, status: 'open', hours: '9:00 AM - 5:00 PM' },
        { id: 6, name: 'Network & Security Lab', dept: 'CSE', location: '3rd Floor, Room 3-308', computers: 40, status: 'closed', hours: 'Scheduled class until 4:30 PM' },
        { id: 7, name: 'CAD Lab', dept: 'Civil', location: '2nd Floor, Room 2-210', computers: 35, status: 'open', hours: '8:00 AM - 6:00 PM' }
    ],
    
    buses: [
        { id: 1, number: 'A1', time: '7:30 AM', route: 'Campus → City Center → Main Station', stops: ['Campus Gate', 'Medical College', 'Shopping Mall', 'City Center', 'Main Station'] },
        { id: 2, number: 'A2', time: '8:00 AM', route: 'Campus → University Area → Airport Road', stops: ['Campus Gate', 'Student Dormitory', 'University Market', 'Tech Park', 'Airport Road'] },
        { id: 3, number: 'B1', time: '9:00 AM', route: 'Campus → Residential Area → Lake View', stops: ['Campus Gate', 'Faculty Housing', 'Green Park', 'Lake View'] },
        { id: 4, number: 'B2', time: '1:00 PM', route: 'Main Station → City Center → Campus', stops: ['Main Station', 'City Center', 'Shopping Mall', 'Medical College', 'Campus Gate'] },
        { id: 5, number: 'C1', time: '5:00 PM', route: 'Campus → Downtown → Metro Station', stops: ['Campus Gate', 'Library Square', 'Downtown Plaza', 'Business District', 'Metro Station'] },
        { id: 6, number: 'C2', time: '6:30 PM', route: 'Airport Road → University Area → Campus', stops: ['Airport Road', 'Tech Park', 'University Market', 'Student Dormitory', 'Campus Gate'] }
    ]
};

// API Routes

// Get all classrooms
app.get('/api/classrooms', (req, res) => {
    const { dept, search } = req.query;
    let results = database.classrooms;
    
    if (dept && dept !== 'all') {
        results = results.filter(room => room.dept === dept);
    }
    
    if (search) {
        const searchLower = search.toLowerCase();
        results = results.filter(room => 
            room.room.toLowerCase().includes(searchLower) ||
            room.dept.toLowerCase().includes(searchLower) ||
            room.floor.toLowerCase().includes(searchLower)
        );
    }
    
    res.json(results);
});

// Get classroom by ID
app.get('/api/classrooms/:id', (req, res) => {
    const classroom = database.classrooms.find(r => r.id === parseInt(req.params.id));
    if (classroom) {
        res.json(classroom);
    } else {
        res.status(404).json({ error: 'Classroom not found' });
    }
});

// Add new classroom (for admin)
app.post('/api/classrooms', (req, res) => {
    const newClassroom = {
        id: database.classrooms.length + 1,
        ...req.body
    };
    database.classrooms.push(newClassroom);
    res.status(201).json(newClassroom);
});

// Update classroom
app.put('/api/classrooms/:id', (req, res) => {
    const index = database.classrooms.findIndex(r => r.id === parseInt(req.params.id));
    if (index !== -1) {
        database.classrooms[index] = { ...database.classrooms[index], ...req.body };
        res.json(database.classrooms[index]);
    } else {
        res.status(404).json({ error: 'Classroom not found' });
    }
});

// Delete classroom
app.delete('/api/classrooms/:id', (req, res) => {
    const index = database.classrooms.findIndex(r => r.id === parseInt(req.params.id));
    if (index !== -1) {
        database.classrooms.splice(index, 1);
        res.json({ message: 'Classroom deleted successfully' });
    } else {
        res.status(404).json({ error: 'Classroom not found' });
    }
});

// Get all labs
app.get('/api/labs', (req, res) => {
    const { status, search } = req.query;
    let results = database.labs;
    
    if (status && status !== 'all') {
        results = results.filter(lab => lab.status === status);
    }
    
    if (search) {
        const searchLower = search.toLowerCase();
        results = results.filter(lab => 
            lab.name.toLowerCase().includes(searchLower) ||
            lab.dept.toLowerCase().includes(searchLower)
        );
    }
    
    res.json(results);
});

// Update lab status
app.patch('/api/labs/:id/status', (req, res) => {
    const lab = database.labs.find(l => l.id === parseInt(req.params.id));
    if (lab) {
        lab.status = req.body.status;
        res.json(lab);
    } else {
        res.status(404).json({ error: 'Lab not found' });
    }
});

// Get all buses
app.get('/api/buses', (req, res) => {
    const { search } = req.query;
    let results = database.buses;
    
    if (search) {
        const searchLower = search.toLowerCase();
        results = results.filter(bus => 
            bus.number.toLowerCase().includes(searchLower) ||
            bus.route.toLowerCase().includes(searchLower) ||
            bus.stops.some(stop => stop.toLowerCase().includes(searchLower))
        );
    }
    
    res.json(results);
});

// Add new bus route
app.post('/api/buses', (req, res) => {
    const newBus = {
        id: database.buses.length + 1,
        ...req.body
    };
    database.buses.push(newBus);
    res.status(201).json(newBus);
});

// Update bus route
app.put('/api/buses/:id', (req, res) => {
    const index = database.buses.findIndex(b => b.id === parseInt(req.params.id));
    if (index !== -1) {
        database.buses[index] = { ...database.buses[index], ...req.body };
        res.json(database.buses[index]);
    } else {
        res.status(404).json({ error: 'Bus not found' });
    }
});

// Delete bus route
app.delete('/api/buses/:id', (req, res) => {
    const index = database.buses.findIndex(b => b.id === parseInt(req.params.id));
    if (index !== -1) {
        database.buses.splice(index, 1);
        res.json({ message: 'Bus route deleted successfully' });
    } else {
        res.status(404).json({ error: 'Bus not found' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Campus Info API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});