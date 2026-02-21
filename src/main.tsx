import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { registerGlobalErrorLogging } from './utils'
import './index.css'
import App from './App.tsx'

registerGlobalErrorLogging()

registerSW({
	immediate: true,
})

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
