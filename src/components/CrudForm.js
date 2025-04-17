import React, { useState } from "react";
import { Modal, Form, Input, Select, Button } from "antd";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

const CrudForm = ({ open, onCancel, onSubmit, initialValues, fields }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);
        NProgress.start();
        try {
            await onSubmit(values);
        } finally {
            setLoading(false);
            NProgress.done();
        }
    };

    return (
        <Modal
            open={open}
            title={initialValues ? "Sửa Dữ Liệu" : "Thêm Dữ Liệu"}
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}
            footer={null}
        >
            <Form
                form={form}
                initialValues={initialValues}
                onFinish={handleSubmit}
                layout="vertical"
            >
                {fields.map((field) => (
                    <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={field.rules || [{ required: true, message: `Vui lòng nhập ${field.label}` }]}
                    >
                        {field.type === "select" ? (
                            <Select options={field.options} />
                        ) : field.type === "date" ? (
                            <Input
                                placeholder="Nhập ngày (YYYY-MM-DD, ví dụ: 2025-04-20)"
                                style={{ width: "100%" }}
                            />
                        ) : (
                            <Input type={field.type || "text"} />
                        )}
                    </Form.Item>
                ))}
                <Form.Item>
                    <Button type="primary" htmlType="submit" disabled={loading}>
                        Lưu
                    </Button>
                    <Button
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                            form.resetFields();
                            onCancel();
                        }}
                        disabled={loading}
                    >
                        Hủy
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default CrudForm;