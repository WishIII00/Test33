/**
 * SQL Server Database Connection Configuration
 * 
 * จัดการการเชื่อมต่อฐานข้อมูล ShareholderSummary
 * 
 * @author Your Company
 * @version 1.0.0
 */

require('dotenv').config();
const sql = require('mssql');

// การตั้งค่าการเชื่อมต่อฐานข้อมูล SQL Server
const dbConfig = {
    user: process.env.DB_USER || 'invconnect',
    password: process.env.DB_PASSWORD || '@inv2021!',
    server: process.env.DB_SERVER || 'pro.inventech.co.th',
    database: process.env.DB_NAME || 'INVCON_DEV23N',
    port: parseInt(process.env.DB_PORT, 10) || 1433,

    options: {
        encrypt: false,               // ปิดการเข้ารหัสสำหรับ local SQL Server
        trustServerCertificate: true, // ยอมรับใบรับรองเซิร์ฟเวอร์
        enableArithAbort: true,       // ปิด Arithmetic Abort
        connectionTimeout: 30000,     // เวลาเชื่อมต่อสูงสุด 30 วินาที
        requestTimeout: 30000         // เวลา query สูงสุด 30 วินาที
    },

    pool: {
        max: 10,                     // จำนวน connection สูงสุดใน pool
        min: 0,                      // จำนวน connection ต่ำสุดใน pool
        idleTimeoutMillis: 30000     // timeout สำหรับ connection ที่ไม่ได้ใช้งาน (30 วินาที)
    }
};

let pool = null;

/**
 * เชื่อมต่อกับฐานข้อมูล และคืนค่า Connection Pool
 * @returns {Promise<sql.ConnectionPool>} Connection Pool
 */
const connectDatabase = async () => {
    try {
        console.log('🔌 กำลังเชื่อมต่อ SQL Server...');
        console.log(`📍 Server: ${dbConfig.server}:${dbConfig.port}`);
        console.log(`🗄️  Database: ${dbConfig.database}`);

        pool = new sql.ConnectionPool(dbConfig);
        await pool.connect();

        // ทดสอบการเชื่อมต่อด้วย query เวลา
        const result = await pool.request().query('SELECT GETDATE() AS currentTime');
        console.log('✅ เชื่อมต่อ SQL Server สำเร็จ!');
        console.log('🕒 เวลาในฐานข้อมูล:', result.recordset[0].currentTime);

        return pool;

    } catch (error) {
        console.error('❌ ไม่สามารถเชื่อมต่อ Database:', error.message);
        console.error('🔧 ตรวจสอบการตั้งค่า .env, เครือข่าย และข้อมูลผู้ใช้');
        throw error;
    }
};

/**
 * ปิดการเชื่อมต่อฐานข้อมูลอย่างถูกต้อง
 */
const closeDatabase = async () => {
    try {
        if (pool) {
            console.log('🔌 กำลังปิดการเชื่อมต่อ Database...');
            await pool.close();
            pool = null;
            console.log('✅ ปิดการเชื่อมต่อ Database แล้ว');
        }
    } catch (error) {
        console.error('❌ ข้อผิดพลาดในการปิดการเชื่อมต่อ:', error.message);
        throw error;
    }
};

/**
 * คืนค่า Connection Pool ปัจจุบัน
 * @throws Error หากยังไม่ได้เชื่อมต่อ
 * @returns {sql.ConnectionPool} Connection Pool
 */
const getPool = () => {
    if (!pool) {
        throw new Error('ยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาเรียก connectDatabase() ก่อน');
    }
    return pool;
};

/**
 * ตรวจสอบสถานะการเชื่อมต่อฐานข้อมูล
 * @returns {Promise<Object>} ผลการตรวจสอบสถานะ
 */
const checkHealth = async () => {
    try {
        if (!pool || !pool.connected) {
            return {
                status: 'disconnected',
                connected: false,
                error: 'ไม่มีการเชื่อมต่อฐานข้อมูล'
            };
        }

        const start = Date.now();
        await pool.request().query('SELECT 1 AS test');
        const responseTime = Date.now() - start;

        return {
            status: 'connected',
            connected: true,
            responseTime,
            server: dbConfig.server,
            database: dbConfig.database
        };

    } catch (error) {
        return {
            status: 'error',
            connected: false,
            error: error.message
        };
    }
};

module.exports = {
    connectDatabase,
    closeDatabase,
    getPool,
    checkHealth,
    sql // ส่งออกตัว sql สำหรับใช้ในโมดูลอื่นๆ
};
