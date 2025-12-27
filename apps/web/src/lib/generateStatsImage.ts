interface StatsData {
  rank?: string;
  totalVolume: string;
  pnl: string;
  roi: string;
  numberOfTxns: string;
  walletAddress?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface GenerateImageOptions {
  stats: StatsData;
  logoUrl?: string;
  backgroundImageUrl?: string;
}


export async function generateStatsImage({
  stats,
  logoUrl = "/anthe-logo.png",
  backgroundImageUrl,
}: GenerateImageOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Set canvas size - compact, professional aspect ratio
      const width = 900;
      const padding = { top: 40, right: 45, bottom: 0, left: 45 };
      const contentWidth = width - padding.left - padding.right;
      // Initial height - will be adjusted at the end to remove empty space
      let height = 480;
      canvas.width = width;
      canvas.height = height;

      // Premium professional color palette - Darker, more aesthetic
      const colors = {
        bg: "#050709", // Darker background
        overlay: "rgba(5, 7, 9, 0.95)", // Darker overlay
        card: "rgba(15, 20, 30, 0.9)", // Darker cards
        cardBorder: "rgba(148, 163, 184, 0.08)", // Subtler border
        cardGlow: "rgba(59, 130, 246, 0.06)", // Subtler glow
        text: "#ffffff",
        textSecondary: "#e2e8f0",
        muted: "#94a3b8",
        accent: "#3B82F6",
        accentLight: "#60a5fa",
        negative: "#f87171", // Softer, more professional red
        positive: "#34d399", // Softer, more professional green
        shadow: "rgba(0, 0, 0, 0.6)", // Deeper shadows
        divider: "rgba(148, 163, 184, 0.08)", // Subtler divider
        // Enhanced candlestick colors - darker, more subtle
        candleGreen: "rgba(52, 211, 153, 0.4)",
        candleRed: "rgba(248, 113, 113, 0.4)",
        candleGreenBody: "rgba(16, 185, 129, 0.5)",
        candleRedBody: "rgba(239, 68, 68, 0.5)",
        volumeGreen: "rgba(52, 211, 153, 0.15)",
        volumeRed: "rgba(248, 113, 113, 0.15)",
        maLine: "rgba(59, 130, 246, 0.35)",
        supportResistance: "rgba(203, 213, 225, 0.2)",
      };

      // Convert image URL to data URL to avoid CORS tainted canvas issues
      const imageToDataURL = async (url: string): Promise<string | null> => {
        try {
          if (url.startsWith("data:")) return url;
          
          const isRelative = url.startsWith("/");
          const isSameOrigin = typeof window !== "undefined" && url.startsWith(window.location.origin);
          
          if (isRelative || isSameOrigin) {
            return null;
          }

          try {
            const response = await fetch(url, { mode: "cors" });
            if (!response.ok) return null;
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch (fetchError) {
            return null;
          }
        } catch (error) {
          return null;
        }
      };

      // Load image element
      const loadImage = async (url: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          const isExternal = url.startsWith("http") && 
            (typeof window === "undefined" || !url.startsWith(window.location.origin));
          
          if (isExternal) {
            imageToDataURL(url).then((dataURL) => {
              const img = new Image();
              
              if (dataURL) {
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = dataURL;
              } else {
                console.warn("Cannot load external image due to CORS, skipping:", url);
                resolve(null);
              }
            });
          } else {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
          }
        });
      };

      // Draw background gradient (no Unsplash)
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, "#050709");
      bgGradient.addColorStop(0.3, "#080a0d");
      bgGradient.addColorStop(0.7, "#080a0d");
      bgGradient.addColorStop(1, "#050709");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      Promise.all([
        logoUrl ? loadImage(logoUrl) : Promise.resolve(null),
        stats.avatarUrl ? loadImage(stats.avatarUrl) : Promise.resolve(null),
      ]).then(([logoImg, avatarImg]) => {

        // Draw comprehensive trading background with multiple elements
        drawTradingBackground(ctx, width, height, colors);

        // User profile section - Top Left (ensure it shows properly)
        const avatarSize = 68; // Slightly bigger to ensure visibility
        const avatarX = padding.left;
        const avatarY = padding.top;
        
        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
          // Draw circular avatar with glow
          ctx.save();
          ctx.shadowColor = colors.accent + "40";
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
          );
          ctx.clip();
          ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
          ctx.restore();
          
          // Avatar border with glow
          ctx.beginPath();
          ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          // Fallback: Draw placeholder circle if avatar fails to load
          ctx.beginPath();
          ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = colors.card;
          ctx.fill();
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // User name - Premium typography (Top Left) - Properly aligned with avatar
        if (stats.displayName) {
          // Calculate vertical center alignment with avatar
          const nameY = avatarY + avatarSize / 2 - 20; // Center align with avatar
          
          ctx.fillStyle = colors.text;
          ctx.font = "700 28px 'Inter', 'SF Pro Display', system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(stats.displayName, avatarX + avatarSize + 20, nameY);
          
          // Username - Slightly dimmed, properly spaced
          if (stats.username) {
            ctx.fillStyle = "rgba(203, 213, 225, 0.7)";
            ctx.font = "600 17px 'Inter', 'SF Pro Text', system-ui, sans-serif";
            ctx.textBaseline = "top";
            ctx.fillText(`@${stats.username}`, avatarX + avatarSize + 20, nameY + 34);
          }
        }

        // Divider line under header
        const headerBottom = avatarY + avatarSize + 20;
        ctx.strokeStyle = colors.divider;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, headerBottom);
        ctx.lineTo(width - padding.right, headerBottom);
        ctx.stroke();

        // Logo - Top Right (bigger)
        const logoSize = 52; // Increased from 40 to 52 (30% bigger)
        const logoY = padding.top;
        let logoWidth = 0;
        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
          const logoAspectRatio = logoImg.width / logoImg.height;
          logoWidth = logoSize * logoAspectRatio;
          ctx.drawImage(logoImg, width - padding.right - logoWidth, logoY, logoWidth, logoSize);
        }

        // Stats grid - Professional 2x2 layout (optimized for reduced height)
        const cardSpacing = 20;
        const cardHeight = 130; // Reduced for compact design
        const cardWidth = (contentWidth - cardSpacing) / 2;
        let gridY = headerBottom + 24; // Tighter spacing

        // Row 1: No. of txns, ROI
        const row1Cards = [
          {
            label: "No. of txns",
            value: stats.numberOfTxns,
            color: colors.text,
            icon: "📊",
          },
          {
            label: "ROI",
            value: stats.roi,
            color: parseFloat(stats.roi.replace("%", "")) >= 0 ? colors.positive : colors.negative,
            icon: "📈",
          },
        ];

        row1Cards.forEach((card, index) => {
          const x = padding.left + index * (cardWidth + cardSpacing);
          drawPremiumCard(ctx, x, gridY, cardWidth, cardHeight, card.label, card.value, card.color);
        });

        // Row 2: PnL, Total Volume
        gridY += cardHeight + cardSpacing;
        const pnlValue = parseFloat(stats.pnl.replace("$", "").replace(/,/g, ""));
        drawPremiumCard(
          ctx,
          padding.left,
          gridY,
          cardWidth,
          cardHeight,
          "PnL",
          stats.pnl,
          pnlValue >= 0 ? colors.positive : colors.negative
        );

        drawPremiumCard(
          ctx,
          padding.left + cardWidth + cardSpacing,
          gridY,
          cardWidth,
          cardHeight,
          "Total Volume",
          stats.totalVolume,
          colors.text
        );

        // Calculate exact height needed (no empty space at bottom) - after all cards are drawn
        const bottomY = gridY + cardHeight + 16; // After row 2 cards + good spacing gap
        const finalHeight = bottomY + 16 + 4; // bottomY + text line height + small margin
        
        // Resize canvas to exact height before drawing bottom elements
        if (finalHeight < canvas.height) {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            canvas.height = finalHeight;
            ctx.clearRect(0, 0, width, finalHeight);
            ctx.drawImage(tempCanvas, 0, 0);
          }
        }

        // Bottom row: Wallet address (left) + Date (right) - Tight spacing
        
        // Wallet address - Bottom Left (aligned with cards)
        if (stats.walletAddress) {
          const shortAddress =
            stats.walletAddress.length > 10
              ? `${stats.walletAddress.slice(0, 6)}...${stats.walletAddress.slice(-4)}`
              : stats.walletAddress;
          
          ctx.fillStyle = colors.textSecondary;
          ctx.font = "500 13px 'JetBrains Mono', 'Courier New', monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(shortAddress, padding.left, bottomY);
        }

        // Date - Bottom Right (aligned with cards) - No "(All Time)" text
        const now = new Date();
        const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
        ctx.fillStyle = colors.textSecondary;
        ctx.font = "500 13px 'Inter', system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(dateStr, width - padding.right, bottomY);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob"));
            }
          },
          "image/png",
          1.0
        );
      }).catch((error) => {
        reject(error);
      });

      function drawRoundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
      ) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      }

      function drawPremiumCard(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        value: string,
        valueColor: string
      ) {
        ctx.save();

        // Professional card shadow
        ctx.shadowColor = colors.shadow;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;

        // Premium card background with rounded corners
        drawRoundedRect(ctx, x, y, width, height, 18);
        
        // Enhanced darker card gradient - Premium aesthetic
        const cardGradient = ctx.createLinearGradient(x, y, x, y + height);
        cardGradient.addColorStop(0, "rgba(15, 20, 30, 0.95)");
        cardGradient.addColorStop(0.5, "rgba(10, 15, 25, 0.9)");
        cardGradient.addColorStop(1, "rgba(15, 20, 30, 0.85)");
        ctx.fillStyle = cardGradient;
        ctx.fill();

        // Subtle inner highlight
        const highlightGradient = ctx.createLinearGradient(x, y, x, y + height * 0.3);
        highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.06)");
        highlightGradient.addColorStop(1, "transparent");
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        // Reset shadow for border
        ctx.shadowBlur = 0;

        // Professional border with subtle glow
        ctx.strokeStyle = colors.cardBorder;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Accent border for positive/negative values
        if (valueColor === colors.positive || valueColor === colors.negative) {
          ctx.strokeStyle = valueColor + "25";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Label - Professional typography (bigger)
        ctx.fillStyle = colors.muted;
        ctx.font = "600 14px 'Inter', 'SF Pro Text', system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(label.toUpperCase(), x + 26, y + 22);

        // Value - Enhanced typography with better spacing
        ctx.fillStyle = valueColor;
        ctx.font = "700 42px 'Inter', 'SF Pro Display', system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(value, x + 26, y + 54);

        // Professional accent indicator line
        ctx.fillStyle = valueColor + "20";
        ctx.fillRect(x + 26, y + height - 4, 40, 2);

        ctx.restore();
      }

      // Draw comprehensive trading background with multiple elements
      function drawTradingBackground(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        colors: any
      ) {
        ctx.save();

        // 1. Trading grid pattern (chart style)
        ctx.strokeStyle = "rgba(148, 163, 184, 0.03)";
        ctx.lineWidth = 1;
        // Vertical lines (time axis)
        for (let x = 0; x < width; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        // Horizontal lines (price axis)
        for (let y = 0; y < height; y += 80) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // 2. Volume bars at bottom (trading volume indicator) - Adjusted for reduced height
        ctx.globalAlpha = 0.18;
        const volumeBarCount = 28;
        const volumeBarWidth = width / volumeBarCount;
        const volumeBaseY = height * 0.82; // Adjusted for reduced height
        
        for (let i = 0; i < volumeBarCount; i++) {
          const x = i * volumeBarWidth;
          const barHeight = Math.random() * 70 + 25;
          const isGreen = Math.random() > 0.52;
          
          // Volume bar with gradient
          const volumeGradient = ctx.createLinearGradient(
            x, volumeBaseY - barHeight,
            x, volumeBaseY
          );
          volumeGradient.addColorStop(0, isGreen ? colors.volumeGreen : colors.volumeRed);
          volumeGradient.addColorStop(1, isGreen ? "rgba(16, 185, 129, 0.15)" : "rgba(227, 93, 93, 0.15)");
          
          ctx.fillStyle = volumeGradient;
          ctx.fillRect(x + volumeBarWidth * 0.15, volumeBaseY - barHeight, volumeBarWidth * 0.7, barHeight);
        }

        // 3. Professional candlesticks - Better rendering
        const candleLayers = [
          { count: 32, opacity: 0.2, baseY: height * 0.42, size: 0.22, spread: 130 },
          { count: 26, opacity: 0.16, baseY: height * 0.52, size: 0.26, spread: 125 },
          { count: 20, opacity: 0.14, baseY: height * 0.62, size: 0.3, spread: 120 },
        ];
        
        candleLayers.forEach((layer) => {
          ctx.globalAlpha = layer.opacity;
          const candleWidth = width / layer.count;
          
          for (let i = 0; i < layer.count; i++) {
            const x = (i + 0.5) * candleWidth;
            const isGreen = Math.random() > 0.5;
            const open = layer.baseY + (Math.random() - 0.5) * layer.spread;
            const close = open + (Math.random() - 0.5) * (layer.spread * 0.75);
            const high = Math.min(open, close) - Math.random() * 55;
            const low = Math.max(open, close) + Math.random() * 55;
            
            const wickColor = isGreen ? colors.candleGreen : colors.candleRed;
            const bodyColor = isGreen ? colors.candleGreenBody : colors.candleRedBody;
            
            // Draw wick with subtle glow
            ctx.save();
            ctx.shadowColor = wickColor;
            ctx.shadowBlur = 3;
            ctx.strokeStyle = wickColor;
            ctx.lineWidth = 2.2;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(x, high);
            ctx.lineTo(x, low);
            ctx.stroke();
            ctx.restore();
            
            // Draw body - Professional candlestick style
            const bodyTop = Math.min(open, close);
            const bodyHeight = Math.max(Math.abs(close - open), 1.5);
            const bodyWidth = candleWidth * layer.size;
            
            // Professional body with 3D effect
            const bodyGradient = ctx.createLinearGradient(
              x - bodyWidth / 2, bodyTop,
              x + bodyWidth / 2, bodyTop + bodyHeight
            );
            
            if (isGreen) {
              // Green candle - filled body
              bodyGradient.addColorStop(0, "rgba(52, 211, 153, 0.8)");
              bodyGradient.addColorStop(0.3, "rgba(16, 185, 129, 0.9)");
              bodyGradient.addColorStop(0.7, "rgba(16, 185, 129, 0.85)");
              bodyGradient.addColorStop(1, "rgba(52, 211, 153, 0.75)");
            } else {
              // Red candle - outlined body
              bodyGradient.addColorStop(0, "rgba(248, 113, 113, 0.8)");
              bodyGradient.addColorStop(0.3, "rgba(239, 68, 68, 0.9)");
              bodyGradient.addColorStop(0.7, "rgba(239, 68, 68, 0.85)");
              bodyGradient.addColorStop(1, "rgba(248, 113, 113, 0.75)");
            }
            
            ctx.fillStyle = bodyGradient;
            ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
            
            // Add subtle border for definition
            ctx.strokeStyle = isGreen ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)";
            ctx.lineWidth = 0.8;
            ctx.strokeRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
          }
        });

        // 4. Moving average lines (MA lines) - Professional smooth lines
        ctx.globalAlpha = 0.18;
        
        // MA Line 1 (fast MA - blue) - Smooth curve
        ctx.strokeStyle = colors.maLine;
        ctx.lineWidth = 2.8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const ma1Points = 50;
        for (let i = 0; i <= ma1Points; i++) {
          const x = (width / ma1Points) * i;
          const y = height * 0.45 + Math.sin(i * 0.022) * 50 + Math.cos(i * 0.014) * 32;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // MA Line 2 (slow MA - green) - Smooth curve
        ctx.strokeStyle = colors.positive + "DD";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let i = 0; i <= ma1Points; i++) {
          const x = (width / ma1Points) * i;
          const y = height * 0.55 + Math.cos(i * 0.018) * 45 + Math.sin(i * 0.012) * 28;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 5. Support and Resistance lines (dashed) - Adjusted for reduced height
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = colors.supportResistance;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        
        // Support line (bottom) - Adjusted position
        const supportY = height * 0.68;
        ctx.beginPath();
        ctx.moveTo(0, supportY);
        ctx.lineTo(width, supportY);
        ctx.stroke();
        
        // Resistance line (top) - Adjusted position
        const resistanceY = height * 0.32;
        ctx.beginPath();
        ctx.moveTo(0, resistanceY);
        ctx.lineTo(width, resistanceY);
        ctx.stroke();
        
        ctx.setLineDash([]);

        // 6. Price action zones (gradient fills)
        ctx.globalAlpha = 0.05;
        const zoneGradient = ctx.createLinearGradient(0, 0, 0, height);
        zoneGradient.addColorStop(0, colors.candleGreen);
        zoneGradient.addColorStop(0.5, "transparent");
        zoneGradient.addColorStop(1, colors.candleRed);
        ctx.fillStyle = zoneGradient;
        ctx.fillRect(0, 0, width, height);

        // 7. Additional price wave lines - Adjusted for reduced height
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = colors.accentLight;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        
        const wavePoints = 55;
        const waveAmplitude = 45;
        const waveFrequency = 0.016;
        
        for (let i = 0; i <= wavePoints; i++) {
          const x = (width / wavePoints) * i;
          const y = height * 0.5 + 
            Math.sin(i * waveFrequency) * waveAmplitude + 
            Math.cos(i * waveFrequency * 0.7) * waveAmplitude * 0.5;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // 8. Trading indicators (dots/markers) - Adjusted positions
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = colors.accent;
        for (let i = 0; i < 10; i++) {
          const x = (width / 10) * i + width / 20;
          const y = height * 0.38 + Math.sin(i * 0.8) * 70;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // 9. Enhanced radial gradient overlay for professional depth
        const radialGradient = ctx.createRadialGradient(
          width * 0.35, height * 0.35, 0,
          width * 0.5, height * 0.5, Math.max(width, height) * 0.75
        );
        radialGradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
        radialGradient.addColorStop(0.4, "rgba(59, 130, 246, 0.04)");
        radialGradient.addColorStop(0.6, "transparent");
        radialGradient.addColorStop(1, "rgba(248, 113, 113, 0.08)");
        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();
      }
    } catch (error) {
      reject(error);
    }
  });
}

export async function downloadStatsImage(
  stats: StatsData,
  filename?: string
): Promise<void> {
  try {
    const blob = await generateStatsImage({ stats });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `anthe-labs-stats-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download stats image:", error);
    throw error;
  }
}
