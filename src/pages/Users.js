import React, { useState, useEffect, useContext } from "react";
import { Button, Typography, message } from "antd";
import CrudTable from "../components/CrudTable";
import { db } from "../firebase/firebaseConfig";
import { checkAdminAccess } from "../firebase/authUtils";
import { ThemeContext } from "../context/ThemeContext";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

const Users = () => {
    const { theme } = useContext(ThemeContext);
    const [data, setData] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Kiểm tra quyền admin
        const verifyAdmin = async () => {
            const isAdmin = await checkAdminAccess();
            if (!isAdmin) {
                message.error("Bạn không có quyền truy cập trang này!");
                navigate("/login");
                return;
            }

            NProgress.start();
            const unsubscribe = db.collection("users").onSnapshot(
                (snapshot) => {
                    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    setData(users);
                    NProgress.done();
                },
                (error) => {
                    message.error("Lỗi tải dữ liệu: " + error.message);
                    NProgress.done();
                }
            );
            return () => {
                unsubscribe();
                NProgress.done();
            };
        };

        verifyAdmin();
    }, [navigate]);

    const columns = [
        { title: "Email", dataIndex: "email", key: "email" },
        { title: "Số điện thoại", dataIndex: "phone", key: "phone" },
        { title: "Vai trò", dataIndex: "role", key: "role" },
    ];

    const handleEdit = async (record) => {
        const newRole = prompt("Nhập vai trò mới (user/admin):", record.role);
        if (newRole && ["user", "admin"].includes(newRole)) {
            await db.collection("users").doc(record.id).update({ role: newRole });
        }
    };

    const handleDelete = async (id) => {
        await db.collection("users").doc(id).delete();
    };

    return (
        <div>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Quản lý Người Dùng
            </Title>
            <CrudTable data={data} columns={columns} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
    );
};

export default Users;