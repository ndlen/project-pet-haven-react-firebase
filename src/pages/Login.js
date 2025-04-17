import React, { useContext } from "react";
import { Button, Form, Input, message, Card, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { checkAdminAccess } from "../firebase/authUtils";
import { ThemeContext } from "../context/ThemeContext";

const { Title } = Typography;

const Login = ({ setIsAdmin }) => {
    const { theme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const handleSubmit = async (values) => {
        try {
            // Authenticate with Firebase
            const userCredential = await auth.signInWithEmailAndPassword(
                values.email,
                values.password
            );
            const user = userCredential.user;

            // Fetch user data from Firestore
            const usersRef = db.collection("users");
            const querySnapshot = await usersRef
                .where("email", "==", values.email)
                .get();

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();

                // Store user data in localStorage (excluding password)
                const userInfo = {
                    uid: userDoc.id,
                    authUid: user.uid,
                    email: userData.email,
                    fullname: userData.fullname,
                    phone: userData.phone,
                    dob: userData.dob,
                    gender: userData.gender,
                    role: userData.role,
                };
                localStorage.setItem("user", JSON.stringify(userInfo));

                // Check admin access
                const isAdminUser = await checkAdminAccess();
                setIsAdmin(isAdminUser);

                message.success("Đăng nhập thành công!");
                if (isAdminUser) {
                    navigate("/appointments");
                } else {
                    navigate("/customer/home");
                }
            } else {
                // No user data in Firestore, sign out and prompt registration
                await auth.signOut();
                message.error(
                    "Thông tin người dùng không tồn tại trong hệ thống. Vui lòng đăng ký!"
                );
                navigate("/customer/register");
            }
        } catch (error) {
            console.error("Lỗi khi đăng nhập:", error);
            if (error.code === "auth/invalid-login-credentials") {
                message.error(
                    "Email hoặc mật khẩu không đúng. Vui lòng thử lại hoặc đăng ký nếu bạn chưa có tài khoản!"
                );
            } else {
                message.error("Có lỗi xảy ra khi đăng nhập: " + error.message);
            }
        }
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
                        textAlign: "center",
                        marginBottom: 24,
                    }}
                >
                    Đăng nhập
                </Title>
                <Card
                    style={{
                        maxWidth: 600,
                        margin: "0 auto",
                        background: "var(--modal-bg)",
                    }}
                >
                    <Form onFinish={handleSubmit} layout="vertical">
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: "Vui lòng nhập email!" },
                            ]}
                        >
                            <Input placeholder="Nhập email của bạn" />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={[
                                {
                                    required: true,
                                    message: "Vui lòng nhập mật khẩu!",
                                },
                            ]}
                        >
                            <Input.Password placeholder="Nhập mật khẩu" />
                        </Form.Item>
                        <Form.Item style={{ textAlign: "center" }}>
                            <Button type="primary" htmlType="submit" block>
                                Đăng nhập
                            </Button>
                        </Form.Item>
                        <div style={{ textAlign: "center" }}>
                            <a
                                href="#"
                                onClick={() =>
                                    message.info(
                                        "Tính năng quên mật khẩu chưa được triển khai."
                                    )
                                }
                            >
                                Quên mật khẩu?
                            </a>
                            <br />
                            <a onClick={() => navigate("/customer/register")}>
                                Đăng ký tài khoản
                            </a>
                        </div>
                    </Form>
                </Card>
            </div>
        </div>
    );
};

export default Login;