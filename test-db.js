// test-db.js - Test SQLite Database
const Database = require('./database');

async function testDatabase() {
    const db = new Database();
    
    try {
        await db.init();
        console.log('✅ Database connection successful');
        
        // Test fetching classrooms
        const classrooms = await db.getAllClassrooms();
        console.log(`✅ Found ${classrooms.length} classrooms`);
        
        // Test fetching labs
        const labs = await db.getAllLabs();
        console.log(`✅ Found ${labs.length} labs`);
        
        // Test fetching buses
        const buses = await db.getAllBuses();
        console.log(`✅ Found ${buses.length} buses`);
        
        console.log('\n📊 Sample data:');
        console.log('Classrooms:', classrooms.slice(0, 2));
        console.log('Labs:', labs.slice(0, 2));
        console.log('Buses:', buses.slice(0, 1));
        
        db.close();
        console.log('\n✅ Database test completed successfully!');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        db.close();
    }
}

testDatabase();