import './globals.css';
import DocumentVaultBridge from './DocumentVaultBridge';
export const metadata={title:'ApplyAI — Find it. Qualify. Apply.',description:'AI-powered opportunity discovery, eligibility checking and application preparation.'};
export default function RootLayout({children}){return <html lang="en"><body>{children}<DocumentVaultBridge/></body></html>}
