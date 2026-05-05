"use client";

import { useEffect, useRef } from "react";

export function BackgroundCurves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true }); // Tối ưu hóa render transparent
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Xử lý Resize và Device Pixel Ratio (Chống mờ trên màn Retina, tối ưu GPU)
    const handleResize = () => {
      // Giới hạn pixel ratio ở mức 2 để màn 4K/3K không bị lag
      const dpr = Math.min(window.devicePixelRatio || 1, 2); 
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Hàm vẽ 1 đường sóng - Đã tối ưu Math
    const drawWave = (
      amplitude: number,
      frequency: number,
      phaseOffset: number,
      speed: number,
      opacity: number,
      isDotted: boolean,
      color: string = "255, 255, 255",
      yOffset = 0
    ) => {
      ctx.beginPath();
      ctx.lineWidth = isDotted ? 1 : 1.5;
      ctx.strokeStyle = `rgba(${color}, ${opacity})`;

      // BỎ shadowBlur Ở ĐÂY để tiết kiệm 80% sức mạnh GPU.
      // Sự xếp chồng của các dải lụa đã tự tạo ra hiệu ứng nổi/phát sáng.

      if (isDotted) {
        ctx.setLineDash([2, 6]);
      } else {
        ctx.setLineDash([]);
      }

      // Tối ưu: Đưa các phép tính cố định ra ngoài vòng lặp
      const halfHeight = window.innerHeight / 2;
      const timeSpeed = time * speed;
      
      // Tối ưu: Tăng step nhảy từ 5 lên 8. Mắt thường không nhận ra sự khác biệt
      // nhưng giảm được 40% vòng lặp, cứu sống CPU đáng kể.
      for (let x = 0; x <= window.innerWidth; x += 8) {
        const y =
          Math.sin(x * frequency + timeSpeed + phaseOffset) * amplitude +
          halfHeight +
          yOffset;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Vòng lặp Animation
    const render = () => {
      // Xóa khung hình cũ (trong suốt)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      
      time += 0.01;

      // 1. Đường nét liền chính giữa (rõ nhất) - TRẮNG
      drawWave(120, 0.002, 0, 1.5, 0.9, false, "255, 255, 255");

      // 2. Cụm các đường nét liền mờ hơn tạo hiệu ứng "Dải lụa"
      for (let i = 1; i <= 4; i++) {
        drawWave(120 - i * 5, 0.002, 0, 1.5, 0.5 - i * 0.1, false, "255, 255, 255", i * 6);
        drawWave(120 + i * 5, 0.002, 0, 1.5, 0.5 - i * 0.1, false, "255, 255, 255", -i * 6);
      }

      // 3. Các đường nét đứt (Dotted streams) - MÀU KHÁC NHAU
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
      // Đã bỏ thuộc tính style backgroundColor ở đây.
      // Giờ canvas sẽ hoàn toàn trong suốt, làm nổi bật CSS gradient blob của bạn.
      className="pointer-events-none fixed inset-0 z-[-1] h-full w-full"
    />
  );
}