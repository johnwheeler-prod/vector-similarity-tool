import { Montserrat } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata = {
  title: 'Vector Similarity Tool',
  description: 'Compare passages to queries using cosine similarity in vector space',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-montserrat antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
