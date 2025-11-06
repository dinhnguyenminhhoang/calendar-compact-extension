# 📅 Lịch Học & Làm Việc Pro - Compact Edition

Extension quản lý lịch chuyên nghiệp với giao diện tuần (Weekly Calendar View) được tối ưu để vừa khít trong popup.

## ✨ Cải Tiến Phiên Bản Mới

### 🎯 Giao Diện Compact
- **Kích thước tối ưu**: 800x550px - vừa khít popup extension
- **Không scroll**: Hiển thị toàn bộ trong một màn hình
- **Navigation nằm ngang**: Gọn gàng, tiết kiệm không gian
- **Slot nhỏ hơn**: Mỗi giờ chỉ 30px thay vì 45px
- **Cột ngày hẹp hơn**: 95px thay vì 110px

### 🚀 Tính Năng Chính

#### 📊 Xem Lịch Tuần
- Xem cả tuần (T2 - CN) trong một màn hình
- Hiển thị theo giờ từ 7:00 đến 22:00 (tùy chỉnh được)
- Sự kiện dạng block màu sắc trực quan
- Đường thời gian hiện tại màu đỏ

#### ➕ Thêm Sự Kiện
- Click vào ô trống để tạo nhanh
- Tự động điền giờ bắt đầu/kết thúc
- Phân loại: Lịch học / Lịch làm việc
- 6 màu sắc đẹp mắt
- Nhắc nhở 5-15-30 phút hoặc 1 giờ/1 ngày trước

#### 🔄 Lặp Lại Sự Kiện
- Lặp lại hàng tuần đến ngày chỉ định
- Chọn các thứ cụ thể (T2, T3, T4...)
- Tự động tạo nhiều sự kiện

#### ✏️ Quản Lý
- Click sự kiện → Xem popup chi tiết
- Sửa/Xóa dễ dàng
- Xuất/Nhập dữ liệu JSON
- Thống kê chi tiết

## 📦 Cài Đặt

### Bước 1: Chuẩn Bị Icon
Thêm 3 file icon vào thư mục `icons/`:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px)  
- `icon128.png` (128x128px)

### Bước 2: Cài Vào Chrome
1. Mở Chrome: `chrome://extensions/`
2. Bật **Developer mode**
3. Click **Load unpacked**
4. Chọn thư mục extension
5. Xong!

## 🎨 Kích Thước Tối Ưu

```
Body: 800x550px
Navigation: 48px height
Calendar: 502px height
Time Column: 50px width
Day Columns: 95px width each
Hour Slots: 30px height
```

## 🔧 Cấu Trúc File

```
calendar-extension/
├── manifest.json          # Cấu hình extension
├── calendar.html          # Giao diện compact
├── calendar.js            # Logic quản lý
├── calendar.css           # Styling tối ưu
├── background.js          # Background service
├── icons/                 # Icons extension
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # Hướng dẫn
```

## 💡 Hướng Dẫn Sử Dụng

### Thêm Sự Kiện Nhanh
1. **Click vào ô giờ trống** trong lịch
2. Form tự động mở với giờ đã điền
3. Nhập tiêu đề → Lưu

### Thêm Sự Kiện Lặp Lại
1. Click **➕** hoặc click ô trống
2. Chọn **Ngày bắt đầu**
3. Chọn **Lặp lại đến ngày**
4. Chọn **các thứ** muốn lặp (T2, T3...)
5. Lưu → Tạo nhiều sự kiện tự động

### Xem & Sửa
- **Click sự kiện** → Popup chi tiết
- **✏️ Sửa** → Chỉnh sửa
- **🗑️ Xóa** → Xóa sự kiện

### Điều Hướng
- **◀ ▶** - Tuần trước/sau
- **Hôm nay** - Về tuần hiện tại

### Cài Đặt ⚙️
- Đổi giờ hiển thị (6:00-24:00)
- Bật/tắt thông báo
- Xuất/Nhập dữ liệu
- Xem thống kê

## 🎨 Màu Sắc

- 🟣 Tím (#8b5cf6)
- 🔴 Hồng (#ec4899)  
- 🔵 Xanh ngọc (#06b6d4)
- 🟢 Xanh lá (#10b981)
- 🟠 Cam (#f59e0b)
- 🔴 Đỏ (#ef4444)

## 💾 Lưu Trữ

- Lưu local trên máy
- Không cần internet
- Xuất/Nhập để backup
- Tự động lưu

## 🔔 Nhắc Nhở

- Thông báo desktop
- Tùy chỉnh thời gian nhắc
- Bật/tắt trong Settings

## 📊 So Sánh Với Phiên Bản Cũ

| Tính năng | Cũ (v2.2) | Mới (v2.3) |
|-----------|-----------|------------|
| Kích thước | 1100x800px | 800x550px |
| Scroll | Có | Không |
| Navigation | 2 dòng | 1 dòng |
| Slot height | 45px | 30px |
| Day width | 110px | 95px |
| Compact | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🐛 Khắc Phục Lỗi

### Extension không hiển thị đúng
- Kiểm tra kích thước popup: 800x550px
- Reload extension
- Xóa cache browser

### Sự kiện bị che khuất
- Giảm số giờ hiển thị trong Settings
- VD: 7:00-20:00 thay vì 7:00-22:00

### Scroll vẫn xuất hiện
- Kiểm tra CSS: `overflow: hidden`
- Kiểm tra body height: 550px

## 📱 Tương Thích

- Chrome 88+
- Edge 88+
- Brave Browser
- Opera (Chromium)

## 🚀 Tính Năng Tương Lai

- [ ] Kéo thả sự kiện
- [ ] Resize chiều cao sự kiện
- [ ] Import từ Google Calendar
- [ ] Export to ICS
- [ ] Dark mode
- [ ] Tìm kiếm sự kiện

## 📄 License

MIT License

---

**Quản lý thời gian hiệu quả với giao diện compact! 🎉**

Made with ❤️ - Version 2.3.0
# calendar-compact-extension
