// cleanup-database.js - Remove unused tables from the database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'campus_info.db');
const db = new sqlite3.Database(dbPath);

console.log('🧹 Starting database cleanup...');
console.log('📋 Removing unused tables: bookings, lab_sessions, status_reports\n');

db.serialize(() => {
    // Drop unused tables
    db.run('DROP TABLE IF EXISTS bookings', (err) => {
        if (err) {
            console.error('❌ Error dropping bookings table:', err.message);
        } else {
            console.log('✅ Dropped bookings table');
        }
    });

    db.run('DROP TABLE IF EXISTS lab_sessions', (err) => {
        if (err) {
            console.error('❌ Error dropping lab_sessions table:', err.message);
        } else {
            console.log('✅ Dropped lab_sessions table');
        }
    });

    db.run('DROP TABLE IF EXISTS status_reports', (err) => {
        if (err) {
            console.error('❌ Error dropping status_reports table:', err.message);
        } else {
            console.log('✅ Dropped status_reports table');
        }
    });

    // Also clean up related indexes if they exist
    db.run('DROP INDEX IF EXISTS idx_bookings_date', (err) => {
        if (err && !err.message.includes('no such index')) {
            console.error('❌ Error dropping booking index:', err.message);
        }
    });

    db.run('DROP INDEX IF EXISTS idx_bookings_resource', (err) => {
        if (err && !err.message.includes('no such index')) {
            console.error('❌ Error dropping booking index:', err.message);
        }
    });

    db.run('DROP INDEX IF EXISTS idx_bookings_status', (err) => {
        if (err && !err.message.includes('no such index')) {
            console.error('❌ Error dropping booking index:', err.message);
        }
    });

    db.run('DROP INDEX IF EXISTS idx_bookings_user', (err) => {
        if (err && !err.message.includes('no such index')) {
            console.error('❌ Error dropping booking index:', err.message);
        }
    });

    db.run('DROP INDEX IF EXISTS idx_lab_sessions_lab_id', (err) => {
        if (err && !err.message.includes('no such index')) {
            console.error('❌ Error dropping lab_sessions index:', err.message);
        }
    });

    db.run('DROP INDEX IF EXISTS idx_lab_sessions_status', (err) => {
        if (err && !err.message.includes('no such index')) {
            console.error('❌ Error dropping lab_sessions index:', err.message);
        }
    });

    db.run('DROP INDEX IF EXISTS idx_lab_sessions_user_id', (err) => {
        if (err && !err.message.includes('no such index')) {
            console.error('❌ Error dropping lab_sessions index:', err.message);
        }
    });

    // Wait a bit for all operations to complete, then close
    setTimeout(() => {
        console.log('\n🎉 Database cleanup completed!');
        console.log('📊 Remaining tables: users, classrooms, labs, buses, bus_stops,');
        console.log('   cafeteria_menu, cafeteria_info, schedules\n');
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('✅ Database connection closed');
            }
        });
    }, 500);
});
