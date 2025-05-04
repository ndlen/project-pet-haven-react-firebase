import React, { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
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
import Schedule from "./pages/Schedule";
import Employees from "./pages/Employees";
import ErrorPage from "./Error";

const { Content } = Layout;

const App = () => {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log("App.js - User authenticated:", user.email);
        try {
          const adminStatus = await checkAdminAccess();
          console.log("App.js - Is user an admin?", adminStatus);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error("Lỗi kiểm tra quyền admin:", error);
          setIsAdmin(false);
        }
      } else {
        console.log("App.js - No user authenticated.");
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isAdmin === null) {
    return <Spin size="large" style={{ display: "block", margin: "50px auto" }} />;
  }

  console.log("App.js - Rendering with isAdmin:", isAdmin);

  // Define routes using createBrowserRouter
  const router = createBrowserRouter([
    {
      path: "/customer/*",
      element: <CustomerApp />,
    },
    {
      path: "/login",
      element: isAdmin ? <Navigate to="/admin/appointments" /> : <Login setIsAdmin={setIsAdmin} />,
    },
    {
      path: "/admin",
      element: isAdmin ? (
        <Layout>
          <Navbar />
          <Content style={{ padding: "80px 50px" }}>
            <Outlet />
          </Content>
        </Layout>
      ) : (
        <Navigate to="/login" />
      ),
      errorElement: <ErrorPage />, // Handle errors for /admin and its children
      children: [
        { path: "", element: <Navigate to="appointments" /> }, // Redirect /admin to /admin/appointments
        { path: "appointments", element: <Appointments /> },
        { path: "foods", element: <Foods /> },
        { path: "services", element: <Services /> },
        { path: "users", element: <Users /> },
        { path: "schedule", element: <Schedule /> },
        { path: "employees", element: <Employees /> },
        { path: "*", element: <ErrorPage /> }, // Catch unmatched admin routes
      ],
    },
    {
      path: "/",
      element: <Navigate to="/customer" />, // Redirect root to /customer
    },
    {
      path: "*",
      element: <ErrorPage />, // Catch all other unmatched routes
      errorElement: <ErrorPage />,
    },
  ]);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;