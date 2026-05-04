"use client";

import { useEffect, useRef } from "react";

export function BackgroundCurves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Resize canvas fit với màn hình
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener("resize", handleResize);
    handleResize();

    // Hàm vẽ 1 đường sóng
    const drawWave = (
      amplitude: number,    // Độ cao của sóng
      frequency: number,    // Tần số (độ dãn của sóng)
      phaseOffset: number,  // Độ lệch pha
      speed: number,        // Tốc độ di chuyển
      opacity: number,      // Độ mờ
      isDotted: boolean,    // Là nét đứt hay nét liền
      color: string = "255, 255, 255", // Màu RGB
      yOffset = 0           // Độ lệch trục Y
    ) => {
      ctx.beginPath();
      ctx.lineWidth = isDotted ? 1 : 1.5;
      
      // Sử dụng tham số color
      ctx.strokeStyle = `rgba(${color}, ${opacity})`; 
      
      // Tạo hiệu ứng phát sáng nhẹ (Glow effect)
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${color}, 0.8)`;

      if (isDotted) {
        ctx.setLineDash([2, 6]); // Chiều dài dấu chấm, khoảng cách
      } else {
        ctx.setLineDash([]); // Nét liền
      }

      for (let x = 0; x <= canvas.width; x += 5) {
        // Công thức tính đồ thị hình sin
        const y =
          Math.sin(x * frequency + time * speed + phaseOffset) * amplitude +
          canvas.height / 2 +
          yOffset;
          
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Vòng lặp Animation
    const render = () => {
      // Xóa frame cũ (dùng clearRect thay vì fillRect để thấy màu nền CSS)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      // 1. Đường nét liền chính giữa (rõ nhất) - TRẮNG
      drawWave(120, 0.002, 0, 1.5, 0.9, false, "255, 255, 255");

      // 2. Tạo cụm các đường nét liền mờ hơn tạo hiệu ứng "Dải lụa" (Ribbon)
      for (let i = 1; i <= 4; i++) {
        drawWave(120 - i * 5, 0.002, 0, 1.5, 0.5 - i * 0.1, false, "255, 255, 255", i * 6);
        drawWave(120 + i * 5, 0.002, 0, 1.5, 0.5 - i * 0.1, false, "255, 255, 255", -i * 6);
      }

      // 3. Các đường nét đứt (Dotted streams) bay lượn xung quanh - MÀU KHÁC NHAU
      drawWave(180, 0.0015, Math.PI, 1.2, 0.7, true, "168, 85, 247"); // TÍM
      drawWave(150, 0.0025, Math.PI / 2, 2.0, 0.5, true, "59, 130, 246", 30); // XANH
      drawWave(220, 0.001, Math.PI / 1.5, 1.0, 0.4, true, "236, 72, 153", -40); // HỒNG

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Cleanup khi component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Lưu ý: Tôi đổi z-50 thành z-[-1] vì đây là Background. 
      // Nếu bạn để z-50, nó sẽ đè lên che mất mọi nút bấm/chữ viết của bạn.
      // Background color #f3fbe6 được set cứng ở inline style.
      className="pointer-events-none fixed inset-0 z-[-1] h-full w-full"
      style={{ backgroundColor: "#f3fbe6" }}
    />
  );
}