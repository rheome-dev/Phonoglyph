"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDevelopmentData = void 0;
const connection_1 = require("../connection");
async function seedDevelopmentData() {
    try {
        console.log('🌱 Seeding development data...');
        // Insert test user
        const userResult = await connection_1.pool.query(`
      INSERT INTO users (name, email, image) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name, 
        image = EXCLUDED.image
      RETURNING id
    `, ['Test User', 'test@phonoglyph.com', 'https://via.placeholder.com/150']);
        const userId = userResult.rows[0].id;
        console.log(`✅ Test user created/updated: ${userId}`);
        // Insert test project
        const projectResult = await connection_1.pool.query(`
      INSERT INTO projects (name, user_id, midi_file_path, render_configuration) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
            'Sample MIDI Project',
            userId,
            '/uploads/sample.mid',
            JSON.stringify({
                resolution: '1920x1080',
                fps: 60,
                theme: 'default',
                effects: ['piano-roll', 'particles']
            })
        ]);
        if (projectResult.rows.length > 0) {
            console.log(`✅ Test project created: ${projectResult.rows[0].id}`);
        }
        else {
            console.log('⏭️ Test project already exists');
        }
        console.log('🎉 Development data seeded successfully!');
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}
exports.seedDevelopmentData = seedDevelopmentData;
// Run seeding if this file is executed directly
if (require.main === module) {
    seedDevelopmentData().then(() => {
        connection_1.pool.end();
        process.exit(0);
    }).catch((error) => {
        console.error(error);
        connection_1.pool.end();
        process.exit(1);
    });
}
//# sourceMappingURL=development.js.map