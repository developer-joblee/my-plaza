'use client'
import dynamic from 'next/dynamic'

const WorldClient = dynamic(() => import('@/components/world/WorldClient'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(180deg, #fbe6c2 0%, #f5cf9a 55%, #e2a872 100%)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#3a2014',
      }}
    >
      <p>Carregando…</p>
    </div>
  ),
})

export default function WorldLoader(props) {
  return <WorldClient {...props} />
}
