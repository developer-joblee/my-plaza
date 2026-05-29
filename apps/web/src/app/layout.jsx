import './globals.css'
import { Provider } from '@/components/ui/provider'

export const metadata = {
  title: 'MyPlaza',
  description: 'Escritório social virtual',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
