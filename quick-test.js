// quick-test.js - Quick test of the fixed functionality
const Database = require('./database');

async function quickTest() {
    console.log('🧪 Starting quick test...');
    
    const db = new Database();
    
    try {
        await db.init();
        
        // Check if admin exists
        const admin = await db.findUserByStudentId('admin');
        console.log('Admin user exists:', !!admin);
        
        if (admin) {
            console.log('Admin details:', {
                id: admin.id,
                student_id: admin.student_id,
                name: admin.name,
                role: admin.role
            });
        }
        
        // Try to create a test student
        try {
            const testStudent = await db.createUser({
                student_id: 'test456',
                name: 'Test Student',
                password: 'password123',
                role: 'student'
            });
            console.log('✅ Test student created:', testStudent);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                console.log('ℹ️ Test student already exists');
            } else {
                console.error('❌ Error creating test student:', error.message);
            }
        }
        
        db.close();
        console.log('✅ Quick test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        db.close();
    }
}

quickTest();