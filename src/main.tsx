import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Card from './pages/Card'
import Search from './pages/Search'
import Movers from './pages/Movers'

const router = createHashRouter([
  { path: '/', element: <Home /> },
  { path: '/card/:riftbound_id', element: <Card /> },
  { path: '/search', element: <Search /> },
  { path: '/movers/:direction', element: <Movers /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
