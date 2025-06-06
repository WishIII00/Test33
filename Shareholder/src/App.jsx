import React, { useState, useEffect } from "react";
import "./App.css";
import ApiService from "./Component/api/apiService";
import SearchComponent from "./Component/SearchComponent";
import ResultsTable from "./Component/ResultsTable";

const App = () => {
  // ===== State Management =====
  const [meetingInfo, setMeetingInfo] = useState({
    logoUrl: "",
    remarkTH: "",
    remarkEN: "",
  });

  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState({
    online: false,
    message: "ตรวจสอบ...",
  });

  // ===== Effects =====
  useEffect(() => {
    loadInitialData();
    checkApiConnection();

    // ตรวจสอบสถานะ API ทุก 30 วินาที
    const interval = setInterval(checkApiConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // ===== Functions =====
  const loadInitialData = async () => {
    setInitialLoading(true);

    try {
      const result = await ApiService.fetchMeetingInfo();

      if (result.success) {
        setMeetingInfo(result.data);
      }
    } catch (error) {
      console.warn("โหลดข้อมูลล้มเหลว:", error.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const checkApiConnection = async () => {
    const status = await ApiService.checkApiStatus();
    setApiStatus(status);
  };

  const handleSearch = async (citizenId) => {
    setLoading(true);
    setSearchResults(null);
    setError("");

    try {
      // บันทึกการใช้งาน
      await ApiService.logActivity("search_debenture", { citizenId });

      const result = await ApiService.searchDebenture(citizenId);

      if (result.success) {
        if (result.data && result.data.length > 0) {
          setSearchResults(result.data);
        } else {
          setSearchResults([]);
          setError(
            result.message || ""
          );
        }
      } else {
        // แสดง error message
        setError(result.error || "เกิดข้อผิดพลาดในการค้นหา");
        setSearchResults([]);
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการค้นหา:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDebentureClick = async (debentureCode) => {
    try {
      // บันทึกการใช้งาน
      await ApiService.logActivity("select_debenture", {
        debenture: debentureCode,
      });

      const url = ApiService.getDebentureUrl(debentureCode);
      window.open(url, "_blank");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการเปิดลิงก์:", error);
    }
  };

  // ===== Render =====
  if (initialLoading) {
    return (
      <div className="container">
        <div className="loading-initial">
          <div className="loading-spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* API Status Indicator */}
      <div className={`api-status ${apiStatus.online ? "online" : "offline"}`}>
        {apiStatus.message}
      </div>

      {/* Logo */}
      <div className="logo" style={{ textAlign: "center" }}>
        <img
          id="logoImage"
          src={
            meetingInfo.logoUrl ||
            "https://www.inventech.co.th/wp-content/uploads/2022/11/invlogo_bb.png"
          }
          alt="Logo"
        />
      </div>

      {/* Content */}
      <div className="content-wrapper">
        <div className="content">
          <h2 id="type">ยื่นแบบคำร้องเข้าร่วมประชุม</h2>
          <h3 id="titleNameTH">การประชุมผู้ถือหุ้นกู้ ของบริษัท XXXX</h3>
          <h3 id="titleNameEN">Debentureholders Meeting of XXXX</h3>

          {/* Search Section */}
          <SearchComponent onSearch={handleSearch} loading={loading} />

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>กำลังค้นหาข้อมูลในระบบ...</p>
            </div>
          )}

          {/* Results Table */}
          {searchResults && !loading && (
            <ResultsTable results={searchResults} />
          )}

          <div className="instructions">
            <p>
              กรุณาเลือกหุ้นกู้รุ่นที่ท่านถืออยู่
              เพื่อยื่นแบบคำร้องขอรับชื่อผู้ใช้งาน และรหัสผ่าน
            </p>
            <p>
              Please select the series of debenture your currently hold. Request
              form to receive a username and password.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="buttons">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <a
              key={num}
              onClick={() => handleDebentureClick(`rq${num}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="debenture-link"
            >
              หุ้นกู้ / Debenture (XXXX)
            </a>
          ))}
        </div>
      </div>

      {/* Remark */}
      <div className="remark">
        <p id="thRemark">
          {meetingInfo.remarkTH && `หมายเหตุ: ${meetingInfo.remarkTH}`}
        </p>
        <p id="enRemark">
          {meetingInfo.remarkEN && `Remark: ${meetingInfo.remarkEN}`}
        </p>
      </div>
    </div>
  );
};

export default App;
