import React from "react";
import { Table, Button, Popconfirm, Image } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

const CrudTable = ({ data, columns, onEdit, onDelete, rowKey = "id" }) => {
    const actionColumn = {
        title: "Hành động",
        key: "action",
        render: (_, record) => (
            <span>
                <Button
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                    style={{ marginRight: 8 }}
                />
                <Popconfirm
                    title="Bạn có chắc chắn muốn xóa?"
                    onConfirm={() => onDelete(record[rowKey])}
                >
                    <Button icon={<DeleteOutlined />} danger />
                </Popconfirm>
            </span>
        ),
    };

    return (
        <Table
            dataSource={data}
            columns={[...columns, actionColumn]}
            rowKey={rowKey}
            pagination={{ pageSize: 10 }}
        />
    );
};

export default CrudTable;