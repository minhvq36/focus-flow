# SESSIONS MEMORY (Lịch sử phát triển)

> File này lưu lịch sử các phiên làm việc với Claude Code. Quy tắc ghi/nén xem tại `CLAUDE.md` mục "SESSIONS MEMORY".
> - **Append**: Kết thúc phiên, thêm 1 entry mới — MỚI NHẤT LÊN TRÊN CÙNG.
> - **Format**: `## [YYYY-MM-DD] Session N: <tiêu đề>` → Vấn đề → Quyết định (`cũ -> mới`) → File ảnh hưởng → Trạng thái & bước tiếp theo.
> - **Squash**: Khi được yêu cầu, gộp các entry cũ và xoá thẳng tay phần đã bị ghi đè. Chỉ giữ quyết định CÒN HIỆU LỰC.
> - **Đọc lại**: Đầu phiên mới, đọc file này để nắm bối cảnh (khi user yêu cầu).
>
> Nguyên tắc: ghi **quyết định**, không ghi nhật ký thao tác. Không dán code, không kể lể quá trình.

---

## [2026-08-05] Session 1: Khởi tạo tài liệu vận hành

**Việc đã làm:** viết lại `README.md` (bản public, tiếng Anh, phục vụ portfolio) và tạo `CLAUDE.md` + file này.

**Chưa có quyết định kỹ thuật nào được thay đổi trong phiên này** — code không bị đụng tới.

**Nợ kỹ thuật đã ghi nhận (chi tiết ở `CLAUDE.md` mục 7):** CORS hardcode localhost; chưa có graceful shutdown; CI gọi `npm run type-check` không tồn tại; backend chưa có test; các module `session`/`social`/`ai`/`cronjob` còn là stub.

**Bước tiếp theo:** chốt hạng mục ưu tiên cho Phase 4 (Redis session cache + cronjob inactive penalty) hoặc dọn nợ kỹ thuật trước khi mở rộng tính năng.
