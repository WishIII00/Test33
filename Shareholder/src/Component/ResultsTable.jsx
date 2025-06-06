import React from "react";

const ResultsTable = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div style={{ margin: "20px 0", fontSize: "30px", color: "#333" }}>
        ไม่พบข้อมูล
      </div>
    );
  }

  return (
    <div style={{ margin: "20px 0" }}>
      <table
        style={{
          width: "80%",
          margin: "0 auto",
          borderCollapse: "collapse",
          backgroundColor: "white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          borderRadius: "12px", 
          overflow: "hidden", 
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0" }}>
            <th style={{ padding: "10px", textAlign: "center" }}>รุ่น</th>
            <th style={{ padding: "10px", textAlign: "center" }}>เลขทะเบียน</th>
            <th style={{ padding: "10px", textAlign: "center" }}>
              ชื่อผู้ถือหุ้น
            </th>
            <th style={{ padding: "10px", textAlign: "center" }}>จำนวนหุ้น</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item, index) => (
            <tr key={index}>
              <td style={{ padding: "8px", textAlign: "center" }}>
                {item.series}
              </td>
              <td style={{ padding: "8px", textAlign: "center" }}>
                {item.registrationNumber}
              </td>
              <td style={{ padding: "8px", textAlign: "center" }}>
                {item.holderName}
              </td>
              <td style={{ padding: "8px", textAlign: "center" }}>
                {item.shareAmount?.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;
