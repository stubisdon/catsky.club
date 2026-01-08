import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './DocsViewer.css'

interface DocFile {
  name: string
  path: string
  title: string
}

const DOC_FILES: DocFile[] = [
  // Business documentation
  { name: 'strategy.md', path: '/docs/biz/strategy.md', title: 'Business Strategy' },
  { name: 'branding.md', path: '/docs/biz/branding.md', title: 'Brand Guidelines' },
  { name: 'mission.md', path: '/docs/biz/mission.md', title: 'Mission' },
  { name: 'todo.md', path: '/docs/biz/todo.md', title: 'Todo' },
  // Technical documentation
  { name: 'CONTINUE_DEVELOPMENT.md', path: '/docs/tech/CONTINUE_DEVELOPMENT.md', title: 'Continue Development' },
  { name: 'DEPLOYMENT.md', path: '/docs/tech/DEPLOYMENT.md', title: 'Deployment' },
  { name: 'EXPERIENCE_FORMAT.md', path: '/docs/tech/EXPERIENCE_FORMAT.md', title: 'Experience Format' },
  { name: 'QUICK_START.md', path: '/docs/tech/QUICK_START.md', title: 'Quick Start' },
  { name: 'README_REACT.md', path: '/docs/tech/README_REACT.md', title: 'React Documentation' },
  { name: 'SETUP_MEDIA.md', path: '/docs/tech/SETUP_MEDIA.md', title: 'Setup Media' },
  { name: 'UX_UI_DOCUMENTATION.md', path: '/docs/tech/UX_UI_DOCUMENTATION.md', title: 'UX/UI Documentation' },
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

