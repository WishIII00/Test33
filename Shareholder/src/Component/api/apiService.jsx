/**
 * ไฟล์บริการ API สำหรับจัดการการเรียกใช้ API ทั้งหมด
 * เชื่อมต่อกับ backend ที่ localhost:3000
 */

// ===== การกำหนดค่าคงที่ =====
const API_CONFIG = {
  // URL ฐานของ API - เชื่อมต่อกับ backend ที่ port 3000
  BASE_URL: 'http://localhost:3000',
  
  // URL สำหรับหุ้นกู้แต่ละรุ่น - อิงจาก API ที่มีอยู่
  REQUEST_URLS: {
    rq1: 'http://localhost:3000/api/request/1',
    rq2: 'http://localhost:3000/api/request/2',
    rq3: 'http://localhost:3000/api/request/3',
    rq4: 'http://localhost:3000/api/request/4',
    rq5: 'http://localhost:3000/api/request/5',
    rq6: 'http://localhost:3000/api/request/6',
    rq7: 'http://localhost:3000/api/request/7',
    rq8: 'http://localhost:3000/api/request/8',
    rq9: 'http://localhost:3000/api/request/9',
    rq10: 'http://localhost:3000/api/request/10'
  },
  
  // การตั้งค่า Request
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// ===== ฟังก์ชันช่วย =====
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===== คลาส API Service =====
class ApiService {
  
  /**
   * ทำ HTTP Request ทั่วไป
   */
  static async makeRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่');
      }
      
      console.warn('API Error:', error.message);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลทั้งหมด - ใช้ endpoint ที่มีอยู่
   */
  static async fetchAllData(limit = 100) {
    try {
      console.log('🔄 กำลังดึงข้อมูลทั้งหมด...');
      
      const data = await this.makeRequest(`/api/all?limit=${limit}`, {
        method: 'GET'
      });

      console.log('✅ ดึงข้อมูลสำเร็จ:', data);

      return {
        success: true,
        data: data
      };
      
    } catch (error) {
      console.warn('⚠️ ไม่สามารถดึงข้อมูลได้:', error.message);
      
      return {
        success: false,
        error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        details: error.message
      };
    }
  }

  /**
   * ดึงข้อมูลการประชุม
   */
  static async fetchMeetingInfo() {
    try {
      console.log('🔄 กำลังดึงข้อมูลการประชุม...');
      
      // ลองใช้ endpoint ที่มีอยู่ก่อน
      const data = await this.fetchAllData(10);
      
      if (data.success) {
        // แปลงข้อมูลให้เข้ากับรูปแบบที่ต้องการ
        return {
          success: true,
          data: {
            logoUrl: '',
            remarkTH: 'ข้อมูลจาก API ที่ localhost:3000',
            remarkEN: 'Data from API at localhost:3000'
          }
        };
      } else {
        throw new Error('ไม่สามารถดึงข้อมูลได้');
      }
      
    } catch (error) {
      console.warn('⚠️ API ยังไม่พร้อม - ใช้ข้อมูล fallback');
      
      // ส่งข้อมูล fallback เมื่อ API ยังไม่พร้อม
      return {
        success: true,
        data: {
          logoUrl: '',
          remarkTH: 'API ยังไม่พร้อม - รอการเชื่อมต่อ',
          remarkEN: 'API not ready - waiting for connection'
        },
        isOffline: true
      };
    }
  }

  /**
   * ค้นหาข้อมูลผู้ถือหุ้นกู้ - เชื่อมต่อ API จริง
   */
  static async searchDebenture(citizenId, meetingId = 'XXXX') {
    try {
      console.log('🔍 กำลังค้นหาข้อมูล...', citizenId);
      
      // ตรวจสอบรูปแบบเลขบัตรประชาชน
      if (!citizenId || citizenId.length !== 13) {
        throw new Error('กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก');
      }

      // ค้นหาจาก API search endpoint โดยตรง
      const response = await this.makeRequest(`/api/search?q=${encodeURIComponent(citizenId)}`, {
        method: 'GET'
      });

      console.log('API Response:', response);

      if (response.success && response.data && response.data.length > 0) {
        // แปลงข้อมูลจาก SQL Server ให้เข้ากับรูปแบบที่ต้องการ
        const results = response.data.map((item, index) => ({
          series: this.extractSeries(item) || `240${String.fromCharCode(65 + index)}`,
          registrationNumber: item.Account_ID || item.registrationNumber || item.id || `${9000000000 + index}`,
          holderName: this.extractHolderName(item) || 'ผู้ถือหุ้นกู้',
          shareAmount: this.extractShareAmount(item), // ใช้ฟังก์ชันใหม่
          // ข้อมูลเพิ่มเติม
          citizenId: item.i_ref, // เลขบัตรประชาชนจาก i_ref
          phone: item.Phone || item.OriginalPhone,
          rawData: item // เก็บข้อมูลดิบไว้ debug
        }));

        return {
          success: true,
          data: results,
          totalFound: response.pagination?.total_matches || results.length,
          searchTerm: citizenId
        };
      } else {
        // ไม่พบข้อมูล
        return {
          success: true,
          data: [],
          message: ''
        };
      }
      
    } catch (error) {
      console.warn('⚠️ การค้นหาล้มเหลว:', error.message);
      
      // ถ้าเป็น validation error ให้แสดงตรงๆ
      if (error.message.includes('13 หลัก')) {
        return {
          success: false,
          error: error.message
        };
      }
      
      // ถ้าเป็น API ไม่พร้อม
      return {
        success: false,
        error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่ภายหลัง',
        isOffline: true
      };
    }
  }

  /**
   * ฟังก์ชันช่วยแยก series จากข้อมูล
   */
  static extractSeries(item) {
    // ลองหา series จากหลายๆ field
    return item.series || 
           item.debenture_series || 
           item.bond_series ||
           item.Series ||
           null;
  }

  /**
   * ฟังก์ชันช่วยแยกชื่อผู้ถือหุ้น
   */
  static extractHolderName(item) {
    if (item.holderName) return item.holderName;
    if (item.name) return item.name;
    if (item.n_first && item.n_last) {
      return `${item.n_first} ${item.n_last}`.trim();
    }
    if (item.first_name && item.last_name) {
      return `${item.first_name} ${item.last_name}`.trim();
    }
    if (item.FullName) return item.FullName;
    return null;
  }

  /**
   * ฟังก์ชันช่วยแยกจำนวนหุ้น
   */
  static extractShareAmount(item) {
    // ลองหาจำนวนหุ้นจากหลายๆ field ที่เป็นไปได้
    return item.q_share ||             // q_share (ฟิลด์หลัก)
           item.share_amount ||        // share_amount
           item.shareAmount ||         // shareAmount
           item.amount ||              // amount
           item.shares ||              // shares
           item.quantity ||            // quantity
           0;                          // fallback
  }

  /**
   * สร้าง URL สำหรับหุ้นกู้
   */
  static getDebentureUrl(debentureCode) {
    try {
      let requestKey = debentureCode;
      
      // แปลงให้เป็นรูปแบบ rq1, rq2, ...
      if (/^\d+$/.test(debentureCode)) {
        requestKey = `rq${debentureCode}`;
      }
      
      if (!requestKey.startsWith('rq')) {
        requestKey = `rq${requestKey}`;
      }
      
      const url = API_CONFIG.REQUEST_URLS[requestKey];
      
      if (!url) {
        console.warn(`ไม่พบ URL สำหรับ ${requestKey}`);
        return API_CONFIG.REQUEST_URLS.rq1; // fallback
      }
      
      return url;
      
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสร้าง URL:', error);
      return API_CONFIG.REQUEST_URLS.rq1;
    }
  }

  /**
   * ตรวจสอบสถานะ API - อัพเดทใหม่ใช้ /health endpoint
   */
  static async checkApiStatus() {
    try {
      const result = await this.makeRequest('/health');
      if (result) {
        return { 
          online: true, 
          message: '',
          details: result
        };
      } else {
        return { online: false, message: 'API ยังไม่พร้อม' };
      }
    } catch (error) {
      return { 
        online: false, 
        message: 'API ยังไม่พร้อม',
        error: error.message
      };
    }
  }

  /**
   * บันทึกการใช้งาน (สำหรับ Analytics)
   */
  static async logActivity(action, data = {}) {
    try {
      // ลองส่งไปยัง analytics endpoint (ถ้ามี)
      await this.makeRequest('/api/analytics/log', {
        method: 'POST',
        body: JSON.stringify({
          action: action,
          data: data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      });
      
      console.log('📊 บันทึกการใช้งาน:', action);
      
    } catch (error) {
      // ไม่แสดงข้อผิดพลาดให้ผู้ใช้เห็น - เป็น optional feature
      console.debug('การบันทึกข้อมูลการใช้งานล้มเหลว:', error);
    }
  }

  /**
   * ทดสอบการเชื่อมต่อ API
   */
  static async testConnection() {
    try {
      console.log('🔧 ทดสอบการเชื่อมต่อ API...');
      
      const result = await this.fetchAllData(5);
      
      if (result.success) {
        console.log('✅ การเชื่อมต่อ API สำเร็จ');
        console.log('📊 ข้อมูลตัวอย่าง:', result.data);
        return true;
      } else {
        console.log('❌ การเชื่อมต่อ API ล้มเหลว:', result.error);
        return false;
      }
      
    } catch (error) {
      console.error('🔥 ข้อผิดพลาดในการทดสอบ:', error.message);
      return false;
    }
  }
}

// ===== Export =====
export default ApiService;
export { API_CONFIG };

// ===== Auto Test Connection (Development) =====
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // ทดสอบการเชื่อมต่อเมื่อโหลดไฟล์ (เฉพาะ dev mode)
  setTimeout(() => {
    ApiService.testConnection();
  }, 1000);
}