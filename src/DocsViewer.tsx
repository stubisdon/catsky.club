import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './DocsViewer.css'

interface DocFile {
  name: string
  path: string
  title: string
}

const DOC_FILES: DocFile[] = [
  { name: 'BUSINESS_STRATEGY.md', path: '/docs/BUSINESS_STRATEGY.md', title: 'Business Strategy' },
  { name: 'BRAND_GUIDELINES.md', path: '/docs/BRAND_GUIDELINES.md', title: 'Brand Guidelines' },
  { name: 'CONTINUE_DEVELOPMENT.md', path: '/docs/CONTINUE_DEVELOPMENT.md', title: 'Continue Development' },
  { name: 'DEPLOYMENT.md', path: '/docs/DEPLOYMENT.md', title: 'Deployment' },
  { name: 'EXPERIENCE_FORMAT.md', path: '/docs/EXPERIENCE_FORMAT.md', title: 'Experience Format' },
  { name: 'QUICK_START.md', path: '/docs/QUICK_START.md', title: 'Quick Start' },
  { name: 'README_REACT.md', path: '/docs/README_REACT.md', title: 'React Documentation' },
  { name: 'SETUP_MEDIA.md', path: '/docs/SETUP_MEDIA.md', title: 'Setup Media' },
  { name: 'UX_UI_DOCUMENTATION.md', path: '/docs/UX_UI_DOCUMENTATION.md', title: 'UX/UI Documentation' },
]

export default function DocsViewer() {
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null)
  const [markdown, setMarkdown] = useState<string>('')
  const [loading, setLoading] = useState(false)


  useEffect(() => {
    if (selectedDoc) {
      setLoading(true)
      fetch(selectedDoc.path)
        .then(res => res.text())
        .then(text => {
          setMarkdown(text)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error loading doc:', err)
          setMarkdown(`# Error\n\nCould not load ${selectedDoc.name}`)
          setLoading(false)
        })
    }
  }, [selectedDoc])

  return (
    <div className="docs-viewer">
      <div className="docs-sidebar">
        <h2>Documentation</h2>
        <a href="#" className="docs-back-link" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>
          ← Back to Experience
        </a>
        <nav className="docs-nav">
          {DOC_FILES.map(doc => (
            <button
              key={doc.path}
              className={`docs-nav-item ${selectedDoc?.path === doc.path ? 'active' : ''}`}
              onClick={() => setSelectedDoc(doc)}
            >
              {doc.title}
            </button>
          ))}
        </nav>
      </div>
      <div className="docs-content">
        {!selectedDoc ? (
          <div className="docs-welcome">
            <h1>Documentation</h1>
            <p>Select a document from the sidebar to view it.</p>
            <ul>
              {DOC_FILES.map(doc => (
                <li key={doc.path}>
                  <button onClick={() => setSelectedDoc(doc)}>{doc.title}</button>
                </li>
              ))}
            </ul>
          </div>
        ) : loading ? (
          <div className="docs-loading">Loading...</div>
        ) : (
          <div className="docs-markdown">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

