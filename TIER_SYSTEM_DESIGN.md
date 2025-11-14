# Tiered Achievements & Badge System - Design Documentation

## Overview

A professional, fintech-grade tiered achievement system for Anthé Labs crypto copy-trading platform. This system visually rewards traders across four key metrics: Total Volume, Number of Trades, PnL, and ROI.

---

## 1. Tier Logic & Thresholds

### Volume Tiers (USD)

- **Bronze**: $0 - $9,999
- **Silver**: $10,000 - $49,999
- **Gold**: $50,000 - $199,999
- **Platinum**: $200,000 - $999,999
- **Diamond**: $1,000,000+

### Trades Tiers (Count)

- **Rookie**: 0 - 9 trades
- **Active**: 10 - 99 trades
- **Pro**: 100 - 499 trades
- **Veteran**: 500 - 1,999 trades
- **Legend**: 2,000+ trades

### PnL Tiers (Absolute USD)

- **Negative**: < $0
- **Neutral**: $0 - $999
- **Positive**: $1,000 - $9,999
- **High-Gain**: $10,000 - $99,999
- **Exceptional**: $100,000+

### ROI Tiers (Percent)

- **Low**: < 0%
- **Moderate**: 0% - 9.99%
- **Good**: 10% - 29.99%
- **Excellent**: 30% - 99.99%
- **Elite**: ≥ 100%

---

## 2. File Structure

```
apps/web/src/
├── lib/
│   └── tiers.ts                    # Tier logic, thresholds, utilities
├── components/
│   ├── TierBadge.tsx              # Medallion, Chip, ProgressBar components
│   └── TierModal.tsx              # Tier explanation modal
└── app/
    └── profile/
        └── [username]/
            └── page.tsx           # Profile page with tier integration
```

---
