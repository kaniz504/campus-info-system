// test-auth.js - Test Authentication Endpoints
const Database = require('./database');

async function testAuth() {
    const db = new Database();
    
    try {
        await db.init();
        console.log('✅ Database initialized');
        
        // Test creating a user
        console.log('\n🧪 Testing user creation...');
        try {
            const newUser = await db.createUser({
                student_id: 'test123',
                name: 'Test Student',
                password: 'password123',
                role: 'student'
            });
            console.log('✅ User created:', newUser);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                console.log('ℹ️ User already exists');
            } else {
                console.error('❌ Error creating user:', error);
            }
        }
        
        // Test finding user
        console.log('\n🧪 Testing user lookup...');
        const user = await db.findUserByStudentId('admin');
        if (user) {
            console.log('✅ Admin user found:', {
                id: user.id,
                student_id: user.student_id,
                name: user.name,
                role: user.role
            });
        } else {
            console.log('❌ Admin user not found');
        }
        
        // Test password validation
        console.log('\n🧪 Testing password validation...');
        if (user) {
            const isValid = await db.validatePassword('admin123', user.password);
            console.log('✅ Password validation result:', isValid);
        }
        
        db.close();
        console.log('\n✅ Authentication test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        db.close();
    }
}

testAuth();