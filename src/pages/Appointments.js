import React, { useState, useEffect, useContext } from "react";
import { Button, Typography, message } from "antd";
import CrudTable from "../components/CrudTable";
import CrudForm from "../components/CrudForm";
import { db, auth } from "../firebase/firebaseConfig";
import { checkAdminAccess } from "../firebase/authUtils";
import { ThemeContext } from "../context/ThemeContext";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useNavigate } from "react-router-dom";
import moment from "moment";

const { Title } = Typography;

const Appointments = () => {
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
            const unsubscribe = db.collection("appointments").onSnapshot(
                (snapshot) => {
                    const appointments = snapshot.docs.map((doc) => {
                        const docData = doc.data();
                        // console.log("Document ID:", doc.id, "Data:", docData);
                        return {
                            id: doc.id,
                            ...docData,
                        };
                    });

                    // Sort appointments by date in ascending order
                    appointments.sort((a, b) => {
                        const dateA = a.date || "";
                        const dateB = b.date || "";
                        return dateA.localeCompare(dateB); // String comparison for YYYY-MM-DD
                        // Alternatively, use Date objects:
                        // return new Date(dateA) - new Date(dateB);
                    });

                    setData(appointments);
                    NProgress.done();
                },
                (error) => {
                    // console.error("Lỗi tải dữ liệu lịch hẹn:", error);
                    message.error("Không thể tải dữ liệu lịch hẹn. Vui lòng thử lại sau!");
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
        { title: "Tên", dataIndex: "fullname", key: "fullname" },
        { title: "Số điện thoại", dataIndex: "phone", key: "phone" },
        {
            title: "Thời gian",
            dataIndex: "date",
            key: "date",
            render: (text) => text || "Chưa thiết lập",
        },
        { title: "Dịch vụ", dataIndex: "service", key: "service" },
        { title: "Trạng thái", dataIndex: "status", key: "status" },
    ];

    const fields = [
        { name: "fullname", label: "Tên", rules: [{ required: true, message: "Vui lòng nhập tên!" }] },
        { name: "phone", label: "Số điện thoại", rules: [{ required: true, message: "Vui lòng nhập số điện thoại!" }] },
        {
            name: "date",
            label: "Thời gian (YYYY-MM-DD)",
            type: "date",
            rules: [
                { required: true, message: "Vui lòng nhập thời gian!" },
                {
                    validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                        if (!dateRegex.test(value)) {
                            return Promise.reject("Ngày phải có định dạng YYYY-MM-DD (ví dụ: 2025-04-20)!");
                        }
                        const date = moment(value, "YYYY-MM-DD", true);
                        if (!date.isValid()) {
                            return Promise.reject("Ngày không hợp lệ!");
                        }
                        if (date.isBefore(moment().startOf("day"))) {
                            return Promise.reject("Ngày không được nhỏ hơn ngày hiện tại!");
                        }
                        return Promise.resolve();
                    },
                },
            ],
        },
        { name: "service", label: "Dịch vụ", rules: [{ required: true, message: "Vui lòng nhập dịch vụ!" }] },
        {
            name: "status",
            label: "Trạng thái",
            type: "select",
            options: [
                { label: "Chờ xác nhận", value: "Chờ xác nhận" },
                { label: "Đã xác nhận", value: "Đã xác nhận" },
                { label: "Hoàn thành", value: "Hoàn thành" },
                { label: "Đã hủy", value: "Đã hủy" },
            ],
            rules: [{ required: true, message: "Vui lòng chọn trạng thái!" }],
        },
    ];

    const handleSubmit = async (values) => {
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            message.error("Bạn không có quyền thực hiện hành động này!");
            return;
        }

        try {
            const formattedValues = {
                ...values,
            };
            // console.log("Formatted values to save:", formattedValues);

            if (editingRecord) {
                await db.collection("appointments").doc(editingRecord.id).update(formattedValues);
                message.success("Cập nhật lịch hẹn thành công!");
            } else {
                await db.collection("appointments").add(formattedValues);
                message.success("Thêm lịch hẹn thành công!");
            }
            setModalOpen(false);
            setEditingRecord(null);
        } catch (error) {
            // console.error("Lỗi khi lưu lịch hẹn:", error);
            message.error("Không thể lưu lịch hẹn. Vui lòng thử lại sau!");
        }
    };

    const handleDelete = async (id) => {
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            message.error("Bạn không có quyền thực hiện hành động này!");
            return;
        }

        try {
            await db.collection("appointments").doc(id).delete();
            message.success("Xóa lịch hẹn thành công!");
        } catch (error) {
            // console.error("Lỗi khi xóa lịch hẹn:", error);
            message.error("Không thể xóa lịch hẹn. Vui lòng thử lại sau!");
        }
    };

    return (
        <div>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Quản lý Đặt lịch Chăm sóc Thú cưng
            </Title>
            <Button
                type="primary"
                onClick={() => setModalOpen(true)}
                style={{ marginBottom: 16 }}
            >
                Thêm Đặt Lịch
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

export default Appointments;