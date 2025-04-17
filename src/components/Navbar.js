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
        { key: "/appointments", icon: <ScheduleOutlined />, label: "Lịch Hẹn" },
        { key: "/foods", icon: <ShoppingCartOutlined />, label: "Thức Ăn" },
        { key: "/services", icon: <HomeOutlined />, label: "Dịch Vụ" },
        { key: "/users", icon: <UserOutlined />, label: "Người Dùng" },
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