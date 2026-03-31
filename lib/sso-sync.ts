import "./env";
import { getDatabase } from './database';

const SSO_API_URL = process.env.SSO_API_URL || 'http://lgu-sso.test/api/v1';
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || '';
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET || '';
const SYNC_INTERVAL_MS = parseInt(process.env.SSO_SYNC_INTERVAL_MS || '300000', 10);
const SYNC_REQUEST_TIMEOUT = 10000;

interface SsoEmployee {
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  position: string | null;
  office_name: string | null;
  is_active: boolean;
}

async function fetchSsoEmployees(): Promise<SsoEmployee[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNC_REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${SSO_API_URL}/sso/employees`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': SSO_CLIENT_ID,
        'X-Client-Secret': SSO_CLIENT_SECRET,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[SSO Sync] Failed to fetch employees: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.error('[SSO Sync] Request timed out');
    } else {
      console.error('[SSO Sync] Request failed:', error.message);
    }
    return null;
  }
}

export async function syncEmployees(): Promise<void> {
  const employees = await fetchSsoEmployees();
  if (!employees) {
    console.warn('[SSO Sync] Skipping sync — could not reach SSO');
    return;
  }

  const db = await getDatabase();
  let created = 0;
  let updated = 0;
  let deactivated = 0;

  const ssoUuids = new Set(employees.map((e) => e.uuid));

  for (const emp of employees) {
    const existing = await db.get(
      'SELECT id, status FROM users WHERE sso_employee_uuid = ?',
      [emp.uuid]
    );

    const status = emp.is_active ? 'active' : 'inactive';

    if (existing) {
      await db.run(
        `UPDATE users SET
          username = ?, email = ?, full_name = ?, name = ?, middle_name = ?, last_name = ?,
          position = ?, office_name = ?, status = ?, profile_synced_at = CURRENT_TIMESTAMP
        WHERE sso_employee_uuid = ?`,
        [emp.username, emp.email, emp.full_name, emp.first_name, emp.middle_name, emp.last_name,
         emp.position, emp.office_name, status, emp.uuid]
      );
      if (existing.status !== status) {
        deactivated += status === 'inactive' ? 1 : 0;
      }
      updated++;
    } else {
      await db.run(
        `INSERT INTO users (sso_employee_uuid, username, email, full_name, name, middle_name, last_name, position, office_name, status, role, profile_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', CURRENT_TIMESTAMP)`,
        [emp.uuid, emp.username, emp.email, emp.full_name, emp.first_name, emp.middle_name, emp.last_name,
         emp.position, emp.office_name, status]
      );
      created++;
    }
  }

  // Deactivate local users not in SSO response (deleted from SSO)
  const localUsers = await db.all(
    "SELECT id, sso_employee_uuid FROM users WHERE status = 'active' AND sso_employee_uuid IS NOT NULL AND id != 0"
  );

  for (const local of localUsers) {
    if (!ssoUuids.has(local.sso_employee_uuid)) {
      await db.run("UPDATE users SET status = 'inactive' WHERE id = ?", [local.id]);
      deactivated++;
    }
  }

  console.log(`[SSO Sync] Done — created: ${created}, updated: ${updated}, deactivated: ${deactivated}`);
}

let syncInterval: NodeJS.Timeout | null = null;

export function startSyncScheduler(): void {
  // Run initial sync
  syncEmployees().catch((err) => {
    console.error('[SSO Sync] Initial sync failed:', err.message);
  });

  // Schedule periodic sync
  syncInterval = setInterval(() => {
    syncEmployees().catch((err) => {
      console.error('[SSO Sync] Scheduled sync failed:', err.message);
    });
  }, SYNC_INTERVAL_MS);

  console.log(`[SSO Sync] Scheduler started — interval: ${SYNC_INTERVAL_MS / 1000}s`);
}

export function stopSyncScheduler(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[SSO Sync] Scheduler stopped');
  }
}
