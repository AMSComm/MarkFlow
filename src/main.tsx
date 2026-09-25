import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[MarkFlow Global Error]:', event.error || event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[MarkFlow Global Unhandled Rejection]:', event.reason)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="MarkFlow encountered an unexpected error">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

