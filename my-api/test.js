require('dotenv').config();
const http = require('http');
const url = require('url');
const sql = require('mssql');

const port = 3000;

const dbConfig = {
    user: 'invconnect',
    password: '@inv2021!',
    server: 'pro.inventech.co.th',
    database: 'INVCON_DEV23N',
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

let pool;

async function connectDB() {
    try {
        pool = await sql.connect(dbConfig);
        console.log('✅ Database เชื่อมต่อแล้ว');
    } catch (err) {
        console.error('❌ Database Error:', err.message);
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });

    try {
        if (parsedUrl.pathname === '/health') {
            res.end(JSON.stringify({ 
                status: 'OK', 
                time: new Date(),
                database: pool ? 'Connected' : 'Disconnected'
            }, null, 2));
            
        } else if (parsedUrl.pathname === '/api/all') {
            const limit = parseInt(parsedUrl.query.limit) || 100;
            const offset = parseInt(parsedUrl.query.offset) || 0;
            
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .input('offset', sql.Int, offset)
                .query(`
                    SELECT *
                    FROM [INVCON_DEV23N].[dbo].[ShareholderSummary]
                    ORDER BY [Account_ID]
                    OFFSET @offset ROWS
                    FETCH NEXT @limit ROWS ONLY
                `);
            
            // นับจำนวนทั้งหมด
            const countResult = await pool.request().query(`
                SELECT COUNT(*) as total FROM [INVCON_DEV23N].[dbo].[ShareholderSummary]
            `);
            
            res.end(JSON.stringify({
                success: true,
                data: result.recordset,
                count: result.recordset.length,
                total_records: countResult.recordset[0].total,
                pagination: {
                    limit: limit,
                    offset: offset,
                    has_more: (offset + limit) < countResult.recordset[0].total
                }
            }, null, 2));
            
        } else if (parsedUrl.pathname === '/api/search') {
            const q = parsedUrl.query.q || '';
            const limit = parseInt(parsedUrl.query.limit) || 50;
            
            if (!q) {
                res.end(JSON.stringify({
                    success: false,
                    message: 'กรุณาระบุคำค้นหา ?q=keyword'
                }, null, 2));
                return;
            }
            
            const result = await pool.request()
                .input('keyword', sql.NVarChar, `%${q}%`)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) *
                    FROM [INVCON_DEV23N].[dbo].[ShareholderSummary] 
                    WHERE [n_first] LIKE @keyword 
                       OR [n_last] LIKE @keyword 
                       OR [Account_ID] LIKE @keyword
                       OR [i_ref] LIKE @keyword
                       OR [Phone] LIKE @keyword
                    ORDER BY [q_share] DESC
                `);
            
            res.end(JSON.stringify({
                success: true,
                data: result.recordset,
                count: result.recordset.length,
                search_term: q
            }, null, 2));
            
        } else if (parsedUrl.pathname === '/api/top-holders') {
            const limit = parseInt(parsedUrl.query.limit) || 20;
            
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) *
                    FROM [INVCON_DEV23N].[dbo].[ShareholderSummary]
                    WHERE [q_share] > 0
                    ORDER BY [q_share] DESC
                `);
            
            res.end(JSON.stringify({
                success: true,
                data: result.recordset,
                count: result.recordset.length,
                total_shares: result.recordset.reduce((sum, row) => sum + parseFloat(row.q_share), 0)
            }, null, 2));
            
        } else if (parsedUrl.pathname === '/api/by-account') {
            const account_id = parsedUrl.query.account_id || '';
            
            if (!account_id) {
                res.end(JSON.stringify({
                    success: false,
                    message: 'กรุณาระบุ account_id'
                }, null, 2));
                return;
            }
            
            const result = await pool.request()
                .input('account_id', sql.NVarChar, account_id)
                .query(`
                    SELECT *
                    FROM [INVCON_DEV23N].[dbo].[ShareholderSummary]
                    WHERE [Account_ID] = @account_id
                `);
            
            res.end(JSON.stringify({
                success: true,
                data: result.recordset[0] || null,
                found: result.recordset.length > 0
            }, null, 2));
            
        } else if (parsedUrl.pathname === '/api/by-shares') {
            const min_shares = parseFloat(parsedUrl.query.min_shares) || 0;
            const max_shares = parseFloat(parsedUrl.query.max_shares) || 999999999;
            const limit = parseInt(parsedUrl.query.limit) || 100;
            
            const result = await pool.request()
                .input('min_shares', sql.Float, min_shares)
                .input('max_shares', sql.Float, max_shares)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) *
                    FROM [INVCON_DEV23N].[dbo].[ShareholderSummary]
                    WHERE [q_share] >= @min_shares AND [q_share] <= @max_shares
                    ORDER BY [q_share] DESC
                `);
            
            res.end(JSON.stringify({
                success: true,
                data: result.recordset,
                count: result.recordset.length,
                criteria: {
                    min_shares: min_shares,
                    max_shares: max_shares
                }
            }, null, 2));
            
        } else if (parsedUrl.pathname === '/api/stats') {
            const result = await pool.request().query(`
                SELECT 
                    COUNT(*) as total_holders,
                    COUNT(DISTINCT [SecuritySymbol]) as total_securities,
                    SUM(CAST([q_share] as BIGINT)) as total_shares,
                    AVG(CAST([q_share] as FLOAT)) as avg_shares,
                    MAX([q_share]) as max_shares,
                    MIN([q_share]) as min_shares,
                    COUNT(CASE WHEN [holder_type] = 1 THEN 1 END) as type_1_count,
                    COUNT(CASE WHEN [holder_type] = 0 THEN 1 END) as type_0_count
                FROM [INVCON_DEV23N].[dbo].[ShareholderSummary]
            `);
            
            res.end(JSON.stringify({
                success: true,
                statistics: result.recordset[0]
            }, null, 2));
            
        } else if (parsedUrl.pathname === '/api/count') {
            const result = await pool.request().query(`
                SELECT COUNT(*) as total_records 
                FROM [INVCON_DEV23N].[dbo].[ShareholderSummary]
            `);
            
            res.end(JSON.stringify({
                success: true,
                total_records: result.recordset[0].total_records,
                message: `มีข้อมูลทั้งหมด ${result.recordset[0].total_records} รายการ`
            }, null, 2));
            
        } else {
            res.end(JSON.stringify({ 
                message: '🚀 ShareholderSummary Production API - ข้อมูลจริงจาก Database',
                server_time: new Date().toISOString(),
                endpoints: {
                    'ดูข้อมูลทั้งหมด': '/api/all?limit=100&offset=0',
                    'นับจำนวนรายการ': '/api/count',
                    'ค้นหาข้อมูล': '/api/search?q=NameDemo_01&limit=10',
                    'ผู้ถือหุ้นรายใหญ่': '/api/top-holders?limit=20',
                    'ค้นหาตาม Account': '/api/by-account?account_id=000000001',
                    'ค้นหาตามยอดหุ้น': '/api/by-shares?min_shares=10000&max_shares=50000&limit=10',
                    'สถิติรวม': '/api/stats',
                    'ตรวจสอบสถานะ': '/health'
                },
                examples: {
                    'ดูข้อมูล 50 รายการแรก': `http://localhost:${port}/api/all?limit=50`,
                    'ดูข้อมูลรายการที่ 51-100': `http://localhost:${port}/api/all?limit=50&offset=50`,
                    'ค้นหาชื่อ NameDemo': `http://localhost:${port}/api/search?q=NameDemo`,
                    'ดูผู้ถือหุ้น 10 อันดับแรก': `http://localhost:${port}/api/top-holders?limit=10`,
                    'ค้นหา Account ID': `http://localhost:${port}/api/by-account?account_id=000000001`,
                    'หุ้นมากกว่า 10000': `http://localhost:${port}/api/by-shares?min_shares=10000`,
                    'สถิติรวมทั้งหมด': `http://localhost:${port}/api/stats`,
                    'นับจำนวนรายการ': `http://localhost:${port}/api/count`
                },
                database: 'INVCON_DEV23N.dbo.ShareholderSummary',
                note: '⚡ Production API พร้อมใช้งาน - ข้อมูลจริง 100%'
            }, null, 2));
        }
    } catch (err) {
        res.end(JSON.stringify({ 
            success: false,
            error: err.message,
            timestamp: new Date().toISOString()
        }, null, 2));
    }
});

async function start() {
    await connectDB();
    server.listen(port, () => {
        console.log(`\n🚀 Production API Server: http://localhost:${port}`);
        console.log(`📊 ดูข้อมูลทั้งหมด: http://localhost:${port}/api/all?limit=100`);
        console.log(`🔢 นับจำนวนรายการ: http://localhost:${port}/api/count`);
        console.log(`🔍 ค้นหาข้อมูล: http://localhost:${port}/api/search?q=NameDemo_01`);
        console.log(`👑 ผู้ถือหุ้นรายใหญ่: http://localhost:${port}/api/top-holders?limit=10`);
        console.log(`🎯 ตาม Account ID: http://localhost:${port}/api/by-account?account_id=000000001`);
        console.log(`📈 ตามยอดหุ้น: http://localhost:${port}/api/by-shares?min_shares=10000&max_shares=50000`);
        console.log(`📊 สถิติรวม: http://localhost:${port}/api/stats`);
        console.log(`💚 Health Check: http://localhost:${port}/health`);
        console.log(`📚 API Docs: http://localhost:${port}/\n`);
    });
}

start();