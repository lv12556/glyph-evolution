import { useMemo, useEffect, useState } from 'react';
import { loadImageIndex, getReferenceImageUrl } from '../utils/dataLoader';

const ORDER_COLORS = [
  '#00e5ff', '#ff6e40', '#b2ff59', '#ff4081', '#7c4dff', '#ffd740'
];

/**
 * Small multiples view - all 6 orders displayed simultaneously
 * Each panel shows the contour + original reference image
 */
export default function OrderComparisonView({
  shapeData,
  groupIndex,
  selectedTime,
  selectedChar,
  selectedGroup,
}) {
  const orders = groupIndex?.orders || [];
  const [imageIdx, setImageIdx] = useState(null);

  useEffect(() => {
    loadImageIndex().then(setImageIdx).catch(() => {});
  }, []);

  // Build display data for each order
  const panels = useMemo(() => {
    if (!shapeData || selectedTime == null) return [];

    return orders.map((orderId, oi) => {
      const orderData = shapeData.orders?.[orderId];
      if (!orderData) return { orderId, strokes: [], color: ORDER_COLORS[oi] };

      const step = orderData.sequence?.find(s => s.time === selectedTime);
      if (!step) return { orderId, strokes: [], color: ORDER_COLORS[oi] };

      const charNames = selectedChar
        ? [selectedChar]
        : Object.keys(step.chars);
      const allStrokes = [];
      charNames.forEach((cn, ci) => {
        const strokes = step.chars[cn];
        if (strokes) {
          allStrokes.push({ charName: cn, strokes, yOffset: ci * 105 });
        }
      });

      // Reference image URL
      const refUrl = selectedGroup && imageIdx
        ? getReferenceImageUrl(selectedGroup, orderId, imageIdx)
        : null;

      return { orderId, charStrokes: allStrokes, color: ORDER_COLORS[oi], refUrl };
    });
  }, [shapeData, selectedTime, selectedChar, orders, selectedGroup, imageIdx]);

  if (!shapeData || !groupIndex) {
    return (
      <div className="view-placeholder">
        <div className="spinner" />
        <p>加载数据中...</p>
      </div>
    );
  }

  if (selectedTime == null) {
    return (
      <div className="view-placeholder">
        <p>请拖动时间滑块以查看各顺序对比</p>
      </div>
    );
  }

  return (
    <div className="order-comparison-view">
      <div className="small-multiples-grid">
        {panels.map((panel) => (
          <div key={panel.orderId} className="small-multiple-panel">
            <div className="panel-header" style={{ borderColor: panel.color }}>
              <span className="panel-order-label" style={{ color: panel.color }}>
                {panel.orderId}
              </span>
            </div>
            <div className="panel-body-comparison">
              {/* Contour SVG */}
              <svg
                viewBox="0 0 100 315"
                className="panel-svg-half"
                preserveAspectRatio="xMidYMid meet"
              >
                {panel.charStrokes?.map(({ charName, strokes, yOffset }) => {
                  if (!strokes || strokes.length === 0) return null;
                  return (
                    <g key={charName}>
                      <text x={3} y={yOffset + 12} fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace">
                        {charName}
                      </text>
                      {strokes.map((stroke, si) => {
                        if (stroke.length < 2) return null;
                        const d = stroke.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
                        return (
                          <path key={si} d={d} fill="none" stroke={panel.color}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
              {/* Reference image */}
              {panel.refUrl && (
                <div className="panel-img-half">
                  <img src={panel.refUrl} alt={panel.orderId} className="ref-thumb" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
