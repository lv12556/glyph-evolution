import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { filterFeatures, getFeatureNames } from '../utils/dataLoader';

const ORDER_LABELS = { '排01':'顺序一','排02':'顺序二','排03':'顺序三','排04':'顺序四','排05':'顺序五','排06':'顺序六' };

export default function FeatureLineChart({ features, selectedGroup, selectedChar, selectedFeature }) {
  const featureNames = useMemo(() => {
    if (!features) return [];
    return getFeatureNames(features);
  }, [features]);

  const activeFeature = selectedFeature || (featureNames[0] || 'feat_0');

  const { data, layout, hasData } = useMemo(() => {
    if (!features || !selectedChar || !selectedGroup) {
      return { data: [], layout: {}, hasData: false };
    }

    const charData = filterFeatures(features, { group: selectedGroup, char: selectedChar });
    if (charData.length === 0) {
      return { data: [], layout: {}, hasData: false };
    }
    charData.sort((a, b) => a.time - b.time);

    const orders = [...new Set(charData.map(r => r.order))].sort();

    const trace1 = {
      x: orders.map(o => ORDER_LABELS[o] || o),
      y: orders.map(o => {
        const row = charData.find(r => r.order === o);
        return row ? row[activeFeature] : null;
      }),
      type: 'scatter', mode: 'lines+markers',
      name: activeFeature,
      line: { color: '#00e5ff', width: 3 },
      marker: { size: 10, color: '#00e5ff', line: { width: 2, color: '#fff' } },
      yaxis: 'y',
      hovertemplate: '%{x}: %{y:.4f}<extra>' + activeFeature + '</extra>',
    };

    const traces = [trace1];
    if (featureNames.length > 1) {
      const feat2 = featureNames[1] === activeFeature ? featureNames[2] : featureNames[1];
      if (feat2) {
        traces.push({
          x: orders.map(o => ORDER_LABELS[o] || o),
          y: orders.map(o => {
            const row = charData.find(r => r.order === o);
            return row ? row[feat2] : null;
          }),
          type: 'scatter', mode: 'lines+markers',
          name: feat2,
          line: { color: '#ff6e40', width: 2, dash: 'dash' },
          marker: { size: 8, color: '#ff6e40', symbol: 'diamond' },
          yaxis: 'y2',
          hovertemplate: '%{x}: %{y:.4f}<extra>' + feat2 + '</extra>',
        });
      }
    }

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#aaa', size: 11, family: 'monospace' },
      title: {
        text: `ViT+CLIP 深度特征 · ${selectedChar} · ${selectedGroup}`,
        font: { color: '#e0e0e0', size: 14 },
      },
      xaxis: {
        title: { text: '书写顺序', font: { color: '#888' } },
        gridcolor: 'rgba(255,255,255,0.06)', zeroline: false,
      },
      yaxis: {
        title: { text: activeFeature, font: { color: '#00e5ff' } },
        gridcolor: 'rgba(255,255,255,0.06)', zeroline: false,
      },
      yaxis2: traces.length > 1 ? {
        title: { text: traces[1]?.name || '', font: { color: '#ff6e40' } },
        overlaying: 'y', side: 'right',
        gridcolor: 'rgba(255,255,255,0.03)', zeroline: false,
      } : undefined,
      margin: { l: 60, r: 70, t: 55, b: 70 },
      legend: { orientation: 'h', yanchor: 'top', y: -0.2, xanchor: 'center', x: 0.5, font: { color: '#aaa' } },
      hovermode: 'closest',
    };

    return { data: traces, layout, hasData: true };
  }, [features, selectedGroup, selectedChar, activeFeature, featureNames]);

  if (!features) {
    return <div className="view-placeholder"><div className="spinner" /><p>加载特征数据中...</p></div>;
  }
  if (!hasData) {
    return (
      <div className="view-placeholder">
        <p>请选择字组和单字以查看特征变化</p>
        <p style={{fontSize:11,color:'var(--text-muted)'}}>
          features: {features?.length||0}条 | 组={selectedGroup||'?'} 字={selectedChar||'?'}
        </p>
      </div>
    );
  }

  return (
    <div className="feature-chart">
      <Plot data={data} layout={layout}
        config={{ displayModeBar: true, modeBarButtonsToRemove: ['lasso2d','select2d','autoScale2d'], displaylogo: false, responsive: true }}
        style={{ width: '100%', height: '100%' }} useResizeHandler />
    </div>
  );
}
