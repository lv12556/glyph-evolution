import { useMemo, useEffect, useState } from 'react';
import { loadImageIndex, getReferenceImageUrl } from '../utils/dataLoader';

const COLORS = [
  '#00e5ff', '#ff6e40', '#b2ff59', '#ff4081', '#7c4dff', '#ffd740'
];

/**
 * SVG-based glyph contour rendering + original reference image
 */
export default function GlyphEvolutionView({
  shapeData,
  selectedGroup,
  selectedOrder,
  selectedTime,
  overlayOrders,
  showOverlay,
}) {
  const [imageIdx, setImageIdx] = useState(null);
  const [showRef, setShowRef] = useState(true);
  const [refOpacity, setRefOpacity] = useState(0.5);

  // Load image index
  useEffect(() => {
    loadImageIndex().then(setImageIdx).catch(() => {});
  }, []);

  // Get reference image URL
  const refImageUrl = useMemo(() => {
    if (!selectedGroup || !selectedOrder || !imageIdx) return null;
    return getReferenceImageUrl(selectedGroup, selectedOrder, imageIdx);
  }, [selectedGroup, selectedOrder, imageIdx]);

  // Get the current time step data
  const currentData = useMemo(() => {
    if (!shapeData || !selectedOrder || selectedTime == null) return null;
    const orderData = shapeData.orders?.[selectedOrder];
    if (!orderData) return null;
    const step = orderData.sequence?.find(s => s.time === selectedTime);
    return step || null;
  }, [shapeData, selectedOrder, selectedTime]);

  // Get overlay data
  const overlayData = useMemo(() => {
    if (!showOverlay || !shapeData || selectedTime == null) return [];
    return overlayOrders
      .filter(o => o !== selectedOrder)
      .map((orderId, idx) => {
        const orderData = shapeData.orders?.[orderId];
        if (!orderData) return null;
        const step = orderData.sequence?.find(s => s.time === selectedTime);
        return step ? { orderId, step, colorIdx: idx } : null;
      })
      .filter(Boolean);
  }, [showOverlay, shapeData, selectedTime, overlayOrders, selectedOrder]);

  if (!shapeData) {
    return (
      <div className="view-placeholder">
        <div className="spinner" />
        <p>加载字形数据中...</p>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="view-placeholder">
        <p>请选择组和顺序以查看字形</p>
      </div>
    );
  }

  const chars = Object.keys(currentData.chars);

  return (
    <div className="glyph-evolution-view">
      {/* Toolbar */}
      <div className="glyph-toolbar">
        <label className="ref-toggle">
          <input
            type="checkbox"
            checked={showRef}
            onChange={e => setShowRef(e.target.checked)}
          />
          <span>显示原图</span>
        </label>
        {showRef && (
          <label className="ref-opacity">
            <span>透明度</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={refOpacity}
              onChange={e => setRefOpacity(Number(e.target.value))}
            />
          </label>
        )}
      </div>

      {/* Main canvas area: SVG + Reference image side by side */}
      <div className="glyph-canvas-area">
        {/* SVG Contour */}
        <div className="svg-panel">
          <div className="panel-label">轮廓拟合</div>
          <svg
            viewBox="0 0 300 320"
            className="glyph-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="300" height="320" fill="url(#grid)" />

            {chars.map((charName, ci) => {
              const strokes = currentData.chars[charName];
              if (!strokes || strokes.length === 0) return null;
              return (
                <g key={charName} className="char-group">
                  <text x={5} y={ci * 105 + 15} fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="monospace">
                    {charName}
                  </text>
                  {strokes.map((stroke, si) => {
                    if (stroke.length < 2) return null;
                    const d = stroke.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
                    return (
                      <path key={si} d={d} fill="none" stroke={COLORS[0]} strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                    );
                  })}
                </g>
              );
            })}

            {overlayData.map(({ orderId, step, colorIdx }) => {
              const color = COLORS[(colorIdx + 1) % COLORS.length];
              return (
                <g key={orderId} className="overlay-group" opacity="0.35">
                  {Object.keys(step.chars).map((charName, ci) => {
                    const strokes = step.chars[charName];
                    if (!strokes || strokes.length === 0) return null;
                    return strokes.map((stroke, si) => {
                      if (stroke.length < 2) return null;
                      const d = stroke.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
                      return (
                        <path key={`${orderId}-${charName}-${si}`} d={d} fill="none"
                          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      );
                    });
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Reference Image */}
        {showRef && refImageUrl && (
          <div className="ref-panel">
            <div className="panel-label">原始篆书</div>
            <div className="ref-image-wrap">
              <img
                src={refImageUrl}
                alt={`${selectedGroup} ${selectedOrder} 原图`}
                className="ref-image"
                style={{ opacity: refOpacity }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {showOverlay && overlayData.length > 0 && (
        <div className="overlay-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: COLORS[0] }} />
            <span>{selectedOrder} (当前)</span>
          </div>
          {overlayData.map(({ orderId, colorIdx }) => (
            <div key={orderId} className="legend-item">
              <span className="legend-dot" style={{ background: COLORS[(colorIdx + 1) % COLORS.length] }} />
              <span>{orderId}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
