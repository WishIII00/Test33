import React, { useState } from 'react';
import './SearchComponent.css';

const SearchComponent = ({ onSearch, loading }) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = () => {
    if (searchValue.trim() && searchValue.length === 13) {
      onSearch(searchValue.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // เฉพาะตัวเลข
    if (value.length <= 13) {
      setSearchValue(value);
    }
  };

  const clearSearch = () => {
    setSearchValue('');
  };

  return (
    <div className="search-section">
      <p className="search-label">ตรวจสอบรุ่นที่ท่านถืออยู่</p>
      
      <div className="search-container">
        <input
          type="text"
          value={searchValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="เลขประจำตัวประชาชน / เลขทะเบียนนิติบุคคล"
          disabled={loading}
          maxLength={13}
          className={`search-input ${searchValue.length === 13 ? 'valid' : ''}`}
        />
        <button 
          onClick={handleSearch}
          disabled={loading || !searchValue || searchValue.length !== 13}
          className="search-button"
        >
          {loading ? 'กำลังค้นหา...' : 'ตรวจสอบ'}
        </button>
        {searchValue && (
          <button 
            onClick={clearSearch}
            className="clear-button"
            title="ล้างข้อมูล"
          >
            ✕
          </button>
        )}
      </div>

      {/* แสดงข้อความช่วยเหลือ */}
      {searchValue.length > 0 && searchValue.length < 13 && (
        <div className="help-message warning">
          **ตรวจ format เลขบัตรประชาชนถ้าเป็น 13 หลัก 
          ถ้า 13 แล้วไม่ถูก format พอกด ตรวจสอบแล้วไม่เจอ popup 
          แย้งเดือน ให้ตรวจสอบเลขบัตร
        </div>
      )}

      {searchValue.length === 13 && !loading && (
        <div className="help-message success">
          ✓ รูปแบบเลขบัตรถูกต้อง กดปุ่ม "ตรวจสอบ" เพื่อค้นหา
        </div>
      )}
    </div>
  );
};

export default SearchComponent;