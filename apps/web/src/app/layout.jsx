import './globals.css'

export const metadata = {
  title: 'MyPlaza',
  description: 'Escritório social virtual',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
