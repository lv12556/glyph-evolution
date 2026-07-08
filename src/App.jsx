import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDataLoader } from './hooks/useDataLoader';
import { getMaxTime } from './utils/dataLoader';
import ControlPanel from './components/ControlPanel';
import GlyphEvolutionView from './components/GlyphEvolutionView';
import FeatureLineChart from './components/FeatureLineChart';
import PCAView from './components/PCAView';
import OrderComparisonView from './components/OrderComparisonView';
import VarianceExplained from './components/VarianceExplained';
import OrderSimilarity from './components/OrderSimilarity';
import StatsPanel from './components/StatsPanel';
import './styles/index.css';

export default function App() {
  const { groupIndex, shapeData, features, pca, loading, error, loadShape } = useDataLoader();

  const [selectedGroup, setSelectedGroup] = useState('组01');
  const [selectedChar, setSelectedChar] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('排01');
  const [selectedTime, setSelectedTime] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState(['排01']);
  const [selectedFeature, setSelectedFeature] = useState('feat_0');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeView, setActiveView] = useState('evolution');
  const playTimerRef = useRef(null);

  useEffect(() => {
    if (selectedGroup) loadShape(selectedGroup);
  }, [selectedGroup, loadShape]);

  useEffect(() => {
    if (groupIndex && selectedGroup) {
      const g = groupIndex.groups.find(g => g.id === selectedGroup);
      if (g && g.chars.length > 0 && !g.chars.includes(selectedChar)) {
        setSelectedChar(g.chars[0]);
      }
    }
  }, [groupIndex, selectedGroup, selectedChar]);

  const maxTime = useMemo(() => {
    if (activeView === 'features' || activeView === 'pca') {
      const dataMax = getMaxTime(features, pca);
      return dataMax > 0 ? dataMax : 50;
    }
    return groupIndex?.timeSteps || 50;
  }, [activeView, features, pca, groupIndex]);

  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setSelectedTime(prev => {
          if (prev >= maxTime) { setIsPlaying(false); return maxTime; }
          return prev + 1;
        });
      }, 150);
    } else {
      if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
    }
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [isPlaying, maxTime]);

  const handleGroupChange = useCallback((g) => { setSelectedGroup(g); setSelectedTime(1); setIsPlaying(false); }, []);
  const handleCharChange = useCallback((c) => setSelectedChar(c), []);
  const handleOrderChange = useCallback((o) => {
    setSelectedOrder(o);
    if (!selectedOrders.includes(o)) setSelectedOrders(prev => [...prev, o]);
  }, [selectedOrders]);
  const handleOrdersChange = useCallback((orders) => {
    if (orders.length === 0) return;
    setSelectedOrders(orders);
    if (!orders.includes(selectedOrder)) setSelectedOrder(orders[0]);
  }, [selectedOrder]);
  const togglePlay = useCallback(() => {
    if (isPlaying) { setIsPlaying(false); }
    else { if (selectedTime >= maxTime) setSelectedTime(1); setIsPlaying(true); }
  }, [isPlaying, selectedTime, maxTime]);

  const viewTabs = [
    { id: 'evolution', label: '字形演化', icon: '✎', group: 'view' },
    { id: 'comparison', label: '顺序对比', icon: '⊞', group: 'view' },
    { id: 'features', label: '特征曲线', icon: '📈', group: 'view' },
    { id: 'pca', label: 't-SNE空间', icon: '◎', group: 'view' },
    { id: 'variance', label: '方差分析', icon: '📊', group: 'analysis' },
    { id: 'similarity', label: '顺序相似度', icon: '🔲', group: 'analysis' },
    { id: 'stats', label: '统计摘要', icon: '📋', group: 'analysis' },
  ];

  // Loading / Error
  if (loading.index && loading.features && loading.pca) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-spinner" />
          <h1 className="loading-title">字形演化可视化</h1>
          <p className="loading-subtitle">正在加载 ViT+CLIP 深度特征数据...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="app-loading">
        <div className="loading-content"><h2>加载失败</h2><p className="error-text">{error}</p></div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">篆</span>
          多次书写字形变化趋势
        </h1>
        <span className="app-subtitle">
          {selectedGroup && selectedChar
            ? `${selectedGroup} · ${selectedChar} · ${selectedOrder}`
            : 'ViT+CLIP 深度学习分析'}
        </span>
      </header>

      <ControlPanel
        groupIndex={groupIndex} features={features}
        selectedGroup={selectedGroup} selectedChar={selectedChar}
        selectedOrder={selectedOrder} selectedTime={selectedTime}
        selectedOrders={selectedOrders} selectedFeature={selectedFeature}
        isPlaying={isPlaying} maxTime={maxTime}
        onGroupChange={handleGroupChange} onCharChange={handleCharChange}
        onOrderChange={handleOrderChange} onTimeChange={setSelectedTime}
        onOrdersChange={handleOrdersChange} onFeatureChange={setSelectedFeature}
        onTogglePlay={togglePlay}
      />

      {/* View Tabs */}
      <div className="view-tabs">
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            className={`view-tab ${activeView === tab.id ? 'active' : ''} ${tab.group === 'analysis' ? 'tab-analysis' : ''}`}
            onClick={() => setActiveView(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="main-content">
        {activeView === 'evolution' && (
          <div className="view-panel large">
            <GlyphEvolutionView
              shapeData={shapeData}
              selectedGroup={selectedGroup} selectedOrder={selectedOrder}
              selectedTime={selectedTime} overlayOrders={selectedOrders}
              showOverlay={selectedOrders.length > 1}
            />
          </div>
        )}

        {activeView === 'comparison' && (
          <div className="view-panel full-width">
            <OrderComparisonView
              shapeData={shapeData} groupIndex={groupIndex}
              selectedTime={selectedTime} selectedChar={selectedChar}
              selectedGroup={selectedGroup}
            />
          </div>
        )}

        {activeView === 'features' && (
          <div className="view-panel large">
            <FeatureLineChart
              features={features} selectedGroup={selectedGroup}
              selectedChar={selectedChar} selectedFeature={selectedFeature}
            />
          </div>
        )}

        {activeView === 'pca' && (
          <div className="view-panel large">
            <PCAView pca={pca} selectedGroup={selectedGroup} selectedChar={selectedChar} />
          </div>
        )}

        {activeView === 'variance' && (
          <div className="view-panel large">
            <VarianceExplained features={features} />
          </div>
        )}

        {activeView === 'similarity' && (
          <div className="view-panel large">
            <OrderSimilarity features={features} selectedGroup={selectedGroup} selectedChar={selectedChar} />
          </div>
        )}

        {activeView === 'stats' && (
          <div className="view-panel large">
            <StatsPanel features={features} pca={pca} selectedGroup={selectedGroup} selectedChar={selectedChar} />
          </div>
        )}
      </main>

      <footer className="status-bar">
        <span className="status-item">
          数据: {groupIndex?.groups?.length || 0} 组 · 6种顺序 · {features ? `${features.length.toLocaleString()}条 ViT+CLIP 深度特征` : '加载中...'}
        </span>
        <span className="status-item">模型: ViT-base-patch16-224 + CLIP-vit-base-patch32</span>
        <span className="status-item">降维: PCA(1280→50) → t-SNE(50→2) + UMAP</span>
      </footer>
    </div>
  );
}
