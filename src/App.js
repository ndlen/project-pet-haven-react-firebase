import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout, Spin } from "antd";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Appointments from "./pages/Appointments";
import Foods from "./pages/Foods";
import Services from "./pages/Services";
import Users from "./pages/Users";
import Login from "./pages/Login";
import CustomerApp from "./customer/CustomerApp";
import { checkAdminAccess } from "./firebase/authUtils";
import { auth } from "./firebase/firebaseConfig";
import "./styles.css";

const { Content } = Layout;

const App = () => {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Người dùng đã đăng nhập, kiểm tra quyền admin
        checkAdminAccess()
          .then((result) => {
            setIsAdmin(result);
          })
          .catch((error) => {
            console.error("Lỗi kiểm tra quyền admin:", error);
            setIsAdmin(false);
          });
      } else {
        // Người dùng chưa đăng nhập hoặc vừa đăng xuất
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isAdmin === null) return <Spin size="large" style={{ display: "block", margin: "50px auto" }} />;

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Luồng khách hàng - không cần admin */}
          <Route path="/customer/*" element={<CustomerApp />} />

          {/* Luồng admin - cần xác minh admin */}
          <Route
            path="/login"
            element={isAdmin ? <Navigate to="/appointments" /> : <Login setIsAdmin={setIsAdmin} />}
          />
          <Route
            path="/*"
            element={
              isAdmin ? (
                <Layout>
                  <Navbar />
                  <Content style={{ padding: "80px 50px" }}>
                    <Routes>
                      <Route path="/appointments" element={<Appointments />} />
                      <Route path="/foods" element={<Foods />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="*" element={<Navigate to="/appointments" />} />
                    </Routes>
                  </Content>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>

  );
};

export default App;