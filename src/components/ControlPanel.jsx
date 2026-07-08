import { useMemo } from 'react';

const ORDER_OPTIONS = ['排01', '排02', '排03', '排04', '排05', '排06'];
const ORDER_LABELS = {
  '排01': '顺序一', '排02': '顺序二', '排03': '顺序三',
  '排04': '顺序四', '排05': '顺序五', '排06': '顺序六',
};

/**
 * Control panel with time slider, play button, and dropdowns
 */
export default function ControlPanel({
  groupIndex,
  features,
  selectedGroup,
  selectedChar,
  selectedOrder,
  selectedTime,
  selectedOrders,
  selectedFeature,
  isPlaying,
  maxTime = 50,
  onGroupChange,
  onCharChange,
  onOrderChange,
  onTimeChange,
  onOrdersChange,
  onFeatureChange,
  onTogglePlay,
}) {
  const groups = groupIndex?.groups || [];
  const orders = groupIndex?.orders || ORDER_OPTIONS;
  const timeSteps = maxTime || groupIndex?.timeSteps || 50;

  // Get available characters for selected group
  const chars = useMemo(() => {
    if (!groupIndex || !selectedGroup) return [];
    const g = groupIndex.groups.find(g => g.id === selectedGroup);
    return g?.chars || [];
  }, [groupIndex, selectedGroup]);

  // Get available feature names
  const featureNames = useMemo(() => {
    if (!features) return ['feat_0', 'feat_1', 'feat_2', 'feat_3', 'feat_4'];
    const first = features[0];
    if (!first) return [];
    return Object.keys(first).filter(k =>
      !['group', 'order', 'char', 'time'].includes(k) && typeof first[k] === 'number'
    );
  }, [features]);

  const toggleOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      onOrdersChange(selectedOrders.filter(o => o !== orderId));
    } else {
      onOrdersChange([...selectedOrders, orderId]);
    }
  };

  return (
    <div className="control-panel">
      {/* Top row: selectors */}
      <div className="control-row selectors">
        {/* Group selector */}
        <div className="control-group">
          <label className="control-label">字组</label>
          <select
            className="control-select"
            value={selectedGroup || ''}
            onChange={e => onGroupChange(e.target.value)}
          >
            <option value="" disabled>选择组...</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.id} ({g.chars.join(',')})
              </option>
            ))}
          </select>
        </div>

        {/* Character selector */}
        <div className="control-group">
          <label className="control-label">单字</label>
          <select
            className="control-select"
            value={selectedChar || ''}
            onChange={e => onCharChange(e.target.value)}
            disabled={!selectedGroup}
          >
            <option value="" disabled>选择字...</option>
            {chars.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Main order selector */}
        <div className="control-group">
          <label className="control-label">书写顺序</label>
          <select
            className="control-select"
            value={selectedOrder || ''}
            onChange={e => onOrderChange(e.target.value)}
          >
            <option value="" disabled>选择顺序...</option>
            {orders.map(o => (
              <option key={o} value={o}>{ORDER_LABELS[o] || o}</option>
            ))}
          </select>
        </div>

        {/* Feature selector */}
        <div className="control-group">
          <label className="control-label">特征</label>
          <select
            className="control-select"
            value={selectedFeature || ''}
            onChange={e => onFeatureChange(e.target.value)}
          >
            {featureNames.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-order toggle */}
      <div className="control-row order-toggles">
        <label className="control-label">对比顺序:</label>
        <div className="toggle-group">
          {orders.map((o, i) => (
            <button
              key={o}
              className={`toggle-btn ${selectedOrders.includes(o) ? 'active' : ''}`}
              style={{
                '--order-color': ['#00e5ff','#ff6e40','#b2ff59','#ff4081','#7c4dff','#ffd740'][i]
              }}
              onClick={() => toggleOrder(o)}
            >
              {ORDER_LABELS[o] || o}
            </button>
          ))}
        </div>
      </div>

      {/* Time slider + Play button */}
      <div className="control-row time-controls">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={onTogglePlay}
          title={isPlaying ? '暂停' : '播放动画'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="slider-container">
          <input
            type="range"
            className="time-slider"
            min={1}
            max={timeSteps}
            value={selectedTime || 1}
            onChange={e => onTimeChange(Number(e.target.value))}
          />
          <div className="slider-ticks">
            <span>1</span>
            <span>{Math.floor(timeSteps / 4)}</span>
            <span>{Math.floor(timeSteps / 2)}</span>
            <span>{Math.floor(timeSteps * 3 / 4)}</span>
            <span>{timeSteps}</span>
          </div>
        </div>

        <span className="time-display">
          第 <strong>{selectedTime || 1}</strong> / {timeSteps} 次
        </span>
      </div>
    </div>
  );
}
