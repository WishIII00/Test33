/**
 * API Service สำหรับดึงข้อมูลและค้นหาด้วยเลขบัตรประชาชน
 * เชื่อมต่อกับ backend ที่ localhost:3000
 */

// ===== การกำหนดค่าคงที่ =====
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  TIMEOUT: 30000,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

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
   * ดึงข้อมูลทั้งหมดจากฐานข้อมูล
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
   * ค้นหาข้อมูลด้วยเลขบัตรประชาชน (ไม่จำเป็นต้องครบ 13 หลัก)
   */
  static async searchDebenture(citizenId) {
    try {
      console.log('🔍 กำลังค้นหาข้อมูล...', citizenId);
      
      // ตรวจสอบข้อมูลพื้นฐาน
      if (!citizenId || citizenId.trim() === '') {
        throw new Error('กรุณากรอกเลขประจำตัวประชาชน');
      }

      // ลบช่องว่างและเก็บเฉพาะตัวเลข
      const cleanId = citizenId.replace(/\s/g, '').replace(/[^0-9]/g, '');
      
      if (cleanId.length === 0) {
        throw new Error('กรุณากรอกเลขประจำตัวประชาชนให้ถูกต้อง');
      }

      // ค้นหาจาก API search endpoint
      const response = await this.makeRequest(`/api/search?q=${encodeURIComponent(cleanId)}`, {
        method: 'GET'
      });

      console.log('API Response:', response);

      if (response.success && response.data && response.data.length > 0) {
        // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการ
        const results = response.data.map((item, index) => ({
          series: this.extractSeries(item) || `240${String.fromCharCode(65 + index)}`,
          registrationNumber: item.Account_ID || item.registrationNumber || item.id || `${9000000000 + index}`,
          holderName: this.extractHolderName(item) || 'ผู้ถือหุ้นกู้',
          shareAmount: this.extractShareAmount(item),
          citizenId: item.i_ref || cleanId,
          phone: item.Phone || item.OriginalPhone || '',
          rawData: item
        }));

        return {
          success: true,
          data: results,
          totalFound: response.pagination?.total_matches || results.length,
          searchTerm: cleanId
        };
      } else {
        // ไม่พบข้อมูล
        return {
          success: true,
          data: [],
          message: 'ไม่พบข้อมูลที่ตรงกับเลขประจำตัวประชาชนที่ระบุ'
        };
      }
      
    } catch (error) {
      console.warn('⚠️ การค้นหาล้มเหลว:', error.message);
      
      return {
        success: false,
        error: error.message.includes('กรุณา') ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่ภายหลัง'
      };
    }
  }

  /**
   * ฟังก์ชันช่วยแยก series จากข้อมูล
   */
  static extractSeries(item) {
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
    return item.q_share ||
           item.share_amount ||
           item.shareAmount ||
           item.amount ||
           item.shares ||
           item.quantity ||
           0;
  }
}

// ===== Export =====
export default ApiService;