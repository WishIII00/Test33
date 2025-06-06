import React, { useState } from 'react';

const SearchComponent = ({ onSearch, loading }) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = () => {
    if (searchValue.trim()) {
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

  return (
    <div style={{ margin: '20px 0' }}>
      <p style={{ textDecoration: 'underline', fontWeight: 'bold', color: 'black', fontSize: '20px', }}>ตรวจสอบรุ่นที่ท่านถืออยู่</p>
      
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        justifyContent: 'center', 
        alignItems: 'center',
        margin: '25px'
      }}>
        <input
          type="text"
          value={searchValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="เลขประจำตัวประชาชน / เลขทะเบียนนิติบุคคล"
          disabled={loading}
          maxLength={13}
          style={{
            padding: '12px 15px',
            border: '2px solid #ddd',
            borderRadius: '10px',
            fontSize: '14px',
            width: '400px',
            outline: 'none'
          }}
        />
        <button 
          onClick={handleSearch}
          disabled={loading || !searchValue }
          style={{
            backgroundColor: '#D3D3D3',
            color: 'black',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '25px',
            fontSize: '16px',
            fontweight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'กำลังค้นหา...' : 'ตรวจสอบ'}
        </button>
      </div>
    </div>
  );
};

export default SearchComponent;