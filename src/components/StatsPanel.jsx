import { useMemo } from 'react';

/**
 * 统计分析面板 — 展示当前选择的数据统计摘要
 */
export default function StatsPanel({ features, pca, selectedGroup, selectedChar }) {
  const stats = useMemo(() => {
    if (!features || !selectedChar || !selectedGroup) return null;

    const charData = features.filter(r => r.group === selectedGroup && r.char === selectedChar);
    if (charData.length === 0) return null;

    const featCols = Object.keys(features[0]).filter(k => k.startsWith('feat_'));
    const orders = [...new Set(charData.map(r => r.order))].sort();

    // 各order的特征向量
    const vecs = orders.map(o => {
      const row = charData.find(r => r.order === o);
      return row ? featCols.map(c => row[c]) : null;
    }).filter(Boolean);

    if (vecs.length < 2) return { charData, orders, vecs, featCols };

    // 计算统计量
    const dim = vecs[0].length;
    const n = vecs.length;

    // 均值向量
    const meanVec = new Array(dim).fill(0);
    vecs.forEach(v => { for (let i = 0; i < dim; i++) meanVec[i] += v[i]; });
    for (let i = 0; i < dim; i++) meanVec[i] /= n;

    // 方差向量
    const varVec = new Array(dim).fill(0);
    vecs.forEach(v => { for (let i = 0; i < dim; i++) { const d = v[i] - meanVec[i]; varVec[i] += d * d; } });
    for (let i = 0; i < dim; i++) varVec[i] /= (n - 1);

    const totalVariance = varVec.reduce((a, b) => a + b, 0);

    // 两两欧氏距离
    const distances = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < dim; k++) { const d = vecs[i][k] - vecs[j][k]; sum += d * d; }
        distances.push({ i, j, dist: Math.sqrt(sum) });
      }
    }
    distances.sort((a, b) => b.dist - a.dist);

    return {
      totalSamples: charData.length,
      numOrders: orders.length,
      featureDim: featCols.length,
      totalVariance: totalVariance.toFixed(4),
      meanVectorNorm: Math.sqrt(meanVec.reduce((s, v) => s + v * v, 0)).toFixed(4),
      maxDist: distances[0],
      minDist: distances[distances.length - 1],
      avgDist: (distances.reduce((s, d) => s + d.dist, 0) / distances.length).toFixed(4),
      orders,
    };
  }, [features, selectedGroup, selectedChar]);

  if (!stats) {
    return (
      <div className="view-placeholder">
        <p>请选择字组和单字以查看统计摘要</p>
      </div>
    );
  }

  const ORDER_LABELS = { '排01':'一','排02':'二','排03':'三','排04':'四','排05':'五','排06':'六' };

  return (
    <div className="stats-panel">
      <h3 className="stats-title">📊 深度特征统计 · {selectedChar} · {selectedGroup}</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.totalSamples}</span>
          <span className="stat-label">数据点</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.numOrders}</span>
          <span className="stat-label">书写顺序</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.featureDim}</span>
          <span className="stat-label">特征维度 (PCA)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalVariance}</span>
          <span className="stat-label">总方差</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.meanVectorNorm}</span>
          <span className="stat-label">均值向量范数</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.avgDist}</span>
          <span className="stat-label">平均顺序间距</span>
        </div>
      </div>

      {/* 顺序间距排名 */}
      {stats.maxDist && (
        <div className="stats-detail">
          <div className="detail-title">顺序间距排名（欧氏距离）</div>
          <div className="detail-list">
            {stats.maxDist && (
              <div className="detail-row">
                <span>最远</span>
                <span className="detail-pair">
                  {ORDER_LABELS[stats.maxDist.i !== undefined ? stats.orders[stats.maxDist.i] : ''] || '?'}
                  ↔
                  {ORDER_LABELS[stats.maxDist.j !== undefined ? stats.orders[stats.maxDist.j] : ''] || '?'}
                </span>
                <span className="detail-val">{stats.maxDist.dist.toFixed(4)}</span>
              </div>
            )}
            {stats.minDist && (
              <div className="detail-row">
                <span>最近</span>
                <span className="detail-pair">
                  {stats.minDist.i !== undefined ? ORDER_LABELS[stats.orders[stats.minDist.i]] : '?'}
                  ↔
                  {stats.minDist.j !== undefined ? ORDER_LABELS[stats.orders[stats.minDist.j]] : '?'}
                </span>
                <span className="detail-val" style={{color:'#b2ff59'}}>{stats.minDist.dist.toFixed(4)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
