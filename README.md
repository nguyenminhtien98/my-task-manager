# Trình quản lý tác vụ của tôi

Đây là một ứng dụng quản lý tác vụ toàn diện được xây dựng bằng Next.js, Appwrite và các công nghệ hiện đại khác. Nó cung cấp một nền tảng cộng tác, thời gian thực để quản lý các dự án và nhiệm vụ.

## Tính năng

### Quản lý công việc

- **Bảng Kanban:** Một bảng Kanban trực quan và tương tác để quản lý các nhiệm vụ, với các cột cho "Danh sách", "Đang thực hiện", "Hoàn thành", "Đã hoàn thành" và "Lỗi".
- **Kéo và thả:** Dễ dàng di chuyển các nhiệm vụ giữa các cột bằng giao diện kéo và thả mượt mà.
- **Tạo và chỉnh sửa nhiệm vụ:** Tạo các nhiệm vụ mới với tiêu đề, mô tả, người được giao, ngày bắt đầu và ngày kết thúc, số giờ dự đoán, loại sự cố và mức độ ưu tiên. Chỉnh sửa các nhiệm vụ hiện có để giữ cho chúng được cập nhật.
- **Chi tiết nhiệm vụ:** Xem thông tin chi tiết cho từng nhiệm vụ, bao gồm lịch sử, nhận xét và tệp đính kèm.
- **Loại sự cố và mức độ ưu tiên:** Phân loại nhiệm vụ theo loại sự cố (Lỗi, Cải tiến hoặc Tính năng) và đặt mức độ ưu tiên của chúng (Cao, Trung bình hoặc Thấp).
- **Bộ lọc nâng cao:** Bộ lọc phía máy chủ cho phép lọc nhiệm vụ theo trạng thái phân công (không có người nhận, của tôi, theo thành viên), ngày kết thúc (không có, quá hạn), mức độ ưu tiên và loại Issue (Feature/Bug/Improvement). Bộ lọc nằm ngay trên header dự án và áp dụng ngay khi chọn.

### Quản lý dự án

- **Tổ chức dự án:** Nhóm các nhiệm vụ vào các dự án để giữ cho công việc của bạn được ngăn nắp.
- **Vai trò dự án:** Mỗi dự án có một "trưởng nhóm" có toàn quyền kiểm soát và "thành viên" có các quyền tiêu chuẩn.
- **Trạng thái dự án:** Các dự án có thể "hoạt động" hoặc "đã đóng". Các dự án đã đóng ở chế độ chỉ đọc.
- **Cộng tác trong thời gian thực:** Tất cả các thay đổi đối với nhiệm vụ và dự án đều được cập nhật trong thời gian thực cho tất cả các thành viên trong nhóm.

### Tính năng người dùng và giao tiếp

- **Xác thực người dùng:** Hệ thống đăng ký và đăng nhập người dùng an toàn.
- **Trò chuyện và phản hồi:** Một tiện ích phản hồi tích hợp cho phép người dùng giao tiếp với quản trị viên. Ngoài ra còn có tính năng trò chuyện giữa các thành viên trong các dự án.
- **Thông báo:** Luôn cập nhật thông tin với một hệ thống thông báo toàn diện cảnh báo bạn về các sự kiện quan trọng, chẳng hạn như phân công nhiệm vụ, cập nhật và nhận xét mới.
- **Tải lên tệp:** Đính kèm tệp, hình ảnh và video vào nhiệm vụ. Các tệp được lưu trữ an toàn trên Cloudinary.

### Kiểm duyệt và bảo mật

- **Kiểm duyệt người dùng:** Ứng dụng bao gồm một hệ thống kiểm duyệt để ngăn chặn thư rác và lạm dụng, đảm bảo một môi trường an toàn và hiệu quả.
- **Quyền dựa trên vai trò:** Các vai trò người dùng khác nhau (ví dụ: "trưởng nhóm", "người dùng") có các cấp độ truy cập và kiểm soát khác nhau.

## Ngăn xếp công nghệ

- **Giao diện người dùng:** [Next.js](https://nextjs.org/) (khung React)
- **Phụ trợ:** [Appwrite](https://appwrite.io/)
- **Lưu trữ tệp:** [Cloudinary](https://cloudinary.com/)
- **Tạo kiểu:** [Tailwind CSS](https://tailwindcss.com/)
- **Kéo và thả:** [dnd-kit](https://dndkit.com/)
- **Thông báo:** [React Hot Toast](https://react-hot-toast.com/)

## Bắt đầu

Đầu tiên, hãy chạy máy chủ phát triển:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Mở [http://localhost:3000](http://localhost:3000) bằng trình duyệt của bạn để xem kết quả.

Bạn có thể bắt đầu chỉnh sửa trang bằng cách sửa đổi `app/page.tsx`. Trang tự động cập nhật khi bạn chỉnh sửa tệp.
