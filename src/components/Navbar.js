import React, { useContext } from "react";
import { Menu, Switch } from "antd";
import { HomeOutlined, UserOutlined, ShoppingCartOutlined, MedicineBoxOutlined, ScheduleOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { logout } from "../firebase/authUtils";

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useContext(ThemeContext);

    const menuItems = [
        { key: "/admin/appointments", icon: <ScheduleOutlined />, label: "Lịch Hẹn" },
        { key: "/admin/foods", icon: <ShoppingCartOutlined />, label: "Thức Ăn" },
        { key: "/admin/services", icon: <HomeOutlined />, label: "Dịch Vụ" },
        { key: "/admin/users", icon: <UserOutlined />, label: "Người Dùng" },
        { key: "/admin/employees", icon: <UserOutlined />, label: "Nhân Viên" },
        { key: "/admin/schedule", icon: <UserOutlined />, label: "Phân Công Và Thông Báo" },

    ];

    return (
        <Menu
            theme={theme}
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={[
                ...menuItems.map((item) => ({
                    key: item.key,
                    icon: item.icon,
                    label: item.label,
                    onClick: () => navigate(item.key),
                })),
                {
                    key: "theme",
                    label: (
                        <Switch
                            checked={theme === "light"}
                            onChange={toggleTheme}
                            checkedChildren="Sáng"
                            unCheckedChildren="Tối"
                        />
                    ),
                    style: { marginLeft: "auto" },
                },
                {
                    key: "logout",
                    label: "Đăng Xuất",
                    onClick: () => {
                        logout();
                        navigate("/login");
                    },
                },
            ]}
            style={{ position: "fixed", top: 0, width: "100%", zIndex: 1000 }}
        />
    );
};

export default Navbar;