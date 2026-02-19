import { PageContainer } from './components'

const verses = [
  ['in a world of whispers', 'stories intertwine', 'built the space of presence', 'where your voice meets mine'],
  ['tapestry of moments', 'meeting of the minds', 'poetry and purpose', 'move in its own time'],
  ['in a world of borders', 'in a world of names', 'we belong together', 'air is still the same'],
  ['planet is not ours', 'to conquer or command', 'but share it with the feathers,', 'fur, and with the land'],
  ['with roots in the dark', 'with wings overhead', 'with oceans that feel', 'with forests that spread'],
  ['listen for the other song', 'the non-human call', 'see, we\'ve been related', 'all along'],
]

export default function Mission() {
  return (
    <PageContainer>
      <div style={{ 
        marginBottom: '3rem',
        fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
        lineHeight: '1.9'
      }}>
        {verses.map((verse, idx) => (
          <div key={idx} style={{ marginBottom: '1.5rem' }}>
            {verse.map((line, lineIdx) => (
              <p key={lineIdx}>{line}</p>
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
