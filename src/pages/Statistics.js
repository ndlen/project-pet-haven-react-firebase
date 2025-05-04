import React, { useState, useEffect, useContext } from "react";
import { Typography, message, Select, Card } from "antd";
import { db } from "../firebase/firebaseConfig";
import { checkAdminAccess } from "../firebase/authUtils";
import { ThemeContext } from "../context/ThemeContext";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import moment from "moment";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title as ChartTitle,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const { Title, Text } = Typography;
const { Option } = Select;

const Statistics = () => {
    const { theme } = useContext(ThemeContext);
    const [appointments, setAppointments] = useState([]);
    const [services, setServices] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [period, setPeriod] = useState("weekly");
    const [error, setError] = useState(null);
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

            // Fetch services to map service names to prices
            const servicesUnsubscribe = db.collection("services").onSnapshot(
                (snapshot) => {
                    const servicesData = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setServices(servicesData);
                },
                (error) => {
                    console.error("Lỗi tải dữ liệu dịch vụ:", error);
                    setError("Không thể tải dữ liệu dịch vụ: " + error.message);
                    NProgress.done();
                }
            );

            // Fetch appointments with status "Hoàn thành"
            const appointmentsUnsubscribe = db.collection("appointments")
                .where("status", "==", "Hoàn thành")
                .onSnapshot(
                    (snapshot) => {
                        const appointmentsData = snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        console.log("Appointments received:", appointmentsData);
                        if (appointmentsData.length === 0) {
                            setError("Không có lịch hẹn hoàn thành để hiển thị thống kê.");
                        } else {
                            setError(null);
                            setAppointments(appointmentsData);
                            processChartData(appointmentsData, services, period);
                        }
                        NProgress.done();
                    },
                    (error) => {
                        console.error("Lỗi tải dữ liệu lịch hẹn:", error);
                        setError("Không thể tải dữ liệu thống kê: " + error.message);
                        NProgress.done();
                    }
                );

            return () => {
                servicesUnsubscribe();
                appointmentsUnsubscribe();
                NProgress.done();
            };
        };

        verifyAdmin();
    }, [navigate]);

    useEffect(() => {
        if (appointments.length > 0 && services.length > 0) {
            processChartData(appointments, services, period);
        }
    }, [period, appointments, services]);

    const processChartData = (appointments, services, selectedPeriod) => {
        let labels = [];
        let revenues = [];
        const now = moment();

        // Map service names to prices
        const servicePriceMap = services.reduce((map, service) => {
            map[service.nameService] = service.price || 0;
            return map;
        }, {});

        if (selectedPeriod === "weekly") {
            // Last 7 days
            labels = Array.from({ length: 7 }, (_, i) =>
                now.clone().subtract(i, "days").format("DD/MM")
            ).reverse();
            revenues = labels.map((date) => {
                const dailyAppointments = appointments.filter((appt) =>
                    moment(appt.date).isSame(moment(date, "DD/MM"), "day")
                );
                return dailyAppointments.reduce((sum, appt) => {
                    const price = servicePriceMap[appt.service] || 0;
                    return sum + price;
                }, 0);
            });
        } else if (selectedPeriod === "monthly") {
            // Last 12 months
            labels = Array.from({ length: 12 }, (_, i) =>
                now.clone().subtract(i, "months").format("MM/YYYY")
            ).reverse();
            revenues = labels.map((month) => {
                const monthlyAppointments = appointments.filter((appt) =>
                    moment(appt.date).isSame(moment(month, "MM/YYYY"), "month")
                );
                return monthlyAppointments.reduce((sum, appt) => {
                    const price = servicePriceMap[appt.service] || 0;
                    return sum + price;
                }, 0);
            });
        } else if (selectedPeriod === "yearly") {
            // Last 5 years or available data
            const minYear = Math.min(
                ...appointments.map((appt) => moment(appt.date).year()),
                now.year() - 4
            );
            labels = Array.from(
                { length: now.year() - minYear + 1 },
                (_, i) => (minYear + i).toString()
            );
            revenues = labels.map((year) => {
                const yearlyAppointments = appointments.filter((appt) =>
                    moment(appt.date).isSame(moment(year, "YYYY"), "year")
                );
                return yearlyAppointments.reduce((sum, appt) => {
                    const price = servicePriceMap[appt.service] || 0;
                    return sum + price;
                }, 0);
            });
        }

        setChartData({
            labels,
            datasets: [
                {
                    label: "Doanh thu (VND)",
                    data: revenues,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                },
            ],
        });
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: "top",
                labels: {
                    color: theme === "dark" ? "#fff" : "#000",
                },
            },
            title: {
                display: true,
                text: `Thống kê Doanh thu ${period === "weekly" ? "Hàng tuần" : period === "monthly" ? "Hàng tháng" : "Hàng năm"}`,
                color: theme === "dark" ? "#fff" : "#000",
            },
        },
        scales: {
            x: {
                ticks: {
                    color: theme === "dark" ? "#fff" : "#000",
                },
                grid: {
                    color: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                },
            },
            y: {
                ticks: {
                    color: theme === "dark" ? "#fff" : "#000",
                    callback: (value) => `${(value / 1000000).toFixed(1)}M`,
                },
                grid: {
                    color: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                },
                title: {
                    display: true,
                    text: "Doanh thu (Triệu VND)",
                    color: theme === "dark" ? "#fff" : "#000",
                },
            },
        },
    };

    return (
        <div
            style={{
                padding: "40px 20px",
                background: "var(--background-color)",
                minHeight: "100vh",
            }}
        >
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <Title
                    level={2}
                    style={{
                        color: "var(--text-color)",
                        marginBottom: 24,
                    }}
                >
                    Thống kê Doanh số
                </Title>
                <Card
                    style={{
                        background: "var(--modal-bg)",
                        borderRadius: 8,
                    }}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Text style={{ color: "var(--text-color)", marginRight: 8 }}>
                            Chọn khoảng thời gian:
                        </Text>
                        <Select
                            value={period}
                            onChange={(value) => setPeriod(value)}
                            style={{ width: 200 }}
                        >
                            <Option value="weekly">Hàng tuần</Option>
                            <Option value="monthly">Hàng tháng</Option>
                            <Option value="yearly">Hàng năm</Option>
                        </Select>
                    </div>
                    {error ? (
                        <Text style={{ color: "var(--text-color)" }}>{error}</Text>
                    ) : chartData ? (
                        <Bar data={chartData} options={chartOptions} />
                    ) : (
                        <Text style={{ color: "var(--text-color)" }}>
                            Đang tải dữ liệu...
                        </Text>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default Statistics;