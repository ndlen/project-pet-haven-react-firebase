import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Button } from "antd";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

const CrudForm = ({ open, onCancel, onSubmit, initialValues, fields }) => {
    const [formValues, setFormValues] = useState(initialValues || {});
    const [loading, setLoading] = useState(false);

    // Reset formValues khi modal được mở
    useEffect(() => {
        if (open) {
            setFormValues(initialValues || {});
        }
    }, [open, initialValues]);

    // Cập nhật giá trị của một trường khi người dùng nhập
    const handleFieldChange = (name, value) => {
        setFormValues((prevValues) => ({
            ...prevValues,
            [name]: value,
        }));
    };

    // Đảm bảo reset formValues khi đóng modal
    const handleCancel = () => {
        setFormValues({});
        onCancel();
    };

    const handleSubmit = async () => {
        setLoading(true);
        NProgress.start();
        try {
            await onSubmit(formValues);
            setFormValues({}); // Reset formValues sau khi submit thành công
        } finally {
            setLoading(false);
            NProgress.done();
        }
    };

    return (
        <Modal
            open={open}
            title={initialValues && Object.keys(initialValues).length ? "Sửa Dữ Liệu" : "Thêm Dữ Liệu"}
            onCancel={handleCancel}
            footer={null}
        >
            <div style={{ display: "flex", gap: "15px", flexDirection: "column" }}>
                {fields.map((field) => (
                    <div key={field.name}>
                        <span>{field.label}</span>
                        {field.type === "select" ? (
                            <Select
                                value={formValues[field.name] || undefined}
                                onChange={(value) => handleFieldChange(field.name, value)}
                                options={field.options}
                                style={{ width: "100%" }}
                            />
                        ) : field.type === "date" ? (
                            <Input
                                placeholder="Nhập ngày (YYYY-MM-DD, ví dụ: 2025-04-20)"
                                value={formValues[field.name] || ""}
                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                style={{ width: "100%" }}
                            />
                        ) : (
                            <Input
                                type={field.type || "text"}
                                value={formValues[field.name] || ""}
                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            />
                        )}
                    </div>
                ))}
                <div style={{ marginTop: 16 }}>
                    <Button type="primary" onClick={handleSubmit} disabled={loading}>
                        Lưu
                    </Button>
                    <Button
                        style={{ marginLeft: 8 }}
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        Hủy
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default CrudForm;