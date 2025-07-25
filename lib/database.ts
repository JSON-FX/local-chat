import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

// Database interface for type safety
export interface Database {
  run: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  close: () => Promise<void>;
}

class DatabaseConnection {
  private db: sqlite3.Database | null = null;

  async connect(): Promise<Database> {
    if (this.db) {
      return this.promisifyMethods(this.db);
    }

    const dbPath = path.join(process.cwd(), 'data', 'localchat.db');
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Enable foreign keys
        this.db!.run('PRAGMA foreign_keys = ON');
        resolve(this.promisifyMethods(this.db!));
      });
    });
  }

  async forceReconnect(): Promise<Database> {
    await this.close();
    return await this.connect();
  }

  private promisifyMethods(db: sqlite3.Database): Database {
    return {
      run: (sql: string, params?: any[]) => {
        return new Promise<sqlite3.RunResult>((resolve, reject) => {
          db.run(sql, params || [], function(err) {
            if (err) {
              reject(err);
            } else {
              // 'this' context contains lastID, changes, etc.
              resolve(this as sqlite3.RunResult);
            }
          });
        });
      },
      get: promisify(db.get.bind(db)),
      all: promisify(db.all.bind(db)),
      close: promisify(db.close.bind(db))
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        await promisify(this.db.close.bind(this.db))();
      } catch (error) {
        console.error('Error closing database:', error);
      } finally {
        this.db = null;
      }
    }
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

export const getDatabase = async (): Promise<Database> => {
  return await dbConnection.connect();
};

export const closeDatabase = async (): Promise<void> => {
  await dbConnection.close();
};

export const forceReconnectDatabase = async (): Promise<Database> => {
  return await dbConnection.forceReconnect();
};
