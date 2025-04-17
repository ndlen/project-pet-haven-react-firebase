// src/firebase/authUtils.js
import { message } from "antd";
import { db, auth } from "./firebaseConfig";

export const checkAdminAccess = async () => {
    const user = auth.currentUser;
    if (!user) return false; // Người dùng chưa đăng nhập

    try {
        const userRef = db.collection("users").where("email", "==", user.email);
        const querySnapshot = await userRef.get();
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            return userData.role === "admin"; // Kiểm tra vai trò
        }
        return false; // Không tìm thấy người dùng trong Firestore
    } catch (error) {
        console.error("Lỗi khi kiểm tra quyền admin:", error);
        message.error("Không thể kiểm tra quyền truy cập. Vui lòng thử lại sau!");
        return false; // Trả về false nếu có lỗi
    }
};

export const logout = () => {
    return auth.signOut();
};