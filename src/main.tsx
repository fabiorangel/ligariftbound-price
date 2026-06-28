import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Edition from './pages/Edition'
import Card from './pages/Card'
import Search from './pages/Search'

const router = createHashRouter([
  { path: '/', element: <Home /> },
  { path: '/edition/:code', element: <Edition /> },
  { path: '/card/:riftbound_id', element: <Card /> },
  { path: '/search', element: <Search /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
