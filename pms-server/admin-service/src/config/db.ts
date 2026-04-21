import mysql from 'mysql2/promise';
import { logger } from '../logger/logger';

const pool = mysql.createPool({
    host: process.env['MYSQL_HOST'] || 'pms-mysql',
    port: Number(process.env['MYSQL_PORT']) || 3306,
    user: process.env['MYSQL_USER'] || 'pms_user',
    password: process.env['MYSQL_PASSWORD'] || 'pms_password',
    database: process.env['MYSQL_DATABASE'] || 'pms_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export async function connectDB(): Promise<void> {
    try {
        const conn = await pool.getConnection();
        logger.info('MySQL connected successfully');
        conn.release();
    } catch (error) {
        logger.error({ err: error }, 'MySQL connection failed');
        process.exit(1);
    }
}

export default pool;
