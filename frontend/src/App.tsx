import { Route, Routes } from 'react-router-dom'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import ProjectScreening from './pages/ProjectScreening'
import PrismaFlowDiagram from './pages/PrismaFlowDiagram'
import ProjectExtraction from './pages/ProjectExtraction'
import ProjectMetaAnalysis from './pages/ProjectMetaAnalysis'
import ProjectExport from './pages/ProjectExport'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectList />} />
      <Route path="/projects/:id" element={<ProjectDetail />} />
      <Route path="/projects/:id/screening/:stage" element={<ProjectScreening />} />
      <Route path="/projects/:id/prisma-flow" element={<PrismaFlowDiagram />} />
      <Route path="/projects/:id/extraction" element={<ProjectExtraction />} />
      <Route path="/projects/:id/meta-analysis" element={<ProjectMetaAnalysis />} />
      <Route path="/projects/:id/export" element={<ProjectExport />} />
    </Routes>
  )
}

export default App
