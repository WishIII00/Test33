/**
 * Main API Server for Shareholder Search
 * 
 * ให้บริการ API สำหรับ:
 * - ดึงข้อมูลผู้ถือหุ้นทั้งหมด
 * - ค้นหาผู้ถือหุ้นตามคำค้น
 * - ค้นหาตาม Account ID
 * - ดูผู้ถือหุ้นรายใหญ่
 * 
 * @author Your Company
 * @version 1.0.0
 */

require('dotenv').config();           // โหลดค่าตัวแปรแวดล้อม
const express = require('express');
const cors = require('cors');

const { connectDatabase, closeDatabase, checkHealth } = require('./config/database');
const searchRoutes = require('./routes/search');

const app = express();

const PORT = process.env.PORT || 3000;
const API_NAME = 'ShareholderSummary Search API';
const VERSION = '1.0.0';

// Middleware ตั้งค่า CORS และแปลง JSON/form data
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware log คำขอ
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
});

// Root endpoint: แสดงข้อมูล API พื้นฐาน
app.get('/', (req, res) => {
    res.json({
        name: API_NAME,
        version: VERSION,
        description: 'API สำหรับค้นหาและดึงข้อมูลผู้ถือหุ้นจาก SQL Server',
        status: 'ทำงานปกติ',
        timestamp: new Date().toISOString(),
        endpoints: {
            all: '/api/all',
            search: '/api/search?q=keyword',
            byAccount: '/api/by-account/:accountId',
            topHolders: '/api/top-holders',
            count: '/api/count',
            health: '/health'
        }
    });
});

// เชื่อม API routes สำหรับฟีเจอร์ต่าง ๆ
app.use('/api', searchRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await checkHealth();

        const healthInfo = {
            api: 'ทำงานปกติ',
            database: dbHealth.connected ? 'เชื่อมต่อแล้ว' : 'ไม่เชื่อมต่อ',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            memoryMB: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        };

        if (dbHealth.connected) {
            healthInfo.databaseResponseTimeMs = dbHealth.responseTime;
            res.status(200).json(healthInfo);
        } else {
            healthInfo.error = dbHealth.error;
            res.status(503).json(healthInfo);
        }
    } catch (error) {
        res.status(503).json({
            api: 'ทำงานปกติ',
            database: 'เกิดข้อผิดพลาด',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `ไม่พบหน้า: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});

// Error handler กลาง
app.use((err, req, res, next) => {
    console.error('Internal Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: err.message,
        timestamp: new Date().toISOString()
    });
});

// ฟังก์ชันเริ่มเซิร์ฟเวอร์พร้อมเชื่อมต่อฐานข้อมูล
async function startServer() {
    try {
        console.log(`🚀 Starting ${API_NAME} v${VERSION}...`);
        await connectDatabase();
        const server = app.listen(PORT, () => {
            console.log(`✅ Server running at http://localhost:${PORT}`);
        });
        setupGracefulShutdown(server);
        return server;
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// จัดการปิดเซิร์ฟเวอร์อย่างสุภาพ
function setupGracefulShutdown(server) {
    ['SIGINT', 'SIGTERM'].forEach(signal => {
        process.on(signal, async () => {
            console.log(`\nReceived ${signal}, shutting down...`);
            try {
                server.close(() => console.log('HTTP server closed'));
                await closeDatabase();
                console.log('Database connection closed');
                process.exit(0);
            } catch (err) {
                console.error('Error during shutdown:', err);
                process.exit(1);
            }
        });
    });

    process.on('uncaughtException', err => {
        console.error('Uncaught Exception:', err);
        process.exit(1);
    });

    process.on('unhandledRejection', reason => {
        console.error('Unhandled Rejection:', reason);
        process.exit(1);
    });
}

// ถ้าไฟล์นี้ถูกเรียกโดยตรง ให้เริ่มเซิร์ฟเวอร์
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
