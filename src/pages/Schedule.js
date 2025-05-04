import React, { useState, useEffect, useContext } from "react";
import { Button, Typography, message, Select } from "antd";
import { MailOutlined } from "@ant-design/icons";
import CrudTable from "../components/CrudTable";
import CrudForm from "../components/CrudForm";
import { db } from "../firebase/firebaseConfig";
import { checkAdminAccess } from "../firebase/authUtils";
import { ThemeContext } from "../context/ThemeContext";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useNavigate } from "react-router-dom";
import moment from "moment";

const { Title, Text } = Typography;
const { Option } = Select;

const Schedule = () => {
    const { theme } = useContext(ThemeContext);
    const [data, setData] = useState([]);
    const [employees, setEmployees] = useState([]);
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

            // Lấy danh sách nhân viên
            const employeesUnsubscribe = db.collection("employees").onSnapshot(
                (snapshot) => {
                    const employeeList = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setEmployees(employeeList);
                },
                (error) => {
                    console.error("Lỗi tải dữ liệu nhân viên:", error);
                    message.error("Không thể tải dữ liệu nhân viên. Vui lòng thử lại sau!");
                }
            );

            // Lấy danh sách lịch hẹn từ hôm nay đến 2 ngày tới
            const today = moment().startOf("day");
            const endDate = moment().add(2, "days").endOf("day");

            const appointmentsUnsubscribe = db.collection("appointments").onSnapshot(
                async (snapshot) => {
                    try {
                        const appointments = snapshot.docs
                            .map((doc) => ({
                                id: doc.id,
                                ...doc.data(),
                            }))
                            .filter((appointment) => {
                                if (!appointment.date) return false;
                                const apptDate = moment(appointment.date, "YYYY-MM-DD");
                                return apptDate.isBetween(today, endDate, null, "[]");
                            });

                        // Lấy email từ collection "users" dựa trên phone
                        const appointmentsWithEmail = await Promise.all(
                            appointments.map(async (appointment) => {
                                let email = "";
                                try {
                                    const userQuery = await db.collection("users")
                                        .where("phone", "==", appointment.phone)
                                        .get();
                                    if (!userQuery.empty) {
                                        const userDoc = userQuery.docs[0];
                                        email = userDoc.data().email || "";
                                    } else {
                                        console.warn(`Không tìm thấy email cho khách hàng: ${appointment.fullname}`);
                                    }
                                } catch (error) {
                                    console.error("Lỗi khi lấy email:", error);
                                }
                                return { ...appointment, email };
                            })
                        );

                        setData(appointmentsWithEmail);
                        NProgress.done();
                    } catch (error) {
                        console.error("Lỗi xử lý dữ liệu lịch hẹn:", error);
                        message.error("Không thể tải dữ liệu lịch hẹn. Vui lòng thử lại sau!");
                        NProgress.done();
                    }
                },
                (error) => {
                    console.error("Lỗi tải dữ liệu lịch hẹn:", error);
                    message.error("Không thể tải dữ liệu lịch hẹn. Vui lòng thử lại sau!");
                    NProgress.done();
                }
            );

            return () => {
                employeesUnsubscribe();
                appointmentsUnsubscribe();
                NProgress.done();
            };
        };

        verifyAdmin();
    }, [navigate]);

    // Cột cho bảng nhân viên
    const employeeColumns = [
        { title: "Tên nhân viên", dataIndex: "name", key: "name" },
        { title: "Số điện thoại", dataIndex: "phone", key: "phone" },
        { title: "Email", dataIndex: "email", key: "email" },
    ];

    // Cột cho bảng lịch hẹn
    const appointmentColumns = [
        { title: "Tên khách hàng", dataIndex: "fullname", key: "fullname" },
        { title: "Số điện thoại", dataIndex: "phone", key: "phone" },
        {
            title: "Thời gian",
            dataIndex: "date",
            key: "date",
            render: (text) => text || "Chưa thiết lập",
        },
        { title: "Dịch vụ", dataIndex: "service", key: "service" },
        { title: "Trạng thái", dataIndex: "status", key: "status" },
        { title: "Email khách hàng", dataIndex: "email", key: "email", render: (text) => text || "Không có email" },
        {
            title: "Nhân viên phụ trách",
            dataIndex: "assignedEmployee",
            key: "assignedEmployee",
            render: (text, record) => (
                <Select
                    style={{ width: 200 }}
                    placeholder="Chọn nhân viên"
                    value={record.assignedEmployee || undefined}
                    onChange={(value) => handleAssignEmployee(record.id, value)}
                >
                    {employees.map((employee) => (
                        <Option key={employee.id} value={employee.id}>
                            {employee.name}
                        </Option>
                    ))}
                </Select>
            ),
        },
        {
            title: "Gửi tin nhắn",
            key: "sendEmail",
            render: (_, record) => (
                <Button
                    icon={<MailOutlined />}
                    onClick={() => handleSendEmail(record)}
                />
            ),
        },
    ];

    // Định nghĩa các trường cho form thêm/sửa lịch hẹn
    const fields = [
        { name: "fullname", label: "Tên khách hàng", rules: [{ required: true, message: "Vui lòng nhập tên!" }] },
        { name: "phone", label: "Số điện thoại", rules: [{ required: true, message: "Vui lòng nhập số điện thoại!" }] },
        {
            name: "date",
            label: "Thời gian (YYYY-MM-DD)",
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
        {
            name: "assignedEmployee",
            label: "Nhân viên phụ trách",
            type: "select",
            options: employees.map(employee => ({
                label: employee.name,
                value: employee.id,
            })),
            rules: [{ required: true, message: "Vui lòng chọn nhân viên phụ trách!" }],
        },
    ];

    const handleAssignEmployee = async (appointmentId, employeeId) => {
        try {
            const employee = employees.find(emp => emp.id === employeeId);
            if (!employee) {
                throw new Error("Không tìm thấy nhân viên với ID: " + employeeId);
            }

            const appointmentRef = db.collection("appointments").doc(appointmentId);
            const doc = await appointmentRef.get();
            if (!doc.exists) {
                throw new Error("Lịch hẹn không còn tồn tại!");
            }

            await appointmentRef.update({
                assignedEmployee: employeeId,
                assignedEmployeeName: employee.name,
            });

            message.success("Phân công nhân viên thành công!");
        } catch (error) {
            console.error("Lỗi khi phân công nhân viên:", error);
            message.error("Không thể phân công nhân viên: " + error.message);
        }
    };

    const handleSubmit = async (values) => {
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            message.error("Bạn không có quyền thực hiện hành động này!");
            return;
        }

        try {
            const employee = employees.find(emp => emp.id === values.assignedEmployee);
            const formattedValues = {
                ...values,
                assignedEmployeeName: employee ? employee.name : "",
            };

            if (editingRecord) {
                await db.collection("appointments").doc(editingRecord.id).update({
                    ...formattedValues,
                    updatedAt: new Date().toISOString(),
                });
                message.success("Cập nhật lịch hẹn thành công!");
            } else {
                await db.collection("appointments").add({
                    ...formattedValues,
                    createdAt: new Date().toISOString(),
                });
                message.success("Thêm lịch hẹn thành công!");
            }
            setModalOpen(false);
            setEditingRecord(null);
        } catch (error) {
            console.error("Lỗi khi lưu lịch hẹn:", error);
            message.error("Không thể lưu lịch hẹn: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            message.error("Bạn không có quyền thực hiện hành động này!");
            return;
        }

        try {
            const docRef = db.collection("appointments").doc(id);
            const doc = await docRef.get();
            if (!doc.exists) {
                message.error("Lịch hẹn không còn tồn tại!");
                return;
            }
            await docRef.delete();
            message.success("Xóa lịch hẹn thành công!");
        } catch (error) {
            console.error("Lỗi khi xóa lịch hẹn:", error);
            message.error("Không thể xóa lịch hẹn: " + error.message);
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

    const handleSendEmail = (record) => {
        if (!record.email) {
            message.error("Không tìm thấy email của khách hàng này!");
            return;
        }

        const employee = employees.find(emp => emp.id === record.assignedEmployee);
        const employeeName = employee ? employee.name : "Chưa phân công";

        const subject = encodeURIComponent(`Nhắc nhở lịch hẹn chăm sóc thú cưng - ${record.date}`);
        const prefilledBody = encodeURIComponent(
            `Kính gửi ${record.fullname},\n\n` +
            `Chúng tôi xin nhắc nhở về lịch hẹn của bạn:\n` +
            `- Dịch vụ: ${record.service}\n` +
            `- Thời gian: ${record.date}\n` +
            `- Số điện thoại: ${record.phone}\n` +
            `- Trạng thái: ${record.status}\n` +
            `- Nhân viên phụ trách: ${employeeName}\n\n` +
            `Vui lòng đến đúng giờ hoặc liên hệ chúng tôi nếu cần thay đổi lịch hẹn.\n\n` +
            `Trân trọng,\nPet Haven`
        );

        const mailtoLink = `mailto:${record.email}?subject=${subject}&body=${prefilledBody}`;
        window.location.href = mailtoLink;
        message.success(`Đã mở email để gửi cho ${record.fullname}!`);
    };

    return (
        <div>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Quản Lý Lịch Làm Việc
            </Title>

            <Title level={3} style={{ color: "var(--text-color)", marginTop: 24 }}>
                Danh Sách Nhân Viên
            </Title>
            <CrudTable
                data={employees}
                columns={employeeColumns}
                rowKey="id"
                hideActions={true}
            />

            <Title level={3} style={{ color: "var(--text-color)", marginTop: 24 }}>
                Lịch Hẹn (Hôm nay đến {moment().add(2, "days").format("DD/MM/YYYY")})
            </Title>
            <Button
                type="primary"
                onClick={() => {
                    setEditingRecord(null);
                    setModalOpen(true);
                }}
                style={{ marginBottom: 16 }}
            >
                Thêm Lịch Hẹn
            </Button>
            <CrudTable
                data={data}
                columns={appointmentColumns}
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

export default Schedule;