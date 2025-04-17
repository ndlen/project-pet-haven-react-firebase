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

const Services = () => {
    const { theme } = useContext(ThemeContext);
    const [data, setData] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
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
            const unsubscribe = db.collection("services").onSnapshot(
                (snapshot) => {
                    const services = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    setData(services);
                    NProgress.done();
                },
                (error) => {
                    console.error("Lỗi tải dữ liệu dịch vụ:", error);
                    message.error("Không thể tải dữ liệu dịch vụ. Vui lòng thử lại sau!");
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
        { title: "Tên dịch vụ", dataIndex: "nameService", key: "nameService" },
        { title: "Mô tả", dataIndex: "describe", key: "describe" },
        {
            title: "Hình ảnh",
            dataIndex: "picture",
            key: "picture",
            render: (url) => <img src={url} alt="service" style={{ width: 50 }} />,
        },
        { title: "Giá", dataIndex: "price", key: "price", render: (price) => `${price} VND` },
    ];

    const fields = [
        { name: "nameService", label: "Tên dịch vụ", rules: [{ required: true, message: "Vui lòng nhập tên dịch vụ!" }] },
        { name: "describe", label: "Mô tả", rules: [{ required: true, message: "Vui lòng nhập mô tả!" }] },
        { name: "picture", label: "URL Hình ảnh", rules: [{ required: true, message: "Vui lòng nhập URL hình ảnh!" }] },
        { name: "price", label: "Giá", type: "number", rules: [{ required: true, message: "Vui lòng nhập giá!" }] },
    ];

    const handleSubmit = async (values) => {
        // Kiểm tra quyền admin trước khi ghi dữ liệu
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            message.error("Bạn không có quyền thực hiện hành động này!");
            return;
        }

        try {
            if (editingRecord) {
                const docRef = db.collection("services").doc(editingRecord.id);
                const doc = await docRef.get();
                if (!doc.exists) {
                    message.error("Dịch vụ không còn tồn tại!");
                    return;
                }
                await docRef.update(values);
                message.success("Cập nhật dịch vụ thành công!");
            } else {
                await db.collection("services").add(values);
                message.success("Thêm dịch vụ thành công!");
            }
            setModalOpen(false);
            setEditingRecord(null);
        } catch (error) {
            console.error("Lỗi khi lưu dịch vụ:", error);
            message.error("Không thể lưu dịch vụ. Vui lòng thử lại sau!");
        }
    };

    const handleDelete = async (id) => {
        // Kiểm tra quyền admin trước khi xóa dữ liệu
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            message.error("Bạn không có quyền thực hiện hành động này!");
            return;
        }

        try {
            const docRef = db.collection("services").doc(id);
            const doc = await docRef.get();
            if (!doc.exists) {
                message.error("Dịch vụ không còn tồn tại!");
                return;
            }
            await docRef.delete();
            message.success("Xóa dịch vụ thành công!");
        } catch (error) {
            console.error("Lỗi khi xóa dịch vụ:", error);
            message.error("Không thể xóa dịch vụ. Vui lòng thử lại sau!");
        }
    };

    return (
        <div>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Quản lý Dịch Vụ
            </Title>
            <Button
                type="primary"
                onClick={() => setModalOpen(true)}
                style={{ marginBottom: 16 }}
            >
                Thêm Dịch Vụ
            </Button>
            <CrudTable
                data={data}
                columns={columns}
                onEdit={(record) => {
                    setEditingRecord(record);
                    setModalOpen(true);
                }}
                onDelete={handleDelete}
            />
            <CrudForm
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditingRecord(null);
                }}
                onSubmit={handleSubmit}
                initialValues={editingRecord}
                fields={fields}
            />
        </div>
    );
};

export default Services;