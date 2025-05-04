import React, { useState, useEffect, useContext } from "react";
import { Button, Typography, message } from "antd";
import CrudTable from "../components/CrudTable";
import CrudForm from "../components/CrudForm";
import { db } from "../firebase/firebaseConfig";
import { checkAdminAccess } from "../firebase/authUtils";
import { ThemeContext } from "../context/ThemeContext";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

const Employees = () => {
    const { theme } = useContext(ThemeContext);
    const [data, setData] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyAdmin = async () => {
            const isAdmin = await checkAdminAccess();
            if (!isAdmin) {
                message.error("Bạn không có quyền truy cập trang này!");
                navigate("/login");
                return;
            }

            NProgress.start();
            const unsubscribe = db.collection("employees").onSnapshot(
                (snapshot) => {
                    const employees = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setData(employees);
                    NProgress.done();
                },
                (error) => {
                    console.error("Lỗi tải dữ liệu nhân viên:", error);
                    message.error("Không thể tải dữ liệu nhân viên. Vui lòng thử lại sau!");
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
        { title: "Tên nhân viên", dataIndex: "name", key: "name" },
        { title: "Số điện thoại", dataIndex: "phone", key: "phone" },
        { title: "Email", dataIndex: "email", key: "email" },
    ];

    const fields = [
        {
            name: "name",
            label: "Tên nhân viên",
            rules: [{ required: true, message: "Vui lòng nhập tên nhân viên!" }],
        },
        {
            name: "phone",
            label: "Số điện thoại",
            rules: [
                { required: true, message: "Vui lòng nhập số điện thoại!" },
                {
                    pattern: /^[0-9]{10,11}$/,
                    message: "Số điện thoại phải có 10-11 chữ số!",
                },
            ],
        },
        {
            name: "email",
            label: "Email",
            rules: [
                { required: true, message: "Vui lòng nhập email!" },
                { type: "email", message: "Email không hợp lệ!" },
            ],
        },
    ];

    const handleSubmit = async (values) => {
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            message.error("Bạn không có quyền thực hiện hành động này!");
            return;
        }

        try {
            if (editingRecord) {
                const docRef = db.collection("employees").doc(editingRecord.id);
                const doc = await docRef.get();
                if (!doc.exists) {
                    message.error("Nhân viên không còn tồn tại!");
                    return;
                }
                await docRef.update({
                    ...values,
                    updatedAt: new Date().toISOString(),
                });
                message.success("Cập nhật nhân viên thành công!");
            } else {
                await db.collection("employees").add({
                    ...values,
                    createdAt: new Date().toISOString(),
                });
                message.success("Thêm nhân viên thành công!");
            }
            setModalOpen(false);
            setEditingRecord(null);
        } catch (error) {
            console.error("Lỗi khi lưu nhân viên:", error);
            message.error("Không thể lưu nhân viên: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            message.error("Bạn không có quyền thực hiện hành động này!");
            return;
        }

        try {
            // Kiểm tra xem nhân viên có đang được phân công trong lịch hẹn không
            const appointments = await db.collection("appointments")
                .where("assignedEmployee", "==", id)
                .get();

            if (!appointments.empty) {
                message.error("Nhân viên này đang được phân công trong lịch hẹn, không thể xóa!");
                return;
            }

            const docRef = db.collection("employees").doc(id);
            const doc = await docRef.get();
            if (!doc.exists) {
                message.error("Nhân viên không còn tồn tại!");
                return;
            }
            await docRef.delete();
            message.success("Xóa nhân viên thành công!");
        } catch (error) {
            console.error("Lỗi khi xóa nhân viên:", error);
            message.error("Không thể xóa nhân viên: " + error.message);
        }
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setModalOpen(true);
    };

    const handleCancel = () => {
        setModalOpen(false);
        setEditingRecord(null);
    };

    return (
        <div>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Quản lý Nhân Viên
            </Title>
            <Button
                type="primary"
                onClick={() => {
                    setEditingRecord(null);
                    setModalOpen(true);
                }}
                style={{ marginBottom: 16 }}
            >
                Thêm Nhân Viên
            </Button>
            <CrudTable
                data={data}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                rowKey="id"
            />
            <CrudForm
                open={modalOpen}
                onCancel={handleCancel}
                onSubmit={handleSubmit}
                initialValues={editingRecord || {}}
                fields={fields}
            />
        </div>
    );
};

export default Employees;