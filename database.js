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

                -- Create indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_users_student_id ON users (student_id);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
                CREATE INDEX IF NOT EXISTS idx_classrooms_dept ON classrooms (dept);
                CREATE INDEX IF NOT EXISTS idx_classrooms_floor ON classrooms (floor);
                CREATE INDEX IF NOT EXISTS idx_labs_status ON labs (status);
                CREATE INDEX IF NOT EXISTS idx_labs_dept ON labs (dept);
                CREATE INDEX IF NOT EXISTS idx_buses_number ON buses (number);
                CREATE INDEX IF NOT EXISTS idx_bus_stops_bus_id ON bus_stops (bus_id);
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
                    { name: 'CSE Programming Lab 1', dept: 'CSE', location: '1st Floor, Room 1-105', computers: 50, status: 'open', hours: '8:00 AM - 6:00 PM' },
                    { name: 'CSE Programming Lab 2', dept: 'CSE', location: '1st Floor, Room 1-106', computers: 45, status: 'open', hours: '8:00 AM - 8:00 PM' },
                    { name: 'EEE Circuit Lab', dept: 'EEE', location: '2nd Floor, Room 2-205', computers: 30, status: 'closed', hours: 'Maintenance until 3:00 PM' },
                    { name: 'Physics Lab', dept: 'Physics', location: 'Ground Floor, Room G-015', computers: 25, status: 'open', hours: '9:00 AM - 5:00 PM' },
                    { name: 'Chemistry Lab', dept: 'Chemistry', location: 'Ground Floor, Room G-016', computers: 30, status: 'open', hours: '9:00 AM - 5:00 PM' },
                    { name: 'Network & Security Lab', dept: 'CSE', location: '3rd Floor, Room 3-308', computers: 40, status: 'closed', hours: 'Scheduled class until 4:30 PM' },
                    { name: 'CAD Lab', dept: 'Civil', location: '2nd Floor, Room 2-210', computers: 35, status: 'open', hours: '8:00 AM - 6:00 PM' }
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
            const sql = `INSERT INTO labs (name, dept, location, computers, status, hours) VALUES (?, ?, ?, ?, ?, ?)`;
            this.db.run(sql, [lab.name, lab.dept, lab.location, lab.computers, lab.status, lab.hours], function(err) {
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