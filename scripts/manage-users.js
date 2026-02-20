const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = process.env.DB_PATH || './data/localchat.db';

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found at:', DB_PATH);
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
    console.log('\nCurrent Users:');
    console.log('================');

    const users = await runQuery(`
        SELECT id, sso_employee_uuid, username, full_name, role, created_at, last_login, status
        FROM users
        ORDER BY created_at DESC
    `);

    if (users.length === 0) {
        console.log('No users found.');
        return;
    }

    users.forEach(user => {
        console.log(`ID: ${user.id} | Name: ${user.full_name || user.username} | Role: ${user.role} | Status: ${user.status}`);
        console.log(`  SSO UUID: ${user.sso_employee_uuid}`);
        console.log(`  Created: ${user.created_at} | Last Login: ${user.last_login || 'Never'}`);
        console.log('');
    });
}

async function removeUser(identifier) {
    try {
        // Check if user exists (search by username or SSO UUID)
        const user = await runQuery(
            'SELECT id, username, full_name, role, sso_employee_uuid FROM users WHERE username = ? OR sso_employee_uuid = ?',
            [identifier, identifier]
        );

        if (user.length === 0) {
            console.log(`User '${identifier}' not found.`);
            return;
        }

        const userInfo = user[0];

        // Prevent removing the system user
        if (userInfo.id === 0) {
            console.log('Cannot remove the system user.');
            return;
        }

        // Prevent removing the last admin
        if (userInfo.role === 'admin') {
            const adminCount = await runQuery('SELECT COUNT(*) as count FROM users WHERE role = ? AND status = ?', ['admin', 'active']);
            if (adminCount[0].count <= 1) {
                console.log('Cannot remove the last admin user.');
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
            console.log(`User '${userInfo.full_name || userInfo.username}' (${userInfo.sso_employee_uuid}) removed successfully.`);
        } else {
            console.log(`Failed to remove user '${identifier}'.`);
        }

    } catch (error) {
        console.error('Error removing user:', error);
    }
}

async function setRole(identifier, role) {
    try {
        const validRoles = ['admin', 'moderator', 'user'];
        if (!validRoles.includes(role)) {
            console.log(`Invalid role '${role}'. Valid roles: ${validRoles.join(', ')}`);
            return;
        }

        const user = await runQuery(
            'SELECT id, username, full_name, role FROM users WHERE username = ? OR sso_employee_uuid = ?',
            [identifier, identifier]
        );

        if (user.length === 0) {
            console.log(`User '${identifier}' not found.`);
            return;
        }

        const userInfo = user[0];
        const result = await runUpdate('UPDATE users SET role = ? WHERE id = ?', [role, userInfo.id]);

        if (result.changes > 0) {
            console.log(`Role changed for '${userInfo.full_name || userInfo.username}': ${userInfo.role} -> ${role}`);
        } else {
            console.log(`Failed to change role for '${identifier}'.`);
        }

    } catch (error) {
        console.error('Error changing role:', error);
    }
}

async function setStatus(identifier, status) {
    try {
        const validStatuses = ['active', 'inactive', 'banned'];
        if (!validStatuses.includes(status)) {
            console.log(`Invalid status '${status}'. Valid statuses: ${validStatuses.join(', ')}`);
            return;
        }

        const user = await runQuery(
            'SELECT id, username, full_name, status FROM users WHERE username = ? OR sso_employee_uuid = ?',
            [identifier, identifier]
        );

        if (user.length === 0) {
            console.log(`User '${identifier}' not found.`);
            return;
        }

        const userInfo = user[0];
        const result = await runUpdate('UPDATE users SET status = ? WHERE id = ?', [status, userInfo.id]);

        if (result.changes > 0) {
            console.log(`Status changed for '${userInfo.full_name || userInfo.username}': ${userInfo.status} -> ${status}`);
        } else {
            console.log(`Failed to change status for '${identifier}'.`);
        }

    } catch (error) {
        console.error('Error changing status:', error);
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    console.log('LGU-Chat User Management Tool (SSO Mode)');
    console.log('=========================================');
    console.log('NOTE: Users are provisioned via LGU-SSO. Password management is handled by SSO.');
    console.log('');

    try {
        switch (command) {
            case 'list':
                await listUsers();
                break;

            case 'remove':
                if (!args[1]) {
                    console.log('Usage: node manage-users.js remove <username|sso_uuid>');
                    break;
                }
                await removeUser(args[1]);
                break;

            case 'role':
                if (!args[1] || !args[2]) {
                    console.log('Usage: node manage-users.js role <username|sso_uuid> <admin|moderator|user>');
                    break;
                }
                await setRole(args[1], args[2]);
                break;

            case 'status':
                if (!args[1] || !args[2]) {
                    console.log('Usage: node manage-users.js status <username|sso_uuid> <active|inactive|banned>');
                    break;
                }
                await setStatus(args[1], args[2]);
                break;

            default:
                console.log('Available commands:');
                console.log('  list                                    - List all users');
                console.log('  remove <username|sso_uuid>              - Remove a user');
                console.log('  role <username|sso_uuid> <role>         - Change user role');
                console.log('  status <username|sso_uuid> <status>     - Change user status');
                console.log('');
                console.log('Examples:');
                console.log('  node manage-users.js list');
                console.log('  node manage-users.js remove "John Doe"');
                console.log('  node manage-users.js role "John Doe" admin');
                console.log('  node manage-users.js status "John Doe" banned');
                break;
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        db.close();
    }
}

main();
