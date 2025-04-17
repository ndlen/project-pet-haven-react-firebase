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

const Foods = () => {
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
            console.log("Fetching foods data...");
            const unsubscribe = db.collection("foods").onSnapshot(
                (snapshot) => {
                    const foods = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setData(foods);
                    console.log("Foods data updated:", foods);
                    NProgress.done();
                },
                (error) => {
                    console.error("Lỗi tải dữ liệu foods:", error);
                    message.error(
                        "Không thể tải dữ liệu thức ăn. Vui lòng thử lại sau!"
                    );
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
        { title: "Tên món ăn", dataIndex: "name", key: "name" },
        { title: "Danh mục", dataIndex: "category", key: "category" },
        {
            title: "Giá",
            dataIndex: "price",
            key: "price",
            render: (price) => `${price ? price.toLocaleString() : 0} VND`,
        },
        {
            title: "Hình ảnh",
            dataIndex: "picture",
            key: "picture",
            render: (url) =>
                url ? (
                    <img src={url} alt="food" style={{ width: 50 }} />
                ) : (
                    "Không có hình"
                ),
        },
        { title: "Trạng thái", dataIndex: "status", key: "status" },
    ];

    const fields = [
        {
            name: "name",
            label: "Tên món ăn",
            rules: [{ required: true, message: "Vui lòng nhập tên món ăn!" }],
        },
        {
            name: "category",
            label: "Danh mục",
            rules: [{ required: true, message: "Vui lòng nhập danh mục!" }],
        },
        {
            name: "price",
            label: "Giá",
            type: "number",
            rules: [{ required: true, message: "Vui lòng nhập giá!" }],
        },
        {
            name: "picture",
            label: "URL Hình ảnh",
            rules: [{ required: true, message: "Vui lòng nhập URL hình ảnh!" }],
        },
        {
            name: "status",
            label: "Trạng thái",
            type: "select",
            options: [
                { label: "Có sẵn", value: "Có sẵn" },
                { label: "Hết hàng", value: "Hết hàng" },
            ],
            rules: [{ required: true, message: "Vui lòng chọn trạng thái!" }],
        },
    ];

    const handleSubmit = async (values) => {
        try {
            const isAdmin = await checkAdminAccess();
            if (!isAdmin) {
                message.error("Bạn không có quyền thực hiện hành động này!");
                return;
            }

            if (editingRecord) {
                console.log(
                    `Updating food record with ID: ${editingRecord.id}`,
                    values
                );
                const docRef = db.collection("foods").doc(editingRecord.id);
                const doc = await docRef.get();
                if (!doc.exists) {
                    message.error("Món ăn không còn tồn tại!");
                    return;
                }
                await docRef.update({
                    ...values,
                    updatedAt: new Date().toISOString(), // Track update time
                });
                message.success("Cập nhật món ăn thành công!");
            } else {
                console.log("Adding new food record:", values);
                await db.collection("foods").add({
                    ...values,
                    createdAt: new Date().toISOString(), // Track creation time
                });
                message.success("Thêm món ăn thành công!");
            }
            setModalOpen(false);
            setEditingRecord(null); // Clear editing state
        } catch (error) {
            console.error("Lỗi khi lưu món ăn:", error);
            message.error("Không thể lưu món ăn: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            const isAdmin = await checkAdminAccess();
            if (!isAdmin) {
                message.error("Bạn không có quyền thực hiện hành động này!");
                return;
            }

            console.log(`Deleting food record with ID: ${id}`);
            const docRef = db.collection("foods").doc(id);
            const doc = await docRef.get();
            if (!doc.exists) {
                message.error("Món ăn không còn tồn tại!");
                return;
            }
            await docRef.delete();
            message.success("Xóa món ăn thành công!");
        } catch (error) {
            console.error("Lỗi khi xóa món ăn:", error);
            message.error("Không thể xóa món ăn: " + error.message);
        }
    };

    const handleEdit = (record) => {
        console.log("Editing record:", record);
        setEditingRecord({ ...record }); // Create a new object to avoid mutation
        setModalOpen(true);
    };

    const handleCancel = () => {
        console.log("Canceling form, clearing editing record");
        setModalOpen(false);
        setEditingRecord(null);
    };

    return (
        <div>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Quản lý Thức Ăn
            </Title>
            <Button
                type="primary"
                onClick={() => {
                    setEditingRecord(null); // Ensure no editing record when adding new
                    setModalOpen(true);
                }}
                style={{ marginBottom: 16 }}
            >
                Thêm Thức Ăn
            </Button>
            <CrudTable
                data={data}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                rowKey="id" // Ensure unique key for each row
            />
            <CrudForm
                open={modalOpen}
                onCancel={handleCancel}
                onSubmit={handleSubmit}
                initialValues={editingRecord || {}} // Provide empty object if no editingRecord
                fields={fields}
            />
        </div>
    );
};

export default Foods;