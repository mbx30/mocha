import { useState } from 'react'
import type { PdfSummary } from '../../types'
import PDFView from '../PDFView'
import ViewerTools from './ViewerTools'
import PageOperationsPanel from './PageOperationsPanel'
import LayerPanel from './LayerPanel'
import TextEditPanel from './TextEditPanel'
import ImageEditPanel from './ImageEditPanel'

type PdfTab = 'viewer' | 'pages' | 'layers' | 'text' | 'images'

export default function PDFToolsView() {
  const [activeTab, setActiveTab] = useState<PdfTab>('viewer')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleFileLoaded = (path: string, count: number) => {
    setFilePath(path)
    setPageCount(count)
    setCurrentPage(0)
  }

  const triggerRefresh = () => setRefreshKey(k => k + 1)

  if (!filePath) {
    return null
  }

  return (
    <div className="pdf-tools-view">
      <div className="pdf-tools-tabs">
        <button className={`pdf-tools-tab ${activeTab === 'viewer' ? 'active' : ''}`}
          onClick={() => setActiveTab('viewer')}>Viewer</button>
        <button className={`pdf-tools-tab ${activeTab === 'pages' ? 'active' : ''}`}
          onClick={() => setActiveTab('pages')}>Pages</button>
        <button className={`pdf-tools-tab ${activeTab === 'layers' ? 'active' : ''}`}
          onClick={() => setActiveTab('layers')}>Layers</button>
        <button className={`pdf-tools-tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}>Text</button>
        <button className={`pdf-tools-tab ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}>Images</button>
      </div>

      <div className="pdf-tools-content">
        {activeTab === 'viewer' && filePath && (
          <ViewerTools filePath={filePath} pageIndex={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
        )}
        {activeTab === 'pages' && filePath && (
          <PageOperationsPanel key={refreshKey} filePath={filePath} pageCount={pageCount} onRefresh={triggerRefresh} />
        )}
        {activeTab === 'layers' && filePath && (
          <LayerPanel key={refreshKey} filePath={filePath} />
        )}
        {activeTab === 'text' && filePath && (
          <TextEditPanel key={refreshKey} filePath={filePath} pageCount={pageCount} />
        )}
        {activeTab === 'images' && filePath && (
          <ImageEditPanel key={refreshKey} filePath={filePath} />
        )}
      </div>
    </div>
  )
}
