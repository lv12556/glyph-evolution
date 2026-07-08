import { useMemo, Component } from 'react';
import Plot from 'react-plotly.js';

const ORDER_COLORS = ['#00e5ff','#ff6e40','#b2ff59','#ff4081','#7c4dff','#ffd740'];

// 错误边界：捕获 Plotly 渲染异常
class PlotErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div className="view-placeholder">
          <p style={{color:'#ff4081'}}>图表渲染错误</p>
          <p style={{fontSize:11,color:'var(--text-muted)'}}>{String(this.state.err.message || this.state.err)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PCAView({ pca, selectedGroup, selectedChar }) {
  // 用 useMemo 构建 traces，保持与 FeatureLineChart 一致的模式
  const result = useMemo(() => {
    // === 防御检查 ===
    if (!pca || !Array.isArray(pca) || pca.length === 0) {
      return { type: 'loading', msg: `加载t-SNE数据中... (${pca ? pca.length : 'null'}条)` };
    }
    if (!selectedGroup || !selectedChar) {
      return { type: 'noselect', msg: '请选择字组和单字' };
    }

    // === 提取选中字符的数据 ===
    const pts = [];
    for (let i = 0; i < pca.length; i++) {
      const r = pca[i];
      if (r.group === selectedGroup && r.char === selectedChar) {
        pts.push(r);
      }
    }
    pts.sort((a, b) => a.time - b.time);

    if (pts.length < 2) {
      return { type: 'nodata', msg: `${selectedChar}在${selectedGroup}中仅有${pts.length}个数据点（需≥2）`, detail: `pca共${pca.length}条` };
    }

    // === 构建 trace ===
    const xs = pts.map(r => r.pc1);
    const ys = pts.map(r => r.pc2);
    const labels = pts.map(r => r.order);

    const trace = {
      x: xs,
      y: ys,
      type: 'scatter',
      mode: 'lines+markers+text',
      name: selectedChar,
      line: { color: '#00e5ff', width: 2.5 },
      marker: {
        size: 14,
        color: ORDER_COLORS.slice(0, pts.length),
        line: { width: 2, color: '#fff' },
      },
      text: labels,
      textposition: 'top center',
      textfont: { color: '#fff', size: 10 },
      hovertemplate: '%{text}<br>t-SNE1: %{x:.2f}<br>t-SNE2: %{y:.2f}<extra></extra>',
    };

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#aaa', size: 11 },
      title: {
        text: `t-SNE深度特征空间 · ${selectedChar} · ${selectedGroup}`,
        font: { color: '#e0e0e0', size: 14 },
      },
      xaxis: { title: { text: 't-SNE 维度1', font: { color: '#888' } }, gridcolor: 'rgba(255,255,255,0.06)', zeroline: { color: 'rgba(255,255,255,0.15)', width: 1 } },
      yaxis: { title: { text: 't-SNE 维度2', font: { color: '#888' } }, gridcolor: 'rgba(255,255,255,0.06)', zeroline: { color: 'rgba(255,255,255,0.15)', width: 1 } },
      margin: { l: 60, r: 30, t: 55, b: 50 },
      legend: { orientation: 'h', y: -0.15, font: { color: '#aaa' } },
      hovermode: 'closest',
    };

    return { type: 'chart', data: [trace], layout };
  }, [pca, selectedGroup, selectedChar]);

  // === 渲染 ===
  if (result.type === 'loading') {
    return <div className="view-placeholder"><div className="spinner" /><p>{result.msg}</p></div>;
  }
  if (result.type === 'noselect') {
    return <div className="view-placeholder"><p>{result.msg}</p></div>;
  }
  if (result.type === 'nodata') {
    return <div className="view-placeholder"><p style={{color:'#ff6e40'}}>{result.msg}</p><p style={{fontSize:11,color:'var(--text-muted)'}}>{result.detail}</p></div>;
  }
  // result.type === 'chart'
  return (
    <div className="pca-view">
      <PlotErrorBoundary>
        <Plot
          data={result.data}
          layout={result.layout}
          config={{ displayModeBar: true, modeBarButtonsToRemove: ['lasso2d','select2d','autoScale2d'], displaylogo: false, responsive: true }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
        />
      </PlotErrorBoundary>
    </div>
  );
}
