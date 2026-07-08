import { useMemo } from 'react';
import Plot from 'react-plotly.js';
const ORDER_LABELS = { '排01':'顺序一','排02':'顺序二','排03':'顺序三','排04':'顺序四','排05':'顺序五','排06':'顺序六' };

/**
 * 书写顺序相似度热力图
 * 计算6种顺序在深度特征空间中的两两余弦相似度 / 欧氏距离
 */
export default function OrderSimilarity({ features, selectedGroup, selectedChar }) {
  const { data, layout, hasData, stats } = useMemo(() => {
    if (!features || !selectedChar || !selectedGroup) {
      return { data: [], layout: {}, hasData: false, stats: null };
    }

    // 获取选中字符在6个order下的特征向量
    const charData = features.filter(r => r.group === selectedGroup && r.char === selectedChar);
    if (charData.length < 2) return { data: [], layout: {}, hasData: false, stats: null };

    const featCols = Object.keys(features[0]).filter(k => k.startsWith('feat_'));
    const orders = [...new Set(charData.map(r => r.order))].sort();
    const n = orders.length;

    // 为每个order构建特征向量
    const vecs = {};
    orders.forEach(o => {
      const row = charData.find(r => r.order === o);
      if (row) vecs[o] = featCols.map(c => row[c]);
    });

    // 计算两两余弦相似度
    const cosineSim = (a, b) => {
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
      return na > 0 && nb > 0 ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
    };

    // 欧氏距离（归一化）
    const euclideanDist = (a, b) => {
      let sum = 0;
      for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
      return Math.sqrt(sum);
    };

    const simMatrix = [];
    const distMatrix = [];
    const labels = orders.map(o => ORDER_LABELS[o] || o);

    for (let i = 0; i < n; i++) {
      const simRow = [], distRow = [];
      for (let j = 0; j < n; j++) {
        simRow.push(cosineSim(vecs[orders[i]], vecs[orders[j]]));
        distRow.push(euclideanDist(vecs[orders[i]], vecs[orders[j]]));
      }
      simMatrix.push(simRow);
      distMatrix.push(distRow);
    }

    // 找到最相似和最不相似的一对
    let maxSim = -Infinity, minSim = Infinity, maxPair = '', minPair = '';
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (simMatrix[i][j] > maxSim) { maxSim = simMatrix[i][j]; maxPair = `${labels[i]}↔${labels[j]}`; }
        if (simMatrix[i][j] < minSim) { minSim = simMatrix[i][j]; minPair = `${labels[i]}↔${labels[j]}`; }
      }
    }

    const statInfo = { maxSim, maxPair, minSim, minPair, n };

    const trace = {
      z: simMatrix, x: labels, y: labels,
      type: 'heatmap',
      colorscale: [
        [0, '#0a0e14'], [0.3, '#1a3a5c'], [0.5, '#0d7377'],
        [0.7, '#14a3a3'], [0.85, '#00e5ff'], [1, '#b2ff59'],
      ],
      zmin: 0, zmax: 1,
      text: simMatrix.map(row => row.map(v => v.toFixed(3))),
      texttemplate: '%{text}',
      textfont: { size: 12, color: '#fff' },
      hovertemplate: '%{y} vs %{x}<br>余弦相似度: %{z:.4f}<extra></extra>',
      showscale: true,
      colorbar: {
        title: { text: '余弦相似度', font: { color: '#aaa', size: 10 } },
        tickfont: { color: '#888' }, thickness: 12, len: 0.7,
      },
    };

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#aaa', size: 11 },
      title: {
        text: `书写顺序相似度 · ${selectedChar} · ${selectedGroup}`,
        font: { color: '#e0e0e0', size: 14 },
      },
      xaxis: { side: 'top', tickfont: { size: 11 } },
      yaxis: { autorange: 'reversed', tickfont: { size: 11 } },
      margin: { l: 80, r: 30, t: 80, b: 60 },
    };

    return { data: [trace], layout, hasData: true, stats: statInfo };
  }, [features, selectedGroup, selectedChar]);

  if (!features) {
    return <div className="view-placeholder"><div className="spinner" /><p>加载特征数据中...</p></div>;
  }
  if (!hasData) {
    return <div className="view-placeholder"><p>请选择字组和单字以查看顺序相似度</p></div>;
  }

  return (
    <div className="pca-view" style={{ position: 'relative' }}>
      <Plot data={data} layout={layout}
        config={{ displayModeBar: false, displaylogo: false, responsive: true }}
        style={{ width: '100%', height: '100%' }} useResizeHandler />
      {stats && (
        <div className="stats-overlay">
          <div className="stat-line">最相似: <strong style={{color:'#b2ff59'}}>{stats.maxPair}</strong> ({stats.maxSim.toFixed(3)})</div>
          <div className="stat-line">最差异: <strong style={{color:'#ff6e40'}}>{stats.minPair}</strong> ({stats.minSim.toFixed(3)})</div>
        </div>
      )}
    </div>
  );
}
