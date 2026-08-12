import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import '../css/styles.css'

const container = document.getElementById('root')!

const tree = (
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)

// Prerendered pages ship server markup inside #root, so hydrate those. Under
// `npm run dev` and the `build:spa` escape hatch, #root holds only the
// <!--app-html--> placeholder comment — hydrating against that fails, so test
// for an element child rather than any node and mount from scratch instead.
if (container.firstElementChild) {
  hydrateRoot(container, tree)
} else {
  container.replaceChildren()
  createRoot(container).render(tree)
}
