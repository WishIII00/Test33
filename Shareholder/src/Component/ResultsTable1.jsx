import React from 'react';
import './ResultsTable.css';

const ResultsTable = ({ results }) => {
  const formatNumber = (num) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  // ถ้าไม่มีข้อมูล
  if (!results) {
    return null;
  }

  // ถ้าเป็น array ว่าง
  if (Array.isArray(results) && results.length === 0) {
    return (
      <div className="empty-results">
        <div className="empty-icon">🔍</div>
        <div className="empty-text">ไม่พบข้อมูลผู้ถือหุ้นกู้สำหรับเลขประจำตัวนี้</div>
      </div>
    );
  }

  // ถ้าไม่ใช่ array หรือมีข้อมูล
  if (!Array.isArray(results) || results.length === 0) {
    return (
      <div className="empty-results">
        <div className="empty-icon">📋</div>
        <div className="empty-text">ไม่มีข้อมูลให้แสดง</div>
      </div>
    );
  }

  const totalAmount = results.reduce((total, result) => total + (result.shareAmount || 0), 0);

  return (
    <div className="results-container">
      {/* Info Message */}
      <div className="results-info">
        **ถ้า 1 รุ่นมีมากกว่า 1 Record แสดงแยกตามจำนวน record
      </div>
      
      {/* Results Count */}
      <div className="results-count">
        พบข้อมูลทั้งหมด <span className="count-number">{results.length}</span> รายการ
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th>รุ่น</th>
              <th>เลขทะเบียน</th>
              <th>ชื่อผู้ถือหุ้น</th>
              <th>จำนวนหุ้น</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={`${result.registrationNumber}-${index}`}>
                <td className="series-cell">
                  {result.series}
                </td>
                <td className="registration-cell">
                  {result.registrationNumber}
                </td>
                <td className="holder-name-cell">
                  {result.holderName}
                </td>
                <td className="share-amount-cell">
                  {formatNumber(result.shareAmount)}
                </td>
              </tr>
            ))}
          </tbody>
          
          {/* Table Footer with Summary */}
          {results.length > 1 && (
            <tfoot>
              <tr>
                <td colSpan="3" className="total-label">
                  รวมทั้งหมด
                </td>
                <td className="total-amount">
                  {formatNumber(totalAmount)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Additional Info */}
      <div className="table-footer-info">
        <span className="info-icon">💡</span>
        ข้อมูลแสดงทั้งหมด {results.length} รายการ 
        {results.length > 1 && ' (แยกตามรุ่นหุ้นกู้ที่ถือ)'}
      </div>
    </div>
  );
};

export default ResultsTable;