"use client";

import { useEffect, useRef } from "react";

export function BackgroundCurves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const timeRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  
  // Ref theo dõi trạng thái thanh cuộn
  const isScrollableRef = useRef(false);
  // Biến t (từ 0 đến 1) để tạo hiệu ứng chuyển đổi mượt mà giữa 2 trạng thái
  const modeTransitionRef = useRef(0); 
  
  const isPausedRef = useRef(false);
  useEffect(() => {
    // Lắng nghe event từ Modal
    const handlePause = (e: any) => { isPausedRef.current = e.detail.paused; };
    window.addEventListener("toggle-bg", handlePause);
    return () => window.removeEventListener("toggle-bg", handlePause);
  },[]);

  // ─── 1. BỘ THEO DÕI THANH CUỘN ───────────────────────────────────────────
  useEffect(() => {
    const checkScrollbar = () => {
      // Check xem nội dung có dài hơn màn hình không
      const hasScrollbar = document.documentElement.scrollHeight > window.innerHeight + 5;
      isScrollableRef.current = hasScrollbar;
    };

    checkScrollbar();
    const resizeObserver = new ResizeObserver(checkScrollbar);
    resizeObserver.observe(document.body);
    window.addEventListener("resize", checkScrollbar);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkScrollbar);
    };
  }, []);

  // ─── 2. VÒNG LẶP RENDER VÀ CANVAS ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); 
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Hàm vẽ sóng (Đã nhận tham số stepSize để điều chỉnh độ chi tiết)
    const drawWave = (
      amplitude: number,
      frequency: number,
      phaseOffset: number,
      speed: number,
      opacity: number,
      isDotted: boolean,
      stepSize: number, // Param điều chỉnh Perf
      color: string = "255, 255, 255",
      yOffset = 0
    ) => {
      ctx.beginPath();
      ctx.lineWidth = isDotted ? 1 : 1.5;
      ctx.strokeStyle = `rgba(${color}, ${opacity})`;

      if (isDotted) ctx.setLineDash([2, 6]);
      else ctx.setLineDash([]);

      const halfHeight = window.innerHeight / 2;
      const timeSpeed = timeRef.current * speed;
      
      // Vòng lặp quyết định độ nặng của frame. stepSize càng lớn chạy càng nhẹ
      for (let x = 0; x <= window.innerWidth + stepSize; x += stepSize) {
        const y = Math.sin(x * frequency + timeSpeed + phaseOffset) * amplitude + halfHeight + yOffset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const renderLoop = () => {
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
      if (isPausedRef.current) return; 
      // Tính toán Lerp (Linear Interpolation) để chuyển đổi cực mượt
      // Nếu có cuộn -> target = 1. Không cuộn -> target = 0
      const targetMode = isScrollableRef.current ? 1 : 0;
      modeTransitionRef.current += (targetMode - modeTransitionRef.current) * 0.05;
      const t = modeTransitionRef.current; // t chạy mượt mà giữa 0 và 1

      // 1. TỐI ƯU TỐC ĐỘ: t=0 -> 0.01 (Nhanh), t=1 -> 0.004 (Chậm lại 60%)
      const timeIncrement = 0.01 - (0.006 * t); 
      timeRef.current += timeIncrement;

      // 2. TỐI ƯU DENSITY: t=0 -> 8px (Nét căng), t=1 -> 20px (Giảm 60% vòng lặp CPU)
      const stepSize = Math.max(10, Math.floor(8 + (12 * t)));

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // --- VẼ TOÀN BỘ SÓNG NHƯ CŨ (KHÔNG BỎ ĐƯỜNG NÀO) ---
      
      // Đường nét liền chính giữa (rõ nhất)
      drawWave(120, 0.002, 0, 1.5, 0.9, false, stepSize, "255, 255, 255");

      // Cụm 8 đường nét liền mờ hơn (Dải lụa)
      for (let i = 1; i <= 4; i++) {
        drawWave(120 - i * 5, 0.002, 0, 1.5, 0.5 - i * 0.1, false, stepSize, "255, 255, 255", i * 6);
        drawWave(120 + i * 5, 0.002, 0, 1.5, 0.5 - i * 0.1, false, stepSize, "255, 255, 255", -i * 6);
      }

      // 3 đường nét đứt (Streams bay lượn)
      drawWave(180, 0.0015, Math.PI, 1.2, 0.7, true, stepSize, "168, 85, 247"); // Tím
      drawWave(150, 0.0025, Math.PI / 2, 2.0, 0.5, true, stepSize, "59, 130, 246", 30); // Xanh
      drawWave(220, 0.001, Math.PI / 1.5, 1.0, 0.4, true, stepSize, "236, 72, 153", -40); // Hồng

    };

    renderLoop();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[0] h-full w-full"
      style={{
        // 2 Thuộc tính thần thánh cứu sống Scroll Performance
        willChange: "transform",
        contain: "layout paint size",
        transform: "translateZ(0)"
      }}
    />
  );
}