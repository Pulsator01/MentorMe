import React, { useEffect, useRef } from 'react';

const WarpBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Set canvas to full container size
        const setCanvasSize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };

        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        // Star properties
        const stars = [];
        const numStars = 400; // Density of stars
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * canvas.width - centerX,
                y: Math.random() * canvas.height - centerY,
                z: Math.random() * canvas.width, // Depth
            });
        }

        const animate = () => {
            // Clear screen with slight fade for trail effect if desired, but pure clear is cleaner here
            ctx.fillStyle = '#020617'; // slate-950
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const speed = 8; // Speed of warp

            stars.forEach((star) => {
                // Move star closer
                star.z -= speed;

                // Reset star if it passes the viewer
                if (star.z <= 0) {
                    star.z = canvas.width;
                    star.x = Math.random() * canvas.width - centerX;
                    star.y = Math.random() * canvas.height - centerY;
                }

                // Projection
                const k = 128.0 / star.z; // Field of view
                const px = star.x * k + canvas.width / 2;
                const py = star.y * k + canvas.height / 2;

                // Previous position for streak (simple approximation based on speed)
                // As z gets smaller (closer), the streak length should increase
                const size = (1 - star.z / canvas.width) * 3;

                // Draw star
                const brightness = (1 - star.z / canvas.width);
                ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();

                // Draw streak/tail (optional, for speed feel)
                if (star.z < canvas.width * 0.8) {
                    const prevK = 128.0 / (star.z + speed * 2);
                    const prevPx = star.x * prevK + canvas.width / 2;
                    const prevPy = star.y * prevK + canvas.height / 2;

                    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.5})`;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(prevPx, prevPy);
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />;
};

export default WarpBackground;
