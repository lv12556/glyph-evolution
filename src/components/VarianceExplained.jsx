import { useMemo } from 'react';
import Plot from 'react-plotly.js';

/**
 * PCA 方差解释率图表
 * 展示各主成分的方差贡献和累计贡献
 */
export default function VarianceExplained({ features }) {
  const { data, layout } = useMemo(() => {
    if (!features || features.length === 0) return { data: [], layout: {} };

    // 提取所有 feat_* 列
    const featCols = Object.keys(features[0]).filter(k => k.startsWith('feat_'));
    if (featCols.length === 0) return { data: [], layout: {} };

    // 用 numpy 思想手动计算：对每列做标准化后求方差
    const n = features.length;
    const p = featCols.length;

    // 计算每列的方差
    const means = featCols.map(col => features.reduce((s, r) => s + r[col], 0) / n);
    const vars = featCols.map((col, j) => {
      const m = means[j];
      return features.reduce((s, r) => {
        const d = r[col] - m;
        return s + d * d;
      }, 0) / (n - 1);
    });

    const totalVar = vars.reduce((a, b) => a + b, 0);
    const ratios = vars.map(v => v / totalVar);

    // 取前30个
    const topK = Math.min(30, p);
    const topRatios = ratios.slice(0, topK);
    const cumulative = [];
    let cum = 0;
    topRatios.forEach(r => { cum += r; cumulative.push(cum); });

    const xLabels = featCols.slice(0, topK).map((_, i) => `PC${i + 1}`);

    const traces = [
      {
        x: xLabels, y: topRatios.map(r => r * 100),
        type: 'bar', name: '个体贡献率 (%)',
        marker: {
          color: topRatios.map((_, i) => `hsla(${195 - i * 4}, 100%, 55%, ${0.9 - i * 0.02})`),
          line: { width: 0.5, color: 'rgba(255,255,255,0.1)' },
        },
        hovertemplate: '%{x}: %{y:.2f}%<extra></extra>',
      },
      {
        x: xLabels, y: cumulative.map(r => r * 100),
        type: 'scatter', mode: 'lines+markers',
        name: '累计贡献率 (%)', yaxis: 'y2',
        line: { color: '#ffd740', width: 2.5 },
        marker: { size: 5, color: '#ffd740' },
        hovertemplate: '%{x}: 累计 %{y:.1f}%<extra></extra>',
      },
    ];

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#aaa', size: 11 },
      title: { text: `PCA 方差解释率 (前${topK}维)`, font: { color: '#e0e0e0', size: 14 } },
      xaxis: { title: { text: '主成分', font: { color: '#888' } }, tickangle: -45, gridcolor: 'rgba(255,255,255,0.04)' },
      yaxis: { title: { text: '个体贡献率 (%)', font: { color: '#00e5ff' } }, gridcolor: 'rgba(255,255,255,0.04)' },
      yaxis2: { title: { text: '累计贡献率 (%)', font: { color: '#ffd740' } }, overlaying: 'y', side: 'right', range: [0, 105], gridcolor: 'rgba(255,255,255,0.02)' },
      margin: { l: 55, r: 55, t: 55, b: 80 },
      legend: { orientation: 'h', yanchor: 'top', y: -0.18, xanchor: 'center', x: 0.5, font: { color: '#aaa' } },
      bargap: 0.3,
    };

    return { data: traces, layout };
  }, [features]);

  if (!features || features.length === 0) {
    return <div className="view-placeholder"><p>无特征数据</p></div>;
  }

  return (
    <div className="pca-view">
      <Plot data={data} layout={layout}
        config={{ displayModeBar: false, displaylogo: false, responsive: true }}
        style={{ width: '100%', height: '100%' }} useResizeHandler />
    </div>
  );
}
