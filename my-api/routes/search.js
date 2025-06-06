/**
 * Routes สำหรับการค้นหาข้อมูลผู้ถือหุ้น
 * ไฟล์นี้จัดการ API endpoints ทั้งหมดสำหรับการดึงและค้นหาข้อมูล
 */

const express = require('express');
const { getPool, sql } = require('../config/database.js');

const router = express.Router();

const TABLE_NAME = '[INVCON_DEV23N].[dbo].[ShareholderSummary]';
const MAX_LIMIT = 1000; 
const DEFAULT_LIMIT = 50; 

const sanitizeInput = (input) => {
    if (!input) return '';
    return input
        .replace(/[<>'"]/g, '')
        .replace(/--/g, '')
        .replace(/;/g, '')
        .trim()
        .substring(0, 100);
};

/**
 * GET /api/all - ดึงข้อมูลผู้ถือหุ้นทั้งหมด เรียงตาม _id ASC
 */
router.get('/all', async (req, res) => {
    const startTime = Date.now();

    try {
        const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);

        console.log(`ดึงข้อมูลทั้งหมด - จำนวน: ${limit}, ข้าม: ${offset}, เรียงตาม: _id ASC`);

        const pool = getPool();

        // นับจำนวนข้อมูลทั้งหมดก่อน
        const countQuery = `SELECT COUNT(*) as total FROM ${TABLE_NAME}`;
        const countResult = await pool.request().query(countQuery);
        const totalRecords = countResult.recordset[0].total;

        // ดึงข้อมูลเรียงตาม _id ASC พร้อม pagination
        const dataRequest = pool.request();
        dataRequest.input('limit', sql.Int, limit);
        dataRequest.input('offset', sql.Int, offset);

        const dataQuery = `
            SELECT *
            FROM ${TABLE_NAME}
            ORDER BY _id ASC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const dataResult = await dataRequest.query(dataQuery);
        const executionTime = Date.now() - startTime;

        console.log(`✅ ดึงข้อมูลสำเร็จ ${dataResult.recordset.length} รายการ ใช้เวลา ${executionTime}ms`);

        res.json({
            success: true,
            message: `พบข้อมูลทั้งหมด ${totalRecords} รายการ`,
            data: dataResult.recordset,
            pagination: {
                current_count: dataResult.recordset.length,
                total_records: totalRecords,
                limit: limit,
                offset: offset,
                has_more: (offset + limit) < totalRecords,
                next_offset: (offset + limit) < totalRecords ? offset + limit : null
            },
            meta: {
                execution_time_ms: executionTime,
                sort: { field: '_id', order: 'ASC' },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ ข้อผิดพลาดในการดึงข้อมูล:', error.message);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/search - ค้นหาข้อมูลผู้ถือหุ้น เรียงตาม _id ASC
 */
router.get('/search', async (req, res) => {
    const startTime = Date.now();

    try {
        const searchTerm = sanitizeInput(req.query.q);
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุคำค้นหา (?q=คำค้นหา)',
                example: '/api/search?q=NameDemo'
            });
        }

        const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);

        console.log(`🔍 ค้นหา: "${searchTerm}" - จำนวน: ${limit}, ข้าม: ${offset}`);

        const pool = getPool();

        // นับจำนวนผลการค้นหาทั้งหมด
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM ${TABLE_NAME}
            WHERE [n_first] LIKE @keyword 
               OR [n_last] LIKE @keyword 
               OR [Account_ID] LIKE @keyword
               OR [Phone] LIKE @keyword
               OR [OriginalPhone] LIKE @keyword
               OR [i_ref] LIKE @keyword
        `;

        const countRequest = pool.request();
        countRequest.input('keyword', sql.NVarChar, `%${searchTerm}%`);
        const countResult = await countRequest.query(countQuery);
        const totalMatches = countResult.recordset[0].total;

        // ค้นหาข้อมูลจริง เรียงตาม _id ASC พร้อม pagination
        const searchRequest = pool.request();
        searchRequest.input('keyword', sql.NVarChar, `%${searchTerm}%`);
        searchRequest.input('limit', sql.Int, limit);
        searchRequest.input('offset', sql.Int, offset);

        const searchQuery = `
            SELECT *
            FROM ${TABLE_NAME}
            WHERE [n_first] LIKE @keyword 
               OR [n_last] LIKE @keyword 
               OR [Account_ID] LIKE @keyword
               OR [Phone] LIKE @keyword
               OR [OriginalPhone] LIKE @keyword
               OR [i_ref] LIKE @keyword
            ORDER BY _id ASC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const searchResult = await searchRequest.query(searchQuery);
        const executionTime = Date.now() - startTime;

        console.log(`✅ พบผลการค้นหา ${searchResult.recordset.length}/${totalMatches} รายการ ใช้เวลา ${executionTime}ms`);

        res.json({
            success: true,
            message: `พบผลการค้นหา "${searchTerm}" จำนวน ${totalMatches} รายการ`,
            search_term: searchTerm,
            data: searchResult.recordset,
            pagination: {
                current_count: searchResult.recordset.length,
                total_matches: totalMatches,
                limit: limit,
                offset: offset,
                has_more: (offset + limit) < totalMatches,
                next_offset: (offset + limit) < totalMatches ? offset + limit : null
            },
            meta: {
                execution_time_ms: executionTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ ข้อผิดพลาดในการค้นหา:', error.message);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการค้นหา',
            search_term: req.query.q,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ส่วนอื่นๆ ของไฟล์นี้ ให้เหมือนเดิม (เช่น /by-account, /top-holders, /count)

module.exports = router;
