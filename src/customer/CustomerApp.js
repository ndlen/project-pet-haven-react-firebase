import React, { useState, useEffect, useContext } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Menu, Switch, Button, Card, Typography, message, InputNumber, Image, Spin, Form, Input, Select, Table, DatePicker, Pagination } from "antd";
import { ShoppingCartOutlined, DeleteOutlined, HomeOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { ThemeContext } from "../context/ThemeContext";
import moment from "moment";
import { db, auth } from "../firebase/firebaseConfig";
import { logout as firebaseLogout } from "../firebase/authUtils";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import "../styles.css";
import { Option } from "antd/es/mentions";
import background from '../assets/images/background.jpg';
import haven from '../assets/images/haven.jpg';
import sha256 from "js-sha256";
const { Title, Paragraph } = Typography;

// CustomerNavbar component (unchanged)
const CustomerNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [user, setUser] = useState(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [cartCount, setCartCount] = useState(0); // State for cart item count

    // Load user data
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                db.collection("users")
                    .where("email", "==", currentUser.email)
                    .get()
                    .then((querySnapshot) => {
                        if (!querySnapshot.empty) {
                            const userData = querySnapshot.docs[0].data();
                            userData.uid = currentUser.uid;
                            localStorage.setItem("user", JSON.stringify(userData));
                            setUser(userData);
                            setIsRedirecting(false);
                        } else {
                            if (
                                !isRedirecting &&
                                location.pathname !== "/customer/login" &&
                                location.pathname !== "/customer/register"
                            ) {
                                message.destroy();
                                message.error("Không tìm thấy dữ liệu người dùng. Vui lòng cập nhật hồ sơ.");
                                setIsRedirecting(true);
                                navigate("/customer/profile");
                            }
                        }
                    })
                    .catch((error) => {
                        console.error("Lỗi lấy dữ liệu người dùng:", error);
                        message.destroy();
                        message.error("Không thể lấy dữ liệu người dùng. Vui lòng đăng nhập lại!");
                        setIsRedirecting(true);
                        navigate("/customer/login");
                    });
            } else {
                setUser(null);
                localStorage.removeItem("user");
                setIsRedirecting(false);
            }
        });
        return () => unsubscribe();
    }, [navigate, location.pathname, isRedirecting]);

    // Load and update cart count
    useEffect(() => {
        const updateCartCount = () => {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            setCartCount(totalItems);
        };

        // Initial load
        updateCartCount();

        // Listen for storage changes (e.g., when cart is updated in another component)
        window.addEventListener("storage", updateCartCount);

        // Optional: Polling for cart changes if storage event isn't reliable
        const interval = setInterval(updateCartCount, 1000);

        return () => {
            window.removeEventListener("storage", updateCartCount);
            clearInterval(interval);
        };
    }, []);

    const handleLogout = () => {
        firebaseLogout();
        localStorage.removeItem("cart");
        setCartCount(0); // Reset cart count on logout
        navigate("/customer/login");
    };

    const menuItems = [
        { key: "/customer/home", icon: <HomeOutlined />, label: "Trang chủ" },
        { key: "/customer/services", icon: <ShoppingCartOutlined />, label: "Dịch vụ" },
        { key: "/customer/foods", icon: <ShoppingCartOutlined />, label: "Thức ăn" },
        {
            key: "/customer/cart",
            icon: <ShoppingCartOutlined />,
            label: (
                <span>
                    Giỏ hàng {cartCount > 0 && <span style={{ color: "#FF4D4F" }}>({cartCount})</span>}
                </span>
            ),
        },
        { key: "/customer/contact", icon: <MailOutlined />, label: "Liên hệ" },
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
                    key: "user",
                    label: user ? user.fullname : "Đăng nhập",
                    icon: <UserOutlined />,
                    children: user
                        ? [
                            { key: "profile", label: "Thông Tin", onClick: () => navigate("/customer/profile") },
                            { key: "history", label: "Lịch sử mua hàng", onClick: () => navigate("/customer/history") },
                            { key: "logout", label: "Đăng Xuất", onClick: handleLogout },
                        ]
                        : [
                            { key: "login", label: "Đăng nhập", onClick: () => navigate("/customer/login") },
                            { key: "register", label: "Đăng ký", onClick: () => navigate("/customer/register") },
                        ],
                },
            ]}
            style={{ position: "fixed", top: 0, width: "100%", zIndex: 1000 }}
        />
    );
};

// CustomerHome component (unchanged)
const CustomerHome = () => {
    const { theme } = useContext(ThemeContext);
    const [services, setServices] = useState([]);
    const [products, setProducts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        NProgress.start();
        const unsubscribeServices = db.collection("services")
            .limit(4)
            .onSnapshot(
                (snapshot) => {
                    const serviceData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    setServices(serviceData);
                },
                (error) => {
                    console.error("Lỗi khi tải dịch vụ:", error);
                    message.error("Không thể tải danh sách dịch vụ. Vui lòng thử lại sau!");
                }
            );

        const unsubscribeProducts = db.collection("foods")
            .where("status", "==", "Có sẵn")
            .limit(4)
            .onSnapshot(
                (snapshot) => {
                    const productData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    setProducts(productData);
                    NProgress.done();
                },
                (error) => {
                    console.error("Lỗi khi tải sản phẩm:", error);
                    message.error("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau!");
                }
            );

        return () => {
            unsubscribeServices();
            unsubscribeProducts();
            NProgress.done();
        };
    }, []);

    return (
        <div style={{ background: "var(--background-color)", minHeight: "100vh" }}>
            <div style={{ padding: "80px 50px" }}>
                <div style={{ display: "flex", alignItems: "center", background: "var(--modal-bg)", padding: "50px", borderRadius: "10px", marginBottom: "40px" }}>
                    <div style={{ flex: 1, color: "var(--text-color)" }}>
                        <Title level={1} style={{ color: "var(--text-color)" }}>
                            Chăm sóc thú cưng với sự tận tâm nhất! 🐾
                        </Title>
                        <Paragraph style={{ color: "var(--text-color)" }}>
                            Hãy để chúng tôi giúp bạn chăm sóc thú cưng với các dịch vụ tốt nhất.
                        </Paragraph>
                        <Button type="primary" onClick={() => navigate("/customer/services")}>
                            Khám phá ngay
                        </Button>
                    </div>
                    <Image src={background} width={400} style={{ borderRadius: "10px" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
                    <div style={{ flex: 1, color: "var(--text-color)" }}>
                        <Title level={2} style={{ color: "var(--text-color)" }}>
                            Về Pet Haven 🏡
                        </Title>
                        <Paragraph style={{ color: "var(--text-color)" }}>
                            Pet Haven là nơi mang đến những dịch vụ chăm sóc thú cưng tốt nhất, từ thức ăn chất lượng, spa, đến dịch vụ y tế và tư vấn sức khỏe.
                        </Paragraph>
                        <Paragraph style={{ color: "var(--text-color)" }}>
                            Chúng tôi cam kết cung cấp những sản phẩm và dịch vụ tốt nhất để đảm bảo thú cưng của bạn luôn khỏe mạnh và hạnh phúc.
                        </Paragraph>
                    </div>
                    <Image src={haven} width={400} style={{ borderRadius: "10px" }} />
                </div>
                <div style={{ marginBottom: "40px" }}>
                    <Title level={2} style={{ color: "var(--text-color)" }}>
                        Dịch vụ nổi bật 🏆
                    </Title>
                    {services.length === 0 ? (
                        <Paragraph style={{ color: "var(--text-color)" }}>
                            Hiện không có dịch vụ nào để hiển thị.
                        </Paragraph>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                            {services.map((service) => (
                                <Card key={service.id} style={{ background: "var(--table-bg)" }}>
                                    <i className="fa-solid fa-paw" style={{ fontSize: "24px", color: "#FF8C00" }}></i>
                                    <Title level={4} style={{ color: "var(--text-color)" }}>
                                        {service.nameService || "Không có tên"}
                                    </Title>
                                    <Paragraph style={{ color: "var(--text-color)" }}>
                                        {service.describe || "Chưa có mô tả"}
                                    </Paragraph>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ marginBottom: "40px" }}>
                    <Title level={2} style={{ color: "var(--text-color)" }}>
                        Sản phẩm nổi bật 🛍️
                    </Title>
                    {products.length === 0 ? (
                        <Paragraph style={{ color: "var(--text-color)" }}>
                            Hiện không có sản phẩm nào để hiển thị.
                        </Paragraph>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                            {products.map((product) => (
                                <Card key={product.id} hoverable style={{ background: "var(--table-bg)" }}>
                                    <Image src={product.picture || "https://via.placeholder.com/150"} height={150} style={{ objectFit: "cover" }} />
                                    <Title level={4} style={{ color: "var(--text-color)" }}>
                                        {product.name || "Không có tên"}
                                    </Title>
                                    <Paragraph style={{ color: "var(--text-color)" }}>
                                        {product.category || "Không xác định"}
                                    </Paragraph>
                                    <Paragraph style={{ color: "#FFD700" }}>
                                        {product.price ? product.price.toLocaleString() : "0"} VND
                                    </Paragraph>
                                    <Button type="primary" onClick={() => navigate("/customer/foods")}>
                                        Mua ngay
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ marginBottom: "40px" }}>
                    <Title level={2} style={{ color: "var(--text-color)" }}>
                        Khách hàng nói gì về chúng tôi? 🐾
                    </Title>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
                        <Card style={{ background: "var(--table-bg)" }}>
                            <Paragraph style={{ color: "var(--text-color)" }}>
                                "Dịch vụ chăm sóc thú cưng ở đây thật tuyệt vời! Nhân viên rất thân thiện và chuyên nghiệp!"
                            </Paragraph>
                            <Title level={5} style={{ color: "var(--text-color)" }}>
                                - Nguyễn Văn A
                            </Title>
                        </Card>
                        <Card style={{ background: "var(--table-bg)" }}>
                            <Paragraph style={{ color: "var(--text-color)" }}>
                                "Chó cưng của tôi được tắm và cắt tỉa lông rất đẹp, chắc chắn sẽ quay lại!"
                            </Paragraph>
                            <Title level={5} style={{ color: "var(--text-color)" }}>
                                - Trần Thị B
                            </Title>
                        </Card>
                        <Card style={{ background: "var(--table-bg)" }}>
                            <Paragraph style={{ color: "var(--text-color)" }}>
                                "Thức ăn và phụ kiện chất lượng cao, giá cả hợp lý, rất đáng để trải nghiệm!"
                            </Paragraph>
                            <Title level={5} style={{ color: "var(--text-color)" }}>
                                - Lê Văn C
                            </Title>
                        </Card>
                    </div>
                </div>
                <div style={{ marginBottom: "40px" }}>
                    <Title level={2} style={{ color: "var(--text-color)" }}>
                        Câu hỏi thường gặp ❓
                    </Title>
                    <Card style={{ background: "var(--table-bg)" }}>
                        <div style={{ marginBottom: "16px" }}>
                            <Title level={4} style={{ color: "var(--text-color)" }}>
                                Tôi có thể đặt hàng trước bao lâu? <span>+</span>
                            </Title>
                            <Paragraph style={{ color: "var(--text-color)" }}>
                                Bạn có thể đặt hàng bất kỳ lúc nào, chúng tôi sẽ xử lý trong vòng 24 giờ.
                            </Paragraph>
                        </div>
                        <div style={{ marginBottom: "16px" }}>
                            <Title level={4} style={{ color: "var(--text-color)" }}>
                                Cửa hàng có bán thức ăn cho mọi loại thú cưng không? <span>+</span>
                            </Title>
                            <Paragraph style={{ color: "var(--text-color)" }}>
                                Chúng tôi cung cấp đa dạng thức ăn cho chó, mèo và một số vật nuôi khác.
                            </Paragraph>
                        </div>
                        <div>
                            <Title level={4} style={{ color: "var(--text-color)" }}>
                                Có dịch vụ giao hàng tận nơi không? <span>+</span>
                            </Title>
                            <Paragraph style={{ color: "var(--text-color)" }}>
                                Chúng tôi hỗ trợ giao hàng tận nơi trong phạm vi 10km từ cửa hàng.
                            </Paragraph>
                        </div>
                    </Card>
                </div>
                <div style={{ background: "var(--modal-bg)", padding: "50px", textAlign: "center", borderRadius: "10px" }}>
                    <Title level={2} style={{ color: "var(--text-color)" }}>
                        Hãy chăm sóc thú cưng của bạn ngay hôm nay!
                    </Title>
                    <Paragraph style={{ color: "var(--text-color)" }}>
                        Đặt hàng ngay để thú cưng của bạn được hưởng dịch vụ và sản phẩm tốt nhất.
                    </Paragraph>
                    <Button type="primary" onClick={() => navigate("/customer/services")}>
                        Đặt hàng ngay
                    </Button>
                </div>
            </div>
        </div>
    );
};

// CustomerServices component (unchanged)
const CustomerServices = () => {
    const { theme } = useContext(ThemeContext);
    const [services, setServices] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(12);
    const navigate = useNavigate();

    useEffect(() => {
        NProgress.start();
        const unsubscribe = db.collection("services").onSnapshot(
            (snapshot) => {
                const serviceData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setServices(serviceData);
                NProgress.done();
            },
            (error) => {
                console.error("Lỗi khi tải dịch vụ:", error);
                message.error("Không thể tải danh sách dịch vụ. Vui lòng thử lại sau!");
                NProgress.done();
            }
        );
        return () => {
            unsubscribe();
            NProgress.done();
        };
    }, []);

    const addToCart = (service) => {
        const user = auth.currentUser;
        if (!user) {
            message.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
            navigate("/customer/login");
            return;
        }

        const userData = JSON.parse(localStorage.getItem("user"));
        if (!userData) {
            message.error("Vui lòng cập nhật thông tin cá nhân trước khi thêm vào giỏ hàng!");
            navigate("/customer/profile");
            return;
        }

        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        const item = {
            id: service.id,
            name: service.nameService,
            price: service.price || 0,
            picture: service.picture || "https://via.placeholder.com/200",
            quantity: 1,
            type: "service",
            date: moment().format("YYYY-MM-DD"),
            userId: user.uid,
            userFullname: userData.fullname,
            userPhone: userData.phone,
            timestamp: new Date().toISOString(),
        };

        const existingItemIndex = cart.findIndex(
            (cartItem) => cartItem.id === service.id && cartItem.userId === user.uid
        );
        if (existingItemIndex >= 0) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push(item);
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        message.success(`${service.nameService} đã được thêm vào giỏ hàng!`);
    };

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedServices = services.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <div style={{ padding: "80px 50px", background: "var(--background-color)", minHeight: "100vh" }}>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Dịch vụ thú cưng 🐶🐱
            </Title>
            <Paragraph style={{ color: "var(--text-color)" }}>
                Chúng tôi cung cấp các dịch vụ tốt nhất cho thú cưng của bạn!
            </Paragraph>
            {services.length === 0 ? (
                <Paragraph style={{ color: "var(--text-color)" }}>
                    Hiện không có dịch vụ nào để hiển thị.
                </Paragraph>
            ) : (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", padding: "20px" }}>
                        {paginatedServices.map((service) => (
                            <Card
                                key={service.id}
                                hoverable
                                cover={
                                    <img
                                        alt={service.nameService}
                                        src={service.picture || "https://via.placeholder.com/200"}
                                        style={{ height: 200, objectFit: "cover" }}
                                    />
                                }
                                style={{
                                    background: "var(--table-bg)",
                                    display: "flex",
                                    flexDirection: "column",
                                    minHeight: "400px", // Set a consistent minimum height for cards
                                }}
                            >
                                <Card.Meta
                                    title={<span style={{ color: "var(--text-color)" }}>{service.nameService}</span>}
                                    description={
                                        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                            <Paragraph
                                                style={{
                                                    color: "var(--text-color)",
                                                    marginBottom: "8px",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 3, // Limit description to 3 lines
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    minHeight: "60px", // Ensure consistent height for description
                                                }}
                                            >
                                                {service.describe || "Mô tả chưa có"}
                                            </Paragraph>
                                            <div>
                                                <Paragraph style={{ color: "#FFD700", marginBottom: "8px" }}>
                                                    {service.price ? service.price.toLocaleString() : "0"} VND
                                                </Paragraph>
                                                <Button
                                                    type="primary"
                                                    onClick={() => addToCart(service)}
                                                    style={{
                                                        width: "100%",
                                                        height: "40px",
                                                        fontSize: "16px",
                                                        padding: "0 16px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        backgroundColor: "#fa8c16", // Match the orange color in the image
                                                        borderColor: "#fa8c16",
                                                    }}
                                                >
                                                    Thêm vào giỏ hàng
                                                </Button>
                                            </div>
                                        </div>
                                    }
                                />
                            </Card>
                        ))}
                    </div>
                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <Pagination
                            current={currentPage}
                            pageSize={pageSize}
                            total={services.length}
                            onChange={handlePageChange}
                            showSizeChanger={false}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

// CustomerFoods component (unchanged)
const CustomerFoods = () => {
    const { theme } = useContext(ThemeContext);
    const [foods, setFoods] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12); // Default items per page
    const navigate = useNavigate();

    useEffect(() => {
        NProgress.start();
        console.log("Fetching foods with status 'Có sẵn'...");
        const unsubscribe = db
            .collection("foods")
            .where("status", "==", "Có sẵn")
            .onSnapshot(
                (snapshot) => {
                    if (snapshot.empty) {
                        console.log(
                            "No documents found with status 'Có sẵn'. Checking all foods..."
                        );
                        db.collection("foods")
                            .get()
                            .then((allSnapshot) => {
                                const allFoods = allSnapshot.docs.map((doc) => ({
                                    id: doc.id,
                                    ...doc.data(),
                                }));
                                console.log("All foods in collection:", allFoods);
                            });
                        setFoods([]);
                    } else {
                        const foodData = snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        setFoods(foodData);
                        // Extract unique categories
                        const uniqueCategories = [
                            ...new Set(foodData.map((food) => food.category || "Không xác định")),
                        ];
                        setCategories(uniqueCategories);
                        console.log("Danh sách thức ăn:", foodData);
                    }
                    NProgress.done();
                },
                (error) => {
                    console.error("Lỗi khi tải thức ăn:", error);
                    message.error(
                        "Không thể tải danh sách thức ăn. Vui lòng thử lại sau!"
                    );
                    NProgress.done();
                }
            );
        return () => {
            unsubscribe();
            NProgress.done();
        };
    }, []);

    const addToCart = (food) => {
        const user = auth.currentUser;
        if (!user) {
            message.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
            navigate("/customer/login");
            return;
        }

        const userData = JSON.parse(localStorage.getItem("user"));
        if (!userData) {
            message.error(
                "Vui lòng cập nhật thông tin cá nhân trước khi thêm vào giỏ hàng!"
            );
            navigate("/customer/profile");
            return;
        }

        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        const item = {
            id: food.id,
            name: food.name,
            price: food.price,
            picture: food.picture,
            quantity: 1,
            type: "food",
            userId: user.uid,
            userFullname: userData.fullname,
            userPhone: userData.phone,
            timestamp: new Date().toISOString(),
        };

        const existingItemIndex = cart.findIndex(
            (cartItem) => cartItem.id === food.id && cartItem.userId === user.uid
        );
        if (existingItemIndex >= 0) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push(item);
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        message.success(`${food.name} đã được thêm vào giỏ hàng!`);
    };

    // Filter foods based on selected category
    const filteredFoods =
        selectedCategory === "all"
            ? foods
            : foods.filter(
                (food) =>
                    (food.category || "Không xác định") === selectedCategory
            );

    // Calculate paginated foods
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedFoods = filteredFoods.slice(startIndex, startIndex + pageSize);

    // Handle page change
    const handlePageChange = (page, newPageSize) => {
        setCurrentPage(page);
        if (newPageSize !== pageSize) {
            setPageSize(newPageSize);
            setCurrentPage(1); // Reset to first page when page size changes
        }
    };

    return (
        <div
            style={{
                padding: "80px 50px",
                background: "var(--background-color)",
                minHeight: "100vh",
            }}
        >
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Thức ăn cho thú cưng 🍖🥫
            </Title>
            <Paragraph style={{ color: "var(--text-color)" }}>
                Dinh dưỡng tốt nhất cho người bạn nhỏ của bạn!
            </Paragraph>
            <div style={{ marginBottom: "20px" }}>
                <Select
                    style={{ width: 200 }}
                    value={selectedCategory}
                    onChange={(value) => {
                        setSelectedCategory(value);
                        setCurrentPage(1); // Reset to first page when category changes
                    }}
                >
                    <Select.Option value="all">Tất cả danh mục</Select.Option>
                    {categories.map((category) => (
                        <Select.Option key={category} value={category}>
                            {category}
                        </Select.Option>
                    ))}
                </Select>
            </div>
            {filteredFoods.length === 0 ? (
                <Paragraph style={{ color: "var(--text-color)" }}>
                    Hiện không có sản phẩm nào trong danh mục này!
                </Paragraph>
            ) : (
                <>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "20px",
                            padding: "20px",
                        }}
                    >
                        {paginatedFoods.map((food) => (
                            <Card
                                key={food.id}
                                hoverable
                                cover={
                                    <img
                                        alt={food.name}
                                        src={
                                            food.picture ||
                                            "https://via.placeholder.com/200"
                                        }
                                        style={{ height: 200, objectFit: "cover" }}
                                    />
                                }
                                style={{ background: "var(--table-bg)" }}
                            >
                                <Card.Meta
                                    title={
                                        <span style={{ color: "var(--text-color)" }}>
                                            {food.name}
                                        </span>
                                    }
                                    description={
                                        <div>
                                            <Paragraph
                                                style={{ color: "var(--text-color)" }}
                                            >
                                                Danh mục:{" "}
                                                {food.category || "Không xác định"}
                                            </Paragraph>
                                            <Paragraph
                                                style={{ color: "#FFD700" }}
                                            >
                                                {food.price
                                                    ? food.price.toLocaleString()
                                                    : "0"}{" "}
                                                VND
                                            </Paragraph>
                                            <Button
                                                type="primary"
                                                onClick={() => addToCart(food)}
                                            >
                                                Thêm vào giỏ hàng
                                            </Button>
                                        </div>
                                    }
                                />
                            </Card>
                        ))}
                    </div>
                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <Pagination
                            current={currentPage}
                            pageSize={pageSize}
                            total={filteredFoods.length}
                            onChange={handlePageChange}
                            showSizeChanger
                            pageSizeOptions={["12", "24", "36"]}
                            showTotal={(total, range) =>
                                `${range[0]}-${range[1]} của ${total} sản phẩm`
                            }
                        />
                    </div>
                </>
            )}
        </div>
    );
};

// Updated CustomerCart component with detailed order logging
const CustomerCart = () => {
    const { theme } = useContext(ThemeContext);
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState("COD");
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [bankInfo, setBankInfo] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const navigate = useNavigate();

    // Load giỏ hàng từ localStorage
    const loadCart = () => {
        const cartData = JSON.parse(localStorage.getItem("cart")) || [];
        const formattedCart = cartData.map((item) => ({
            ...item,
            date: item.date && moment(item.date, "YYYY-MM-DD", true).isValid() ? item.date : null,
        }));
        setCart(formattedCart);
    };

    useEffect(() => {
        loadCart();
    }, []);

    // Tạo URL Quick Link VietQR
    const generateVietQR = (orderId, total) => {
        const bankId = "970422"; // VietinBank
        const accountNo = "0905859265";
        const template = "compact";
        const accountNameRaw = "NGUYEN DUC LEN";
        const accountName = encodeURIComponent(accountNameRaw);
        const amount = Math.floor(parseInt(total, 10));
        const descriptionRaw = `Thanh toan don hang ${orderId}`;
        const description = encodeURIComponent(descriptionRaw).replace(/[^a-zA-Z0-9%]/g, "").slice(0, 50);

        if (!bankId.match(/^\d+$/) || !accountNo.match(/^[a-zA-Z0-9]{1,19}$/)) {
            message.error("Thông tin ngân hàng không hợp lệ!");
            return null;
        }
        if (amount <= 0 || isNaN(amount)) {
            message.error("Số tiền không hợp lệ!");
            return null;
        }
        if (descriptionRaw.length > 50) {
            message.error("Nội dung chuyển khoản quá dài (tối đa 50 ký tự)!");
            return null;
        }

        const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${description}&accountName=${accountName}`;
        console.log("URL VietQR được tạo:", qrUrl);
        console.log("Thông tin VietQR:", { bankId, accountNo, template, amount, description: descriptionRaw, accountName: accountNameRaw });

        return { qrUrl, bankInfo: { bankId, accountNo, accountName: accountNameRaw } };
    };

    // Hàm kiểm tra trạng thái thanh toán qua VietQR API
    const checkPaymentStatus = async (orderId, total) => {
        try {
            const response = await fetch('http://localhost:3001/api/vietqr', {
                method: "GET",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            });
            if (!response.ok) {
                console.error("Lỗi HTTP:", response.status);
                return false;
            }
            const result = await response.json();
            console.log("Dữ liệu từ VietQR API:", result);

            if (result.error) {
                console.error("API trả về lỗi:", result);
                return false;
            }

            const transactions = result.data.filter(item => item["Mã GD"] !== "Mã GD");
            console.log("Giao dịch:", transactions);

            // Chuẩn hóa orderId thành chữ in hoa
            const normalizedOrderId = orderId.toUpperCase();
            const matchingTransaction = transactions.find((tx) => {
                const description = tx["Mô tả"].toUpperCase();
                const price = parseInt(tx["Giá trị"]);
                const account = tx["Số tài khoản"];
                console.log("So sánh giao dịch:", {
                    description: description,
                    orderId: normalizedOrderId,
                    price: price,
                    total: parseInt(total),
                    account: account
                });
                return (
                    description.includes(normalizedOrderId) &&
                    price >= parseInt(total) &&
                    account === "0905859265"
                );
            });

            console.log("Kiểm tra khớp:", { orderId: normalizedOrderId, total, matchingTransaction });
            return !!matchingTransaction;
        } catch (error) {
            console.error("Lỗi kiểm tra thanh toán:", error);
            return false;
        }
    };

    // Hàm xử lý thanh toán thành công
    const handleSuccessfulPayment = async (orderRef) => {
        const userData = JSON.parse(localStorage.getItem("user"));
        try {
            await db.collection("orders").doc(orderRef.id).update({
                status: "Đã thanh toán",
                updatedAt: new Date().toISOString(),
            });

            const appointmentPromises = cart.map((item) => {
                if (item.type === "service") {
                    const appointment = {
                        fullname: userData.fullname || "",
                        phone: userData.phone || "",
                        date: item.date,
                        service: item.name || "Không có tên",
                        status: "Chờ xác nhận",
                        userId: auth.currentUser.uid,
                    };
                    return db.collection("appointments").add(appointment);
                }
                return Promise.resolve();
            });

            await Promise.all(appointmentPromises);
            localStorage.removeItem("cart");
            setCart([]);
            setQrCodeUrl(null);
            setBankInfo(null);
            setOrderId(null);
            message.success("Thanh toán thành công!");
            navigate("/customer/history");
        } catch (error) {
            console.error("Lỗi xử lý thanh toán:", error);
            message.error("Lỗi cập nhật đơn hàng!");
        }
    };

    // Hàm thanh toán với log chi tiết đơn hàng
    const checkout = async () => {
        const user = auth.currentUser;
        if (!user) {
            message.error("Vui lòng đăng nhập!");
            navigate("/customer/login");
            return;
        }

        const userData = JSON.parse(localStorage.getItem("user"));
        if (!userData) {
            message.error("Vui lòng cập nhật thông tin cá nhân!");
            navigate("/customer/profile");
            return;
        }

        if (cart.length === 0) {
            message.error("Giỏ hàng trống!");
            return;
        }

        const hasMissingDate = cart.some((item) => item.type === "service" && !item.date);
        if (hasMissingDate) {
            message.error("Vui lòng nhập ngày cho dịch vụ!");
            return;
        }

        const hasInvalidDate = cart.some((item) => {
            if (item.type === "service") {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(item.date) || !moment(item.date, "YYYY-MM-DD", true).isValid() || moment(item.date).isBefore(moment().startOf("day"))) {
                    message.error(`Ngày của dịch vụ ${item.name} không hợp lệ!`);
                    return true;
                }
            }
            return false;
        });

        if (hasInvalidDate) return;

        const foodItems = cart.filter((item) => item.type === "food");
        for (const item of foodItems) {
            const foodRef = db.collection("foods").doc(item.id);
            const foodDoc = await foodRef.get();
            if (!foodDoc.exists) {
                message.error(`Món ăn ${item.name} không tồn tại!`);
                return;
            }
            const foodData = foodDoc.data();
            const currentQuantity = foodData.quantity || 0;
            const requestedQuantity = item.quantity || 1;

            if (currentQuantity < requestedQuantity) {
                message.error(`Số lượng ${item.name} không đủ! Còn ${currentQuantity} sản phẩm.`);
                return;
            }
        }

        const order = {
            userId: user.uid,
            userFullname: userData.fullname || "",
            userPhone: userData.phone || "",
            items: cart.map((item) => ({
                id: item.id,
                name: item.name || "Không có tên",
                picture: item.picture || "",
                quantity: item.quantity || 1,
            })),
            total: cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0).toString(),
            timestamp: new Date().toISOString(),
            status: paymentMethod === "COD" ? "Chờ xử lý" : "Chờ thanh toán",
            paymentMethod,
        };

        try {
            const orderRef = await db.collection("orders").add(order);
            setOrderId(orderRef.id);
            console.log("Đơn hàng đã tạo:", {
                orderId: orderRef.id,
                total: order.total,
                items: order.items,
                userId: order.userId,
                userFullname: order.userFullname,
                userPhone: order.userPhone,
                timestamp: order.timestamp,
                paymentMethod: order.paymentMethod,
                status: order.status
            });

            const updatePromises = foodItems.map(async (item) => {
                const foodRef = db.collection("foods").doc(item.id);
                const foodDoc = await foodRef.get();
                const currentQuantity = foodDoc.data().quantity || 0;
                const requestedQuantity = item.quantity || 1;
                await foodRef.update({
                    quantity: currentQuantity - requestedQuantity,
                    updatedAt: new Date().toISOString(),
                });
                if (currentQuantity - requestedQuantity <= 0) {
                    await foodRef.update({
                        status: "Hết hàng",
                        updatedAt: new Date().toISOString(),
                    });
                }
            });

            await Promise.all(updatePromises);

            if (paymentMethod === "VietQR") {
                NProgress.start();
                const result = generateVietQR(orderRef.id, order.total);
                console.log("Tổng tiền yêu cầu:", order.total);
                if (!result) return;
                setQrCodeUrl(result.qrUrl);
                setBankInfo(result.bankInfo);
                NProgress.done();
                message.info("Quét mã QR để thanh toán!");

                const checkInterval = setInterval(async () => {
                    const isPaid = await checkPaymentStatus(orderRef.id, order.total);
                    if (isPaid) {
                        clearInterval(checkInterval);
                        await handleSuccessfulPayment(orderRef);
                    }
                }, 2000);

                const timeout = setTimeout(() => {
                    clearInterval(checkInterval);
                    if (qrCodeUrl) {
                        message.warning("Hết thời gian chờ thanh toán!");
                        setQrCodeUrl(null);
                        setBankInfo(null);
                        setOrderId(null);
                    }
                }, 10 * 60 * 1000);

                return () => {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                };
            } else {
                const appointmentPromises = cart.map((item) => {
                    if (item.type === "service") {
                        const appointment = {
                            fullname: userData.fullname || "",
                            phone: userData.phone || "",
                            date: item.date,
                            service: item.name || "Không có tên",
                            status: "Chờ xác nhận",
                            userId: user.uid,
                        };
                        return db.collection("appointments").add(appointment);
                    }
                    return Promise.resolve();
                });
                await Promise.all(appointmentPromises);
                localStorage.removeItem("cart");
                setCart([]);
                message.success("Đặt hàng thành công!");
                navigate("/customer/home");
            }
        } catch (error) {
            console.error("Lỗi đặt hàng:", error);
            message.error("Lỗi khi đặt hàng!");
        }
    };

    const updateQuantity = (index, quantity) => {
        let updatedCart = [...cart];
        quantity = Math.max(1, parseInt(quantity));
        updatedCart[index].quantity = quantity;
        localStorage.setItem("cart", JSON.stringify(updatedCart));
        setCart(updatedCart);
    };

    const updateDate = (index, date) => {
        let updatedCart = [...cart];
        updatedCart[index].date = date || null;
        localStorage.setItem("cart", JSON.stringify(updatedCart));
        setCart(updatedCart);
    };

    const removeItem = (index) => {
        let updatedCart = [...cart];
        updatedCart.splice(index, 1);
        localStorage.setItem("cart", JSON.stringify(updatedCart));
        setCart(updatedCart);
    };

    const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

    return (
        <div style={{ padding: "80px 50px", background: "var(--background-color)", minHeight: "100vh" }}>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Giỏ Hàng 🛒
            </Title>
            <Paragraph style={{ color: "var(--text-color)" }}>
                Xem và quản lý các sản phẩm bạn đã chọn!
            </Paragraph>
            {cart.length === 0 ? (
                <Paragraph style={{ color: "var(--text-color)" }}>
                    Giỏ hàng của bạn trống!
                </Paragraph>
            ) : (
                <>
                    <Form.Item label="Phương thức thanh toán">
                        <Select value={paymentMethod} onChange={setPaymentMethod}>
                            <Select.Option value="COD">Thanh toán khi nhận hàng</Select.Option>
                            <Select.Option value="VietQR">Thanh toán qua VietQR</Select.Option>
                        </Select>
                    </Form.Item>
                    {cart.map((item, index) => (
                        <Card key={index} style={{ marginBottom: 16, background: "var(--table-bg)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Image src={item.picture || "https://via.placeholder.com/100"} width={100} style={{ borderRadius: 8 }} />
                                <div style={{ flex: 1, marginLeft: 16, color: "var(--text-color)" }}>
                                    <Paragraph style={{ color: "var(--text-color)" }}>
                                        {item.name || "Không có tên"}
                                    </Paragraph>
                                    <Paragraph style={{ color: "#FFD700" }}>
                                        {(item.price || 0).toLocaleString()} VND
                                    </Paragraph>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <InputNumber
                                        min={1}
                                        value={item.quantity || 1}
                                        onChange={(value) => updateQuantity(index, value)}
                                    />
                                    {item.type === "service" && (
                                        <Input
                                            value={item.date || ""}
                                            onChange={(e) => updateDate(index, e.target.value)}
                                            placeholder="Nhập ngày (YYYY-MM-DD)"
                                            style={{ width: 150 }}
                                        />
                                    )}
                                    <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
                                </div>
                            </div>
                        </Card>
                    ))}
                    {paymentMethod === "VietQR" && qrCodeUrl && (
                        <Card style={{ marginBottom: 16, background: "var(--table-bg)", textAlign: "center" }}>
                            <Title level={4} style={{ color: "var(--text-color)" }}>
                                Quét mã QR để thanh toán
                            </Title>
                            <img src={qrCodeUrl} alt="VietQR Code" style={{ width: 400, height: 400 }} />
                            <Paragraph style={{ color: "var(--text-color)" }}>
                                Sử dụng ứng dụng ngân hàng để quét mã QR.
                            </Paragraph>

                            {bankInfo && (
                                <div style={{ margin: "0 auto", width: "100%", maxWidth: "500px", textAlign: "left" }}>
                                    <Paragraph style={{ color: "var(--text-color)", textAlign: "left" }}>
                                        Hoặc chuyển khoản đến<br />
                                        SỐ TÀI KHOẢN: <span
                                            style={{
                                                fontWeight: "bold",
                                                backgroundColor: "#f0f0f0",
                                                padding: "2px 6px",
                                                marginLeft: 4,
                                                marginRight: 8,
                                                borderRadius: 4,
                                                cursor: "pointer"
                                            }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(orderId.toUpperCase())
                                                message.success("Đã copy Số tài khoản");

                                            }}
                                            title="Nhấn để sao chép"
                                        >
                                            {bankInfo.accountNo}
                                        </span><br />
                                        <div style={{ marginTop: "3px" }}></div>
                                        MÃ GIAO DỊCH:
                                        <span
                                            style={{
                                                fontWeight: "bold",
                                                backgroundColor: "#f0f0f0",
                                                padding: "0px 6px",
                                                marginLeft: 4,
                                                marginRight: 8,
                                                borderRadius: 4,
                                                cursor: "pointer"
                                            }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(orderId.toUpperCase())
                                                message.success("Đã copy mã đơn hàng");

                                            }}
                                            title="Nhấn để sao chép"
                                        >
                                            {orderId.toUpperCase()}
                                        </span>
                                        <br />
                                        SỐ TIỀN:{" "}
                                        <strong style={{ color: "green", fontWeight: "bold", fontSize: "16px" }}>
                                            {new Intl.NumberFormat("vi-VN", {
                                                style: "currency",
                                                currency: "VND"
                                            }).format(total)}
                                        </strong>
                                        <br />
                                        NGÂN HÀNG: <strong>MB BANK </strong><br />
                                        CHỦ TÀI KHOẢN:{` `}
                                        <strong>{bankInfo.accountName}</strong>
                                    </Paragraph>
                                </div>

                            )}
                            <Paragraph style={{ color: "var(--text-color)" }}>
                                Đơn hàng sẽ hoàn tất sau khi thanh toán. Đang chờ xác nhận thanh toán...
                            </Paragraph>
                        </Card>
                    )}
                    <Card
                        style={{
                            position: "fixed",
                            bottom: 0,
                            left: 0,
                            width: "100%",
                            background: "var(--modal-bg)",
                            zIndex: 1000,
                            boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "calc(100% - 100px)",
                                margin: "0 auto",
                                padding: "10px 0",
                            }}
                        >
                            <span style={{ color: "var(--text-color)", fontSize: "16px", fontWeight: "bold" }}>
                                Tổng cộng: {total.toLocaleString()} VND
                            </span>
                            <Button type="primary" onClick={checkout} disabled={cart.length === 0}>
                                Thanh Toán
                            </Button>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

// CustomerLogin component (unchanged)
const CustomerLogin = () => {
    const { theme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const handleSubmit = async (values) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(values.email, values.password);
            const user = userCredential.user;

            const usersRef = db.collection("users");
            const querySnapshot = await usersRef.where("email", "==", values.email).get();

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                const storedHashedPassword = userData.password;

                const hashedPassword = sha256(values.password);
                if (hashedPassword !== storedHashedPassword) {
                    throw new Error("Mật khẩu không khớp với dữ liệu mã hóa!");
                }

                userData.uid = userDoc.id;
                userData.authUid = user.uid;

                localStorage.setItem("user", JSON.stringify(userData));
                message.success("Đăng nhập thành công!");
                navigate("/customer/home");
            } else {
                await auth.signOut();
                message.error("Thông tin người dùng không khớp trong hệ thống. Vui lòng kiểm tra lại hoặc đăng ký!");
            }
        } catch (error) {
            if (error.code === "auth/invalid-login-credentials") {
                message.error("Email hoặc mật khẩu không đúng. Vui lòng thử lại hoặc đăng ký nếu bạn chưa có tài khoản!");
            } else {
                console.error("Lỗi khi đăng nhập:", error);
                message.error("Có lỗi xảy ra: " + error.message);
            }
        }
    };

    return (
        <div style={{ padding: "40px 20px", background: "var(--background-color)", minHeight: "100vh" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <Title level={2} style={{ color: "var(--text-color)", textAlign: "center", marginBottom: 24 }}>
                    Đăng nhập
                </Title>
                <Card style={{ maxWidth: 600, margin: "0 auto", background: "var(--modal-bg)" }}>
                    <Form onFinish={handleSubmit} layout="vertical">
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, message: "Vui lòng nhập email!" }]}
                        >
                            <Input placeholder="Nhập email của bạn" />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
                        >
                            <Input.Password placeholder="Nhập mật khẩu" />
                        </Form.Item>
                        <Form.Item style={{ textAlign: "center" }}>
                            <Button type="primary" htmlType="submit" block>
                                Đăng nhập
                            </Button>
                        </Form.Item>
                        <div style={{ textAlign: "center" }}>
                            <a href="#" onClick={() => message.info("Tính năng quên mật khẩu chưa được triển khai.")}>
                                Quên mật khẩu?
                            </a>
                            <br />
                            <a onClick={() => navigate("/customer/register")}>Đăng ký tài khoản</a>
                        </div>
                    </Form>
                </Card>
            </div>
        </div>
    );
};

// CustomerRegister component (unchanged)
const CustomerRegister = () => {
    const { theme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [isEmailVerificationSent, setIsEmailVerificationSent] = useState(false);
    const [tempUser, setTempUser] = useState(null);

    const checkEmail = async (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            message.error("Định dạng email không hợp lệ");
            return false;
        }

        try {
            const signInMethods = await auth.fetchSignInMethodsForEmail(email);
            if (signInMethods.length > 0) {
                message.error("Email đã tồn tại trong hệ thống");
                return false;
            }
            return true;
        } catch (error) {
            console.error("Lỗi kiểm tra email:", error);
            message.error("Lỗi khi kiểm tra email: " + error.message);
            return false;
        }
    };

    const sendVerification = async () => {
        const values = form.getFieldsValue();
        const { email, password } = values;

        if (!email || !password) {
            message.error(
                "Vui lòng nhập email và mật khẩu trước khi gửi link xác thực!"
            );
            return;
        }

        if (!(await checkEmail(email))) return;

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(
                email,
                password
            );
            const user = userCredential.user;
            setTempUser(user);
            await user.sendEmailVerification();
            setIsEmailVerificationSent(true);

            const checkVerification = setInterval(async () => {
                try {
                    await user.reload();
                    if (user.emailVerified) {
                        clearInterval(checkVerification);
                        message.success("Email đã được xác thực!");
                    }
                } catch (error) {
                    console.error("Lỗi khi kiểm tra xác thực email:", error);
                }
            }, 2000);

            message.success(
                "Link xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra và nhấp vào link để xác thực!"
            );
        } catch (error) {
            console.error("Lỗi khi gửi link xác thực:", error);
            if (error.code === "auth/email-already-in-use") {
                message.error("Email đã tồn tại trong hệ thống");
            } else {
                message.error("Đã xảy ra lỗi: " + error.message);
            }
        }
    };

    const handleSubmit = async (values) => {
        if (!isEmailVerificationSent) {
            message.error(
                "Vui lòng nhấn 'Gửi link xác thực' và xác thực email trước khi đăng ký!"
            );
            return;
        }

        if (!tempUser) {
            message.error(
                "Không tìm thấy thông tin tài khoản. Vui lòng thử lại!"
            );
            return;
        }

        try {
            await tempUser.reload();
            if (!tempUser.emailVerified) {
                message.error(
                    "Email chưa được xác thực. Vui lòng kiểm tra email và nhấp vào link xác thực!"
                );
                return;
            }
        } catch (error) {
            console.error("Lỗi khi kiểm tra xác thực:", error);
            message.error(
                "Lỗi khi kiểm tra trạng thái xác thực: " + error.message
            );
            return;
        }

        const { fullname, email, phone, dob, gender, password, confirmPassword } =
            values;

        const dobRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dobRegex.test(dob)) {
            message.error("Ngày sinh phải có định dạng DD/MM/YYYY!");
            return;
        }

        const [day, month, year] = dob.split("/").map(Number);
        const dobDate = new Date(year, month - 1, day);
        if (
            isNaN(dobDate.getTime()) ||
            dobDate.getDate() !== day ||
            dobDate.getMonth() + 1 !== month ||
            dobDate.getFullYear() !== year ||
            year < 1900 ||
            dobDate > new Date()
        ) {
            message.error("Ngày sinh không hợp lệ!");
            return;
        }

        if (password !== confirmPassword) {
            message.error("Mật khẩu xác nhận không khớp!");
            return;
        }

        try {
            await db.collection("users").add({
                fullname,
                email,
                phone,
                dob,
                gender,
                role: "user",
                uid: tempUser.uid,
            });

            const userData = {
                fullname,
                email,
                phone,
                dob,
                gender,
                role: "user",
                uid: tempUser.uid,
            };
            localStorage.setItem("user", JSON.stringify(userData));

            message.success("Đăng ký thành công!");
            form.resetFields();
            setIsEmailVerificationSent(false);
            setTempUser(null);
            navigate("/customer/home");
        } catch (error) {
            console.error("Lỗi khi đăng ký:", error);
            message.error("Không thể đăng ký tài khoản. Vui lòng thử lại sau!");
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
                    Đăng ký
                </Title>
                <Card
                    style={{
                        maxWidth: 900,
                        margin: "0 auto",
                        background: "var(--modal-bg)",
                    }}
                >
                    <Form form={form} onFinish={handleSubmit} layout="vertical">
                        <div
                            style={{ display: "flex", gap: 24, flexWrap: "wrap" }}
                        >
                            <div style={{ flex: 1, minWidth: 300 }}>
                                <Form.Item
                                    name="fullname"
                                    label="Họ và tên"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Vui lòng nhập họ và tên!",
                                        },
                                    ]}
                                >
                                    <Input placeholder="Nhập họ và tên" />
                                </Form.Item>
                                <Form.Item
                                    name="phone"
                                    label="Số điện thoại"
                                    rules={[
                                        {
                                            required: true,
                                            message:
                                                "Vui lòng nhập số điện thoại!",
                                        },
                                    ]}
                                >
                                    <Input placeholder="Nhập số điện thoại" />
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
                            </div>
                            <div style={{ flex: 1, minWidth: 300 }}>
                                <Form.Item
                                    name="email"
                                    label="Email"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Vui lòng nhập email!",
                                        },
                                    ]}
                                >
                                    <Input placeholder="Nhập email của bạn" />
                                </Form.Item>
                                <Form.Item
                                    name="dob"
                                    label="Ngày sinh (DD/MM/YYYY)"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Vui lòng nhập ngày sinh!",
                                        },
                                    ]}
                                >
                                    <Input placeholder="VD: 15/03/2000" />
                                </Form.Item>
                                <Form.Item
                                    name="gender"
                                    label="Giới tính"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Vui lòng chọn giới tính!",
                                        },
                                    ]}
                                >
                                    <Select placeholder="Chọn giới tính">
                                        <Select.Option value="male">
                                            Nam
                                        </Select.Option>
                                        <Select.Option value="female">
                                            Nữ
                                        </Select.Option>
                                        <Select.Option value="other">
                                            Khác
                                        </Select.Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    name="confirmPassword"
                                    label="Xác nhận mật khẩu"
                                    rules={[
                                        {
                                            required: true,
                                            message:
                                                "Vui lòng xác nhận mật khẩu!",
                                        },
                                    ]}
                                >
                                    <Input.Password placeholder="Nhập lại mật khẩu" />
                                </Form.Item>
                            </div>
                        </div>
                        <Form.Item style={{ textAlign: "center" }}>
                            <Button
                                type="default"
                                onClick={sendVerification}
                                style={{ marginRight: 16 }}
                            >
                                Gửi link xác thực
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Đăng ký
                            </Button>
                        </Form.Item>
                        <div style={{ textAlign: "center" }}>
                            <a onClick={() => navigate("/customer/login")}>
                                Đã có tài khoản? Đăng nhập ngay
                            </a>
                        </div>
                    </Form>
                </Card>
            </div>
        </div>
    );
};

// CustomerProfile component (unchanged)
const CustomerProfile = () => {
    const { theme } = useContext(ThemeContext);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [userDocId, setUserDocId] = useState(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user && !isRedirecting) {
            message.destroy();
            message.error("Vui lòng đăng nhập để xem hồ sơ!");
            setIsRedirecting(true);
            navigate("/customer/login");
            return;
        }

        const fetchUserData = async () => {
            try {
                const userQuery = await db.collection("users").where("email", "==", user.email).get();
                if (!userQuery.empty) {
                    const userDoc = userQuery.docs[0];
                    const userData = userDoc.data();
                    setUserDocId(userDoc.id);
                    localStorage.setItem("user", JSON.stringify({ ...userData, uid: user.uid }));
                    form.setFieldsValue({
                        fullname: userData.fullname || "",
                        email: userData.email || user.email,
                        phone: userData.phone || "",
                        dob: userData.dob || "",
                        gender: userData.gender || "",
                    });
                } else {
                    const newUserData = {
                        uid: user.uid,
                        email: user.email,
                        fullname: "",
                        phone: "",
                        dob: "",
                        gender: "",
                        role: "user",
                    };
                    const docRef = await db.collection("users").add(newUserData);
                    setUserDocId(docRef.id);
                    localStorage.setItem("user", JSON.stringify(newUserData));
                    form.setFieldsValue(newUserData);
                }
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu người dùng:", error);
                message.error("Không thể tải thông tin người dùng: " + error.message);
            }
        };

        fetchUserData();
    }, [form, navigate, isRedirecting]);

    const handleSubmit = async (values) => {
        const user = auth.currentUser;
        if (!user) {
            message.error("Vui lòng đăng nhập để cập nhật hồ sơ!");
            return;
        }

        const { phone, dob } = values;

        const phoneRegex = /^\+?[1-9]\d{8,14}$/;
        if (!phoneRegex.test(phone)) {
            message.error("Số điện thoại không hợp lệ! Vui lòng nhập số hợp lệ (ví dụ: +84912345678)");
            return;
        }

        const dobRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dobRegex.test(dob)) {
            message.error("Ngày sinh phải có định dạng DD/MM/YYYY!");
            return;
        }

        const [day, month, year] = dob.split("/").map(Number);
        const dobDate = new Date(year, month - 1, day);
        if (
            isNaN(dobDate.getTime()) ||
            dobDate.getDate() !== day ||
            dobDate.getMonth() + 1 !== month ||
            dobDate.getFullYear() !== year ||
            year < 1900 ||
            dobDate > new Date()
        ) {
            message.error("Ngày sinh không hợp lệ!");
            return;
        }

        const updatedUser = {
            fullname: values.fullname,
            email: user.email,
            phone,
            dob,
            gender: values.gender,
            uid: user.uid,
        };

        try {
            if (userDocId) {
                await db.collection("users").doc(userDocId).set(updatedUser, { merge: true });
                const userDoc = await db.collection("users").doc(userDocId).get();
                const userData = { ...userDoc.data(), uid: user.uid };
                localStorage.setItem("user", JSON.stringify(userData));
                message.success("Thông tin đã được cập nhật!");
                form.setFieldsValue(updatedUser);
            } else {
                const newUserData = { ...updatedUser, role: "user" };
                const docRef = await db.collection("users").add(newUserData);
                setUserDocId(docRef.id);
                localStorage.setItem("user", JSON.stringify(newUserData));
                message.success("Thông tin đã được lưu!");
                form.setFieldsValue(updatedUser);
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật thông tin:", error);
            message.error("Lỗi khi cập nhật thông tin: " + error.message);
        }
    };

    const handleChangePassword = async (values) => {
        const user = auth.currentUser;
        if (!user) {
            message.error("Vui lòng đăng nhập để đổi mật khẩu!");
            navigate("/customer/login");
            return;
        }

        const { password, confirmPassword } = values;

        if (password && password.length < 6) {
            message.error("Mật khẩu phải có ít nhất 6 ký tự!");
            return;
        }

        if (password && password !== confirmPassword) {
            message.error("Mật khẩu xác nhận không khớp!");
            return;
        }

        if (password) {
            try {
                await user.updatePassword(password);
                message.success("Mật khẩu đã được cập nhật!");
                form.setFieldsValue({ password: "", confirmPassword: "" });
            } catch (error) {
                console.error("Lỗi khi cập nhật mật khẩu:", error);
                message.error("Lỗi khi cập nhật mật khẩu: " + error.message);
            }
        } else {
            message.info("Vui lòng nhập mật khẩu mới để thay đổi!");
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
                    Thông tin cá nhân
                </Title>
                <Card
                    style={{
                        maxWidth: 900,
                        margin: "0 auto",
                        background: "var(--modal-bg)",
                    }}
                >
                    <Form form={form} onFinish={handleSubmit} layout="vertical">
                        <div
                            style={{ display: "flex", gap: 24, flexWrap: "wrap" }}
                        >
                            <div style={{ flex: 1, minWidth: 300 }}>
                                <Form.Item
                                    name="fullname"
                                    label="Họ và tên"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Vui lòng nhập họ và tên!",
                                        },
                                    ]}
                                >
                                    <Input placeholder="Nhập họ và tên" />
                                </Form.Item>
                                <Form.Item
                                    name="phone"
                                    label="Số điện thoại"
                                    rules={[
                                        {
                                            required: true,
                                            message:
                                                "Vui lòng nhập số điện thoại!",
                                        },
                                    ]}
                                >
                                    <Input placeholder="Nhập số điện thoại" />
                                </Form.Item>
                                <Form.Item
                                    name="password"
                                    label="Mật khẩu mới"
                                >
                                    <Input.Password placeholder="Nhập mật khẩu mới" />
                                </Form.Item>
                            </div>
                            <div style={{ flex: 1, minWidth: 300 }}>
                                <Form.Item
                                    name="email"
                                    label="Email"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Vui lòng nhập email!",
                                        },
                                    ]}
                                >
                                    <Input disabled />
                                </Form.Item>
                                <Form.Item
                                    name="dob"
                                    label="Ngày sinh (DD/MM/YYYY)"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Vui lòng nhập ngày sinh!",
                                        },
                                    ]}
                                >
                                    <Input placeholder="VD: 15/03/2000" />
                                </Form.Item>
                                <Form.Item
                                    name="gender"
                                    label="Giới tính"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Vui lòng chọn giới tính!",
                                        },
                                    ]}
                                >
                                    <Select placeholder="Chọn giới tính">
                                        <Select.Option value="male">
                                            Nam
                                        </Select.Option>
                                        <Select.Option value="female">
                                            Nữ
                                        </Select.Option>
                                        <Select.Option value="other">
                                            Khác
                                        </Select.Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    name="confirmPassword"
                                    label="Xác nhận mật khẩu mới"
                                >
                                    <Input.Password placeholder="Xác nhận mật khẩu mới" />
                                </Form.Item>
                            </div>
                        </div>
                        <Form.Item style={{ textAlign: "center" }}>
                            <Button
                                type="default"
                                onClick={() =>
                                    handleChangePassword(form.getFieldsValue())
                                }
                                style={{ marginRight: 16 }}
                            >
                                Đổi mật khẩu
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Lưu thay đổi
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
        </div>
    );
};

// CustomerContact component (unchanged)
const CustomerContact = () => {
    const { theme } = useContext(ThemeContext);

    return (
        <div style={{ padding: "80px 50px", background: "var(--background-color)", minHeight: "100vh", textAlign: "center" }}>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Liên Hệ Chúng Tôi
            </Title>
            <Paragraph style={{ color: "var(--text-color)" }}>
                Hãy liên hệ với chúng tôi nếu bạn có bất kỳ câu hỏi hoặc cần hỗ trợ.
            </Paragraph>
            <Card style={{ maxWidth: 800, margin: "20px auto", background: "var(--modal-bg)" }}>
                <div style={{ marginBottom: "20px" }}>
                    <Paragraph style={{ color: "var(--text-color)" }}>
                        <i className="fas fa-university" style={{ marginRight: 10, color: "#FF8C00" }}></i> Sinh Viên Sư Phạm
                    </Paragraph>
                    <Paragraph style={{ color: "var(--text-color)" }}>
                        <i className="fas fa-map-marker-alt" style={{ marginRight: 10, color: "#FF8C00" }}></i> 459 Tôn Đức Thắng, Hòa Khánh Nam, quận Liên Chiểu, TP. Đà Nẵng
                    </Paragraph>
                    <Paragraph style={{ color: "var(--text-color)" }}>
                        <i className="fas fa-phone" style={{ marginRight: 10, color: "#FF8C00" }}></i> 0236.3.841.323
                    </Paragraph>
                    <Paragraph style={{ color: "var(--text-color)" }}>
                        <i className="fas fa-envelope" style={{ marginRight: 10, color: "#FF8C00" }}></i> <a href="mailto:contact@pethaven.com">contact@pethaven.com</a>
                    </Paragraph>
                </div>
                <div style={{ borderRadius: "10px", overflow: "hidden", boxShadow: "0 4px 8px rgba(255, 255, 255, 0.1)" }}>
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3834.070911670863!2d108.15885113064721!3d16.061809606530108!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314219247957db31%3A0x66e813ac01165274!2zNDU5IFTDtG4gxJDhu6ljIFRo4bqvbmcsIEhvw6AgS2jDoW5oIE5hbSwgTGnDqm4gQ2hp4buDdSwgxJDJoCBO4bq1bmcgNTUwMDAwLCBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1741845938489!5m2!1svi!2s"
                        width="100%"
                        height="400"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                </div>
            </Card>
        </div>
    );
};

// CustomerApp component (unchanged)
const CustomerApp = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(() => {
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (isLoading) return <Spin size="large" style={{ display: "block", margin: "50px auto" }} />;

    return (
        <div style={{ minHeight: "100vh", background: "var(--background-color)" }}>
            <CustomerNavbar />
            <Routes>
                <Route path="/home" element={<CustomerHome />} />
                <Route path="/services" element={<CustomerServices />} />
                <Route path="/foods" element={<CustomerFoods />} />
                <Route path="/cart" element={<CustomerCart />} />
                <Route path="/login" element={<CustomerLogin />} />
                <Route path="/register" element={<CustomerRegister />} />
                <Route path="/profile" element={<CustomerProfile />} />
                <Route path="/contact" element={<CustomerContact />} />
                <Route path="/history" element={<CustomerHistory />} />
                <Route path="*" element={<CustomerHome />} />
            </Routes>
        </div>
    );
};

// CustomerHistory component (unchanged)
const CustomerHistory = () => {
    const { theme } = useContext(ThemeContext);
    const [orders, setOrders] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            message.error("Vui lòng đăng nhập để xem lịch sử mua hàng!");
            navigate("/customer/login");
            return;
        }

        NProgress.start();
        const unsubscribe = db
            .collection("orders")
            .where("userId", "==", user.uid)
            .onSnapshot(
                (snapshot) => {
                    const orderData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    // Sắp xếp theo timestamp giảm dần (gần nhất lên trước)
                    const sortedOrders = orderData.sort((a, b) => {
                        const dateA = new Date(a.timestamp);
                        const dateB = new Date(b.timestamp);
                        return dateB - dateA; // Giảm dần
                    });
                    setOrders(sortedOrders);
                    NProgress.done();
                },
                (error) => {
                    console.error("Lỗi khi tải lịch sử mua hàng:", error);
                    message.error("Không thể tải lịch sử mua hàng: " + error.message);
                    NProgress.done();
                }
            );
        return () => {
            unsubscribe();
            NProgress.done();
        };
    }, [navigate]);

    const columns = [
        {
            title: "Thời gian đặt hàng",
            dataIndex: "timestamp",
            key: "timestamp",
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: "Sản phẩm",
            dataIndex: "items",
            key: "items",
            render: (items) => (
                <ul>
                    {items.map((item, index) => (
                        <li key={index}>
                            {item.name} (x{item.quantity})
                        </li>
                    ))}
                </ul>
            ),
        },
        {
            title: "Tổng tiền",
            dataIndex: "total",
            key: "total",
            render: (text) => `${text} VND`,
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
        },
    ];

    return (
        <div style={{ padding: "80px 50px", background: "var(--background-color)", minHeight: "100vh" }}>
            <Title level={2} style={{ color: "var(--text-color)" }}>
                Lịch sử mua hàng 📜
            </Title>
            <Paragraph style={{ color: "var(--text-color)" }}>
                Xem lại các đơn hàng bạn đã đặt!
            </Paragraph>
            {orders.length === 0 ? (
                <Paragraph style={{ color: "var(--text-color)" }}>
                    Bạn chưa có đơn hàng nào!
                </Paragraph>
            ) : (
                <Table
                    dataSource={orders}
                    columns={columns}
                    rowKey="id"
                    style={{ background: "var(--table-bg)" }}
                    pagination={false}
                />
            )}
        </div>
    );
};

export default CustomerApp;