import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold font-sans">FocusFlow</h1>
      <p className="text-slate-500">Hệ thống quản lý task tối ưu</p>
      <Button onClick={() => alert("Chào Master!")}>
        Bắt đầu ngay
      </Button>
    </div>
  )
}

export default App