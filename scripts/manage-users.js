const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = process.env.DB_PATH || './data/localchat.db';

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found at:', DB_PATH);
    console.log('Please run database initialization first:');
    console.log('  npx tsx scripts/init-db.ts');
    process.exit(1);
}

const db = new sqlite3.Database(DB_PATH);

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function runUpdate(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes, lastID: this.lastID });
        });
    });
}

async function listUsers() {
    console.log('\n📋 Current Users:');
    console.log('================');
    
    const users = await runQuery(`
        SELECT id, username, role, created_at, last_login, status 
        FROM users 
        ORDER BY created_at DESC
    `);
    
    if (users.length === 0) {
        console.log('No users found.');
        return;
    }
    
    users.forEach(user => {
        console.log(`ID: ${user.id} | Username: ${user.username} | Role: ${user.role} | Status: ${user.status}`);
        console.log(`  Created: ${user.created_at} | Last Login: ${user.last_login || 'Never'}`);
        console.log('');
    });
}

async function removeUser(username) {
    try {
        // Check if user exists
        const user = await runQuery('SELECT id, username, role FROM users WHERE username = ?', [username]);
        
        if (user.length === 0) {
            console.log(`❌ User '${username}' not found.`);
            return;
        }
        
        const userInfo = user[0];
        
        // Prevent removing the last admin
        if (userInfo.role === 'admin') {
            const adminCount = await runQuery('SELECT COUNT(*) as count FROM users WHERE role = ? AND status = ?', ['admin', 'active']);
            if (adminCount[0].count <= 1) {
                console.log('❌ Cannot remove the last admin user. Create another admin first.');
                return;
            }
        }
        
        // Remove user's messages
        await runUpdate('DELETE FROM messages WHERE sender_id = ?', [userInfo.id]);
        await runUpdate('DELETE FROM message_reads WHERE user_id = ?', [userInfo.id]);
        
        // Remove user from groups
        await runUpdate('DELETE FROM group_members WHERE user_id = ?', [userInfo.id]);
        
        // Remove user's sessions
        await runUpdate('DELETE FROM sessions WHERE user_id = ?', [userInfo.id]);
        
        // Remove the user
        const result = await runUpdate('DELETE FROM users WHERE id = ?', [userInfo.id]);
        
        if (result.changes > 0) {
            console.log(`✅ User '${username}' removed successfully.`);
        } else {
            console.log(`❌ Failed to remove user '${username}'.`);
        }
        
    } catch (error) {
        console.error('❌ Error removing user:', error);
    }
}

async function changePassword(username, newPassword) {
    try {
        const user = await runQuery('SELECT id FROM users WHERE username = ?', [username]);
        
        if (user.length === 0) {
            console.log(`❌ User '${username}' not found.`);
            return;
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await runUpdate(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [hashedPassword, username]
        );
        
        if (result.changes > 0) {
            console.log(`✅ Password changed successfully for user '${username}'.`);
        } else {
            console.log(`❌ Failed to change password for user '${username}'.`);
        }
        
    } catch (error) {
        console.error('❌ Error changing password:', error);
    }
}

async function createUser(username, password, role = 'user') {
    try {
        // Check if user already exists
        const existingUser = await runQuery('SELECT id FROM users WHERE username = ?', [username]);
        
        if (existingUser.length > 0) {
            console.log(`❌ User '${username}' already exists.`);
            return;
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await runUpdate(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );
        
        if (result.lastID) {
            console.log(`✅ User '${username}' created successfully with role '${role}'.`);
        } else {
            console.log(`❌ Failed to create user '${username}'.`);
        }
        
    } catch (error) {
        console.error('❌ Error creating user:', error);
    }
}

async function cleanupDemo() {
    console.log('\n🧹 Cleaning up demo/test data...');
    
    // List of demo usernames to remove
    const demoUsernames = ['demo', 'test', 'guest', 'sample'];
    
    for (const username of demoUsernames) {
        await removeUser(username);
    }
    
    // Remove test messages
    await runUpdate("DELETE FROM messages WHERE content LIKE '%test%' OR content LIKE '%demo%'");
    
    console.log('✅ Demo cleanup completed.');
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    console.log('🔧 LGU-Chat User Management Tool');
    console.log('================================');
    
    try {
        switch (command) {
            case 'list':
                await listUsers();
                break;
                
            case 'remove':
                if (!args[1]) {
                    console.log('❌ Usage: node manage-users.js remove <username>');
                    break;
                }
                await removeUser(args[1]);
                break;
                
            case 'password':
                if (!args[1] || !args[2]) {
                    console.log('❌ Usage: node manage-users.js password <username> <new-password>');
                    break;
                }
                await changePassword(args[1], args[2]);
                break;
                
            case 'create':
                if (!args[1] || !args[2]) {
                    console.log('❌ Usage: node manage-users.js create <username> <password> [role]');
                    break;
                }
                await createUser(args[1], args[2], args[3] || 'user');
                break;
                
            case 'cleanup':
                await cleanupDemo();
                break;
                
            default:
                console.log('Available commands:');
                console.log('  list                           - List all users');
                console.log('  remove <username>              - Remove a user');
                console.log('  password <username> <password> - Change user password');
                console.log('  create <username> <password> [role] - Create new user');
                console.log('  cleanup                        - Remove demo/test data');
                console.log('');
                console.log('Examples:');
                console.log('  node manage-users.js list');
                console.log('  node manage-users.js remove demo');
                console.log('  node manage-users.js password admin newSecurePassword123');
                console.log('  node manage-users.js create john password123 user');
                console.log('  node manage-users.js cleanup');
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        db.close();
    }
}

main(); 