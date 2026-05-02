import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// TODO: Temporary placeholders — will be replaced with actual components later
const Garden = () => <div className="p-8"><h1 className="text-2xl font-bold">Garden</h1></div>
const Tasks = () => <div className="p-8"><h1 className="text-2xl font-bold">Tasks</h1></div>
const Focus = () => <div className="p-8"><h1 className="text-2xl font-bold">Focus</h1></div>
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/garden" replace />} />
        <Route path="/garden" element={<Garden />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/focus/:taskId" element={<Focus />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App