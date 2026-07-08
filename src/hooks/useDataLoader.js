import { useState, useEffect, useCallback, useRef } from 'react';
import { loadGroupIndex, loadGroupShape, loadFeatures, loadPCA } from '../utils/dataLoader';

/**
 * Custom hook for loading and managing glyph evolution data
 */
export function useDataLoader() {
  const [groupIndex, setGroupIndex] = useState(null);
  const [shapeData, setShapeData] = useState(null);
  const [features, setFeatures] = useState(null);
  const [pca, setPCA] = useState(null);
  const [loading, setLoading] = useState({ index: true, shape: false, features: true, pca: true });
  const [error, setError] = useState(null);
  const loadedGroupRef = useRef(null);

  // Load index, features, and PCA on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [idx, feat, pcaData] = await Promise.all([
          loadGroupIndex(),
          loadFeatures(),
          loadPCA()
        ]);
        if (cancelled) return;
        setGroupIndex(idx);
        setFeatures(feat);
        setPCA(pcaData);
        setLoading(prev => ({ ...prev, index: false, features: false, pca: false }));
      } catch (err) {
        if (!cancelled) setError(err.message);
        setLoading(prev => ({ ...prev, index: false, features: false, pca: false }));
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Load shape data when group changes
  const loadShape = useCallback(async (groupId) => {
    if (!groupId || loadedGroupRef.current === groupId) return;
    loadedGroupRef.current = groupId;
    setLoading(prev => ({ ...prev, shape: true }));
    try {
      const data = await loadGroupShape(groupId);
      setShapeData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, shape: false }));
    }
  }, []);

  const isLoading = loading.index || loading.features || loading.pca || loading.shape;

  return {
    groupIndex,
    shapeData,
    features,
    pca,
    loading,
    isLoading,
    error,
    loadShape
  };
}
