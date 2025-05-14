import React, { useState, useEffect, useContext } from "react";
import { Button, Typography, message, Tag } from "antd";
import CrudTable from "../components/CrudTable";
import CrudForm from "../components/CrudForm";
import { db } from "../firebase/firebaseConfig";
import { checkAdminAccess } from "../firebase/authUtils";
import { ThemeContext } from "../context/ThemeContext";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

const Orders = () => {
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
      const unsubscribe = db.collection("orders").onSnapshot(
        (snapshot) => {
          const orders = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          // Sort orders by timestamp in descending order (newest first)
          orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setData(orders);
          NProgress.done();
        },
        (error) => {
          console.error("Lỗi tải dữ liệu đơn hàng:", error);
          message.error("Không thể tải dữ liệu đơn hàng. Vui lòng thử lại sau!");
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
    {
      title: "Thời gian đặt hàng",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "Khách hàng",
      dataIndex: "userFullname",
      key: "userFullname",
    },
    {
      title: "Số điện thoại",
      dataIndex: "userPhone",
      key: "userPhone",
    },
    {
      title: "Sản phẩm/Dịch vụ",
      dataIndex: "items",
      key: "items",
      render: (items) => (
        <ul>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((item, index) => (
              <li key={index}>
                {item.name} (x{item.quantity})
              </li>
            ))
          ) : (
            <li>No items</li>
          )}
        </ul>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      render: (text) => `${parseInt(text).toLocaleString()} VND`,
    },
    {
      title: "Phương thức thanh toán",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (text) => {
        let color;
        switch (text) {
          case "Chờ xử lý":
            color = "blue";
            break;
          case "Đã thanh toán":
            color = "green";
            break;
          case "Đã hủy":
            color = "red";
            break;
          default:
            color = "default";
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  const fields = [
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      options: [
        { label: "Chờ xử lý", value: "Chờ xử lý" },
        { label: "Đã thanh toán", value: "Đã thanh toán" },
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
      if (editingRecord) {
        const orderRef = db.collection("orders").doc(editingRecord.id);
        const doc = await orderRef.get();
        if (!doc.exists) {
          message.error("Đơn hàng không còn tồn tại!");
          return;
        }
        await orderRef.update({
          status: values.status,
          updatedAt: new Date().toISOString(),
        });
        message.success("Cập nhật trạng thái đơn hàng thành công!");
      }
      setModalOpen(false);
      setEditingRecord(null);
    } catch (error) {
      console.error("Lỗi khi cập nhật đơn hàng:", error);
      message.error("Không thể cập nhật đơn hàng: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      message.error("Bạn không có quyền thực hiện hành động này!");
      return;
    }

    try {
      const orderRef = db.collection("orders").doc(id);
      const doc = await orderRef.get();
      if (!doc.exists) {
        message.error("Đơn hàng không còn tồn tại!");
        return;
      }
      await orderRef.delete();
      message.success("Xóa đơn hàng thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa đơn hàng:", error);
      message.error("Không thể xóa đơn hàng: " + error.message);
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
        Quản lý Đơn Hàng
      </Title>
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

export default Orders;