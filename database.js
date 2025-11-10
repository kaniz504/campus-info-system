// database.js - SQLite Database Setup and Operations with Authentication
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    // Initialize database connection
    async init() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(__dirname, 'campus_info.db');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    // Create database tables
    async createTables() {
        return new Promise((resolve, reject) => {
            const createTablesSQL = `
                -- Users table
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT UNIQUE,
                    name TEXT NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Classrooms table
                CREATE TABLE IF NOT EXISTS classrooms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room TEXT NOT NULL UNIQUE,
                    dept TEXT NOT NULL,
                    floor TEXT NOT NULL,
                    capacity INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Labs table
                CREATE TABLE IF NOT EXISTS labs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    dept TEXT NOT NULL,
                    location TEXT NOT NULL,
                    computers INTEGER NOT NULL,
                    projector TEXT DEFAULT 'No',
                    instruments TEXT DEFAULT 'None',
                    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
                    hours TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Buses table
                CREATE TABLE IF NOT EXISTS buses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    number TEXT NOT NULL UNIQUE,
                    time TEXT NOT NULL,
                    route TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Bus stops table (for normalized stop data)
                CREATE TABLE IF NOT EXISTS bus_stops (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bus_id INTEGER NOT NULL,
                    stop_name TEXT NOT NULL,
                    stop_order INTEGER NOT NULL,
                    FOREIGN KEY (bus_id) REFERENCES buses (id) ON DELETE CASCADE
                );

                -- Cafeteria menu table
                CREATE TABLE IF NOT EXISTS cafeteria_menu (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    category TEXT NOT NULL CHECK (category IN ('food', 'snacks', 'drinks')),
                    availability TEXT NOT NULL CHECK (availability IN ('available', 'limited')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Cafeteria info table
                CREATE TABLE IF NOT EXISTS cafeteria_info (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    location TEXT NOT NULL,
                    contact TEXT NOT NULL,
                    hours TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Schedules table for weekly routines
                CREATE TABLE IF NOT EXISTS schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    resource_type TEXT NOT NULL, -- 'classroom' or 'lab'
                    resource_id INTEGER NOT NULL,
                    day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    subject TEXT NOT NULL,
                    instructor TEXT,
                    course_code TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Booking requests table for special programs
                CREATE TABLE IF NOT EXISTS booking_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    resource_type TEXT NOT NULL, -- 'classroom' or 'lab'
                    resource_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    program_name TEXT NOT NULL,
                    description TEXT,
                    participant_count INTEGER,
                    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    admin_notes TEXT,
                    reviewed_by INTEGER,
                    reviewed_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (reviewed_by) REFERENCES users (id)
                );

                -- Create indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_users_student_id ON users (student_id);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
                CREATE INDEX IF NOT EXISTS idx_classrooms_dept ON classrooms (dept);
                CREATE INDEX IF NOT EXISTS idx_classrooms_floor ON classrooms (floor);
                CREATE INDEX IF NOT EXISTS idx_labs_status ON labs (status);
                CREATE INDEX IF NOT EXISTS idx_labs_dept ON labs (dept);
                CREATE INDEX IF NOT EXISTS idx_buses_number ON buses (number);
                CREATE INDEX IF NOT EXISTS idx_bus_stops_bus_id ON bus_stops (bus_id);
                CREATE INDEX IF NOT EXISTS idx_cafeteria_menu_category ON cafeteria_menu (category);
                CREATE INDEX IF NOT EXISTS idx_cafeteria_menu_availability ON cafeteria_menu (availability);
                CREATE INDEX IF NOT EXISTS idx_schedules_resource ON schedules (resource_type, resource_id);
                CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules (day_of_week);
                CREATE INDEX IF NOT EXISTS idx_booking_requests_user ON booking_requests (user_id);
                CREATE INDEX IF NOT EXISTS idx_booking_requests_resource ON booking_requests (resource_type, resource_id);
                CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests (status);
                CREATE INDEX IF NOT EXISTS idx_booking_requests_date ON booking_requests (date);
            `;

            this.db.exec(createTablesSQL, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                } else {
                    console.log('✅ Database tables created successfully');
                    this.insertSampleData().then(resolve).catch(reject);
                }
            });
        });
    }

    // Insert sample data
    async insertSampleData() {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if admin user already exists
                const adminUser = await this.findUserByStudentId('admin');
                if (!adminUser) {
                    console.log('📋 Creating default admin user...');
                    await this.createUser({
                        student_id: 'admin',
                        name: 'System Administrator',
                        password: 'admin123',
                        role: 'admin'
                    });
                    console.log('✅ Default admin user created (admin/admin123)');
                } else {
                    console.log('ℹ️ Admin user already exists');
                }

                // Check if sample data already exists
                const classroomCount = await this.getCount('classrooms');
                if (classroomCount > 0) {
                    console.log('📋 Sample data already exists');
                    resolve();
                    return;
                }

                console.log('📋 Inserting sample data...');

                // Sample classrooms
                const classrooms = [
                    { room: 'G-101', dept: 'CSE', floor: 'Ground Floor', capacity: 60 },
                    { room: 'G-102', dept: 'EEE', floor: 'Ground Floor', capacity: 50 },
                    { room: 'G-103', dept: 'BBA', floor: 'Ground Floor', capacity: 70 },
                    { room: '1-201', dept: 'CSE', floor: '1st Floor', capacity: 80 },
                    { room: '1-202', dept: 'CSE', floor: '1st Floor', capacity: 60 },
                    { room: '1-203', dept: 'EEE', floor: '1st Floor', capacity: 55 },
                    { room: '2-301', dept: 'BBA', floor: '2nd Floor', capacity: 90 },
                    { room: '2-302', dept: 'Civil', floor: '2nd Floor', capacity: 65 },
                    { room: '2-303', dept: 'Civil', floor: '2nd Floor', capacity: 70 },
                    { room: '3-401', dept: 'CSE', floor: '3rd Floor', capacity: 75 },
                    { room: '3-402', dept: 'EEE', floor: '3rd Floor', capacity: 60 },
                    { room: '3-403', dept: 'BBA', floor: '3rd Floor', capacity: 85 }
                ];

                // Sample labs
                const labs = [
                    { name: 'CSE Programming Lab 1', dept: 'CSE', location: '1st Floor, Room 1-105', computers: 50, projector: 'Yes', instruments: 'Whiteboard, Sound System', status: 'open', hours: '8:00 AM - 6:00 PM' },
                    { name: 'CSE Programming Lab 2', dept: 'CSE', location: '1st Floor, Room 1-106', computers: 45, projector: 'Yes', instruments: 'Whiteboard', status: 'open', hours: '8:00 AM - 8:00 PM' },
                    { name: 'EEE Circuit Lab', dept: 'EEE', location: '2nd Floor, Room 2-205', computers: 30, projector: 'No', instruments: 'Oscilloscopes (20), Multimeters (25), Function Generators (15)', status: 'closed', hours: 'Maintenance until 3:00 PM' },
                    { name: 'Physics Lab', dept: 'Physics', location: 'Ground Floor, Room G-015', computers: 25, projector: 'Yes', instruments: 'Microscopes (15), Lab Equipment Sets (20)', status: 'open', hours: '9:00 AM - 5:00 PM' },
                    { name: 'Chemistry Lab', dept: 'Chemistry', location: 'Ground Floor, Room G-016', computers: 30, projector: 'Yes', instruments: 'Fume Hoods (4), Lab Benches (10), Glassware Sets (30)', status: 'open', hours: '9:00 AM - 5:00 PM' },
                    { name: 'Network & Security Lab', dept: 'CSE', location: '3rd Floor, Room 3-308', computers: 40, projector: 'Yes', instruments: 'Routers (10), Switches (15), Network Cables', status: 'closed', hours: 'Scheduled class until 4:30 PM' },
                    { name: 'CAD Lab', dept: 'Civil', location: '2nd Floor, Room 2-210', computers: 35, projector: 'Yes', instruments: 'Drawing Tablets (35), 3D Printer', status: 'open', hours: '8:00 AM - 6:00 PM' }
                ];

                // Sample buses with stops
                const busesWithStops = [
                    { 
                        bus: { number: 'A1', time: '7:30 AM', route: 'Campus → City Center → Main Station' },
                        stops: ['Campus Gate', 'Medical College', 'Shopping Mall', 'City Center', 'Main Station']
                    },
                    { 
                        bus: { number: 'A2', time: '8:00 AM', route: 'Campus → University Area → Airport Road' },
                        stops: ['Campus Gate', 'Student Dormitory', 'University Market', 'Tech Park', 'Airport Road']
                    },
                    { 
                        bus: { number: 'B1', time: '9:00 AM', route: 'Campus → Residential Area → Lake View' },
                        stops: ['Campus Gate', 'Faculty Housing', 'Green Park', 'Lake View']
                    },
                    { 
                        bus: { number: 'B2', time: '1:00 PM', route: 'Main Station → City Center → Campus' },
                        stops: ['Main Station', 'City Center', 'Shopping Mall', 'Medical College', 'Campus Gate']
                    },
                    { 
                        bus: { number: 'C1', time: '5:00 PM', route: 'Campus → Downtown → Metro Station' },
                        stops: ['Campus Gate', 'Library Square', 'Downtown Plaza', 'Business District', 'Metro Station']
                    },
                    { 
                        bus: { number: 'C2', time: '6:30 PM', route: 'Airport Road → University Area → Campus' },
                        stops: ['Airport Road', 'Tech Park', 'University Market', 'Student Dormitory', 'Campus Gate']
                    }
                ];

                // Insert classrooms
                for (const classroom of classrooms) {
                    await this.insertClassroom(classroom);
                }

                // Insert labs
                for (const lab of labs) {
                    await this.insertLab(lab);
                }

                // Insert buses and stops
                for (const busData of busesWithStops) {
                    const busId = await this.insertBus(busData.bus);
                    for (let i = 0; i < busData.stops.length; i++) {
                        await this.insertBusStop(busId, busData.stops[i], i + 1);
                    }
                }

                // Sample cafeteria menu items
                const menuItems = [
                    { name: 'Chicken Biriyani', description: 'Traditional aromatic rice with tender chicken', price: 180.00, category: 'food', availability: 'available' },
                    { name: 'Beef Curry', description: 'Spicy beef curry with rice', price: 160.00, category: 'food', availability: 'available' },
                    { name: 'Fish Fry', description: 'Crispy fried fish with lemon', price: 140.00, category: 'food', availability: 'limited' },
                    { name: 'Vegetable Fried Rice', description: 'Mixed vegetables with fragrant rice', price: 120.00, category: 'food', availability: 'available' },
                    { name: 'Dal with Rice', description: 'Traditional lentil curry with steamed rice', price: 80.00, category: 'food', availability: 'available' },
                    { name: 'Chicken Sandwich', description: 'Grilled chicken with fresh vegetables', price: 100.00, category: 'snacks', availability: 'available' },
                    { name: 'Samosa', description: 'Crispy pastry with spiced filling', price: 25.00, category: 'snacks', availability: 'available' },
                    { name: 'French Fries', description: 'Golden crispy potato fries', price: 60.00, category: 'snacks', availability: 'available' },
                    { name: 'Spring Rolls', description: 'Crispy vegetable spring rolls', price: 45.00, category: 'snacks', availability: 'limited' },
                    { name: 'Tea', description: 'Hot milk tea', price: 15.00, category: 'drinks', availability: 'available' },
                    { name: 'Coffee', description: 'Fresh brewed coffee', price: 25.00, category: 'drinks', availability: 'available' },
                    { name: 'Fresh Juice', description: 'Seasonal fresh fruit juice', price: 40.00, category: 'drinks', availability: 'available' },
                    { name: 'Soft Drinks', description: 'Chilled carbonated drinks', price: 30.00, category: 'drinks', availability: 'available' },
                    { name: 'Lassi', description: 'Sweet yogurt drink', price: 35.00, category: 'drinks', availability: 'limited' }
                ];

                // Insert cafeteria menu items
                for (const item of menuItems) {
                    await this.insertMenuItem(item);
                }

                // Insert cafeteria info
                await this.insertCafeteriaInfo({
                    location: 'Ground Floor, Main Building',
                    contact: '+880-1234-567890',
                    hours: '8:00 AM - 8:00 PM'
                });

                console.log('✅ Sample data inserted successfully');
                resolve();

            } catch (error) {
                console.error('Error inserting sample data:', error);
                reject(error);
            }
        });
    }

    // Helper method to get count of records
    getCount(tableName) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }

    // Insert methods
    insertClassroom(classroom) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO classrooms (room, dept, floor, capacity) VALUES (?, ?, ?, ?)`;
            this.db.run(sql, [classroom.room, classroom.dept, classroom.floor, classroom.capacity], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    insertLab(lab) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO labs (name, dept, location, computers, projector, instruments, status, hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            this.db.run(sql, [lab.name, lab.dept, lab.location, lab.computers, lab.projector || 'No', lab.instruments || 'None', lab.status, lab.hours], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    insertBus(bus) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO buses (number, time, route) VALUES (?, ?, ?)`;
            this.db.run(sql, [bus.number, bus.time, bus.route], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    insertBusStop(busId, stopName, stopOrder) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO bus_stops (bus_id, stop_name, stop_order) VALUES (?, ?, ?)`;
            this.db.run(sql, [busId, stopName, stopOrder], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    insertMenuItem(item) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO cafeteria_menu (name, description, price, category, availability) VALUES (?, ?, ?, ?, ?)`;
            this.db.run(sql, [item.name, item.description, item.price, item.category, item.availability], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    insertCafeteriaInfo(info) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO cafeteria_info (location, contact, hours) VALUES (?, ?, ?)`;
            this.db.run(sql, [info.location, info.contact, info.hours], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // CRUD Operations

    // Users (Authentication)
    async createUser(userData) {
        return new Promise(async (resolve, reject) => {
            try {
                // Hash password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
                
                const sql = `INSERT INTO users (student_id, name, password, role) VALUES (?, ?, ?, ?)`;
                this.db.run(sql, [userData.student_id, userData.name, hashedPassword, userData.role], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ 
                            id: this.lastID, 
                            student_id: userData.student_id,
                            name: userData.name,
                            role: userData.role
                        });
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async findUserByStudentId(student_id) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM users WHERE student_id = ?`, [student_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async validatePassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT id, student_id, name, role, created_at FROM users ORDER BY created_at DESC`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Classrooms
    getAllClassrooms(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM classrooms`;
            const params = [];
            const conditions = [];

            if (filters.dept && filters.dept !== 'all') {
                conditions.push('dept = ?');
                params.push(filters.dept);
            }

            if (filters.search) {
                conditions.push('(room LIKE ? OR dept LIKE ? OR floor LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY floor, room';

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getClassroomById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM classrooms WHERE id = ?`, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    createClassroom(classroom) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO classrooms (room, dept, floor, capacity) VALUES (?, ?, ?, ?)`;
            this.db.run(sql, [classroom.room, classroom.dept, classroom.floor, classroom.capacity], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...classroom });
            });
        });
    }

    updateClassroom(id, classroom) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE classrooms SET room = ?, dept = ?, floor = ?, capacity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            this.db.run(sql, [classroom.room, classroom.dept, classroom.floor, classroom.capacity, id], function(err) {
                if (err) reject(err);
                else resolve({ id: parseInt(id), ...classroom });
            });
        });
    }

    deleteClassroom(id) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM classrooms WHERE id = ?`, [id], function(err) {
                if (err) reject(err);
                else resolve({ message: 'Classroom deleted successfully' });
            });
        });
    }

    // Labs
    getAllLabs(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM labs`;
            const params = [];
            const conditions = [];

            if (filters.status && filters.status !== 'all') {
                conditions.push('status = ?');
                params.push(filters.status);
            }

            if (filters.search) {
                conditions.push('(name LIKE ? OR dept LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY name';

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    updateLabStatus(id, status) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM labs WHERE id = ?`, [id], (err, lab) => {
                if (err) {
                    reject(err);
                } else if (!lab) {
                    reject(new Error('Lab not found'));
                } else {
                    const sql = `UPDATE labs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    this.db.run(sql, [status, id], function(err) {
                        if (err) reject(err);
                        else resolve({ ...lab, status });
                    });
                }
            });
        });
    }

    // Buses
    getAllBuses(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT b.*, GROUP_CONCAT(bs.stop_name ORDER BY bs.stop_order) as stops_string
                FROM buses b
                LEFT JOIN bus_stops bs ON b.id = bs.bus_id
            `;
            const params = [];
            const conditions = [];

            if (filters.search) {
                conditions.push('(b.number LIKE ? OR b.route LIKE ? OR bs.stop_name LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' GROUP BY b.id ORDER BY b.number';

            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Convert stops_string to stops array
                    const buses = rows.map(row => ({
                        ...row,
                        stops: row.stops_string ? row.stops_string.split(',') : [],
                        stops_string: undefined
                    }));
                    resolve(buses);
                }
            });
        });
    }

    createBus(busData) {
        return new Promise(async (resolve, reject) => {
            try {
                const busId = await this.insertBus(busData);
                
                // Insert stops
                if (busData.stops && busData.stops.length > 0) {
                    for (let i = 0; i < busData.stops.length; i++) {
                        await this.insertBusStop(busId, busData.stops[i], i + 1);
                    }
                }

                resolve({ id: busId, ...busData });
            } catch (error) {
                reject(error);
            }
        });
    }

    updateBus(id, busData) {
        return new Promise(async (resolve, reject) => {
            try {
                // Update bus
                const sql = `UPDATE buses SET number = ?, time = ?, route = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                await new Promise((res, rej) => {
                    this.db.run(sql, [busData.number, busData.time, busData.route, id], function(err) {
                        if (err) rej(err);
                        else res();
                    });
                });

                // Delete existing stops
                await new Promise((res, rej) => {
                    this.db.run(`DELETE FROM bus_stops WHERE bus_id = ?`, [id], function(err) {
                        if (err) rej(err);
                        else res();
                    });
                });

                // Insert new stops
                if (busData.stops && busData.stops.length > 0) {
                    for (let i = 0; i < busData.stops.length; i++) {
                        await this.insertBusStop(id, busData.stops[i], i + 1);
                    }
                }

                resolve({ id: parseInt(id), ...busData });
            } catch (error) {
                reject(error);
            }
        });
    }

    deleteBus(id) {
        return new Promise((resolve, reject) => {
            // SQLite will automatically delete bus_stops due to FOREIGN KEY CASCADE
            this.db.run(`DELETE FROM buses WHERE id = ?`, [id], function(err) {
                if (err) reject(err);
                else resolve({ message: 'Bus route deleted successfully' });
            });
        });
    }

    // Cafeteria
    getAllMenuItems(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM cafeteria_menu`;
            const params = [];
            const conditions = [];

            if (filters.category && filters.category !== 'all') {
                conditions.push('category = ?');
                params.push(filters.category);
            }

            if (filters.availability && filters.availability !== 'all') {
                conditions.push('availability = ?');
                params.push(filters.availability);
            }

            if (filters.search) {
                conditions.push('(name LIKE ? OR description LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY category, name';

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getMenuItemById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM cafeteria_menu WHERE id = ?`, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    createMenuItem(item) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO cafeteria_menu (name, description, price, category, availability) VALUES (?, ?, ?, ?, ?)`;
            this.db.run(sql, [item.name, item.description, item.price, item.category, item.availability], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...item });
            });
        });
    }

    updateMenuItem(id, item) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE cafeteria_menu SET name = ?, description = ?, price = ?, category = ?, availability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            this.db.run(sql, [item.name, item.description, item.price, item.category, item.availability, id], function(err) {
                if (err) reject(err);
                else resolve({ id: parseInt(id), ...item });
            });
        });
    }

    deleteMenuItem(id) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM cafeteria_menu WHERE id = ?`, [id], function(err) {
                if (err) reject(err);
                else resolve({ message: 'Menu item deleted successfully' });
            });
        });
    }

    getCafeteriaInfo() {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM cafeteria_info ORDER BY id DESC LIMIT 1`, (err, row) => {
                if (err) reject(err);
                else resolve(row || { location: 'Main Campus', contact: 'N/A', hours: '8:00 AM - 8:00 PM' });
            });
        });
    }

    updateCafeteriaInfo(info) {
        return new Promise((resolve, reject) => {
            // First check if info exists
            this.db.get(`SELECT id FROM cafeteria_info LIMIT 1`, (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    // Update existing
                    const sql = `UPDATE cafeteria_info SET location = ?, contact = ?, hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    this.db.run(sql, [info.location, info.contact, info.hours, row.id], function(err) {
                        if (err) reject(err);
                        else resolve({ id: row.id, ...info });
                    });
                } else {
                    // Insert new
                    const sql = `INSERT INTO cafeteria_info (location, contact, hours) VALUES (?, ?, ?)`;
                    this.db.run(sql, [info.location, info.contact, info.hours], function(err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID, ...info });
                    });
                }
            });
        });
    }

    // Schedule Methods
    createSchedule(schedule) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO schedules (resource_type, resource_id, day_of_week, start_time, end_time, subject, instructor, course_code) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            this.db.run(sql, [
                schedule.resource_type,
                schedule.resource_id,
                schedule.day_of_week,
                schedule.start_time,
                schedule.end_time,
                schedule.subject,
                schedule.instructor || null,
                schedule.course_code || null
            ], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...schedule });
            });
        });
    }

    getSchedulesByResource(resourceType, resourceId, dayOfWeek = null) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM schedules WHERE resource_type = ? AND resource_id = ?`;
            const params = [resourceType, resourceId];

            if (dayOfWeek) {
                sql += ' AND day_of_week = ?';
                params.push(dayOfWeek);
            }

            sql += ' ORDER BY day_of_week, start_time';

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    updateSchedule(scheduleId, updates) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];

            if (updates.day_of_week) {
                fields.push('day_of_week = ?');
                values.push(updates.day_of_week);
            }
            if (updates.start_time) {
                fields.push('start_time = ?');
                values.push(updates.start_time);
            }
            if (updates.end_time) {
                fields.push('end_time = ?');
                values.push(updates.end_time);
            }
            if (updates.subject) {
                fields.push('subject = ?');
                values.push(updates.subject);
            }
            if (updates.instructor !== undefined) {
                fields.push('instructor = ?');
                values.push(updates.instructor);
            }
            if (updates.course_code !== undefined) {
                fields.push('course_code = ?');
                values.push(updates.course_code);
            }

            if (fields.length === 0) {
                return reject(new Error('No fields to update'));
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(scheduleId);

            const sql = `UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`;

            this.db.run(sql, values, function(err) {
                if (err) reject(err);
                else resolve({ id: scheduleId, changes: this.changes });
            });
        });
    }

    deleteSchedule(scheduleId) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM schedules WHERE id = ?`;
            this.db.run(sql, [scheduleId], function(err) {
                if (err) reject(err);
                else resolve({ deleted: this.changes });
            });
        });
    }

    // Booking Request Methods
    createBookingRequest(bookingData) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO booking_requests 
                        (user_id, resource_type, resource_id, date, start_time, end_time, program_name, description, participant_count) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            this.db.run(sql, [
                bookingData.user_id,
                bookingData.resource_type,
                bookingData.resource_id,
                bookingData.date,
                bookingData.start_time,
                bookingData.end_time,
                bookingData.program_name,
                bookingData.description || null,
                bookingData.participant_count || null
            ], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...bookingData, status: 'pending' });
            });
        });
    }

    getAllBookingRequests(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT br.*, 
                       u.name as requester_name, 
                       u.student_id as requester_student_id,
                       CASE 
                           WHEN br.resource_type = 'classroom' THEN c.room
                           WHEN br.resource_type = 'lab' THEN l.name
                       END as resource_name
                FROM booking_requests br
                JOIN users u ON br.user_id = u.id
                LEFT JOIN classrooms c ON br.resource_type = 'classroom' AND br.resource_id = c.id
                LEFT JOIN labs l ON br.resource_type = 'lab' AND br.resource_id = l.id
            `;
            const params = [];
            const conditions = [];

            if (filters.status && filters.status !== 'all') {
                conditions.push('br.status = ?');
                params.push(filters.status);
            }

            if (filters.user_id) {
                conditions.push('br.user_id = ?');
                params.push(filters.user_id);
            }

            if (filters.resource_type) {
                conditions.push('br.resource_type = ?');
                params.push(filters.resource_type);
            }

            if (filters.resource_id) {
                conditions.push('br.resource_id = ?');
                params.push(filters.resource_id);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY br.created_at DESC';

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getBookingRequestById(id) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT br.*, 
                       u.name as requester_name, 
                       u.student_id as requester_student_id,
                       CASE 
                           WHEN br.resource_type = 'classroom' THEN c.room
                           WHEN br.resource_type = 'lab' THEN l.name
                       END as resource_name
                FROM booking_requests br
                JOIN users u ON br.user_id = u.id
                LEFT JOIN classrooms c ON br.resource_type = 'classroom' AND br.resource_id = c.id
                LEFT JOIN labs l ON br.resource_type = 'lab' AND br.resource_id = l.id
                WHERE br.id = ?
            `;
            this.db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    updateBookingRequestStatus(id, status, adminId, adminNotes = null) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE booking_requests 
                        SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, 
                            admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?`;
            this.db.run(sql, [status, adminId, adminNotes, id], function(err) {
                if (err) reject(err);
                else resolve({ id: id, status: status, changes: this.changes });
            });
        });
    }

    deleteBookingRequest(id) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM booking_requests WHERE id = ?`;
            this.db.run(sql, [id], function(err) {
                if (err) reject(err);
                else resolve({ deleted: this.changes });
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;