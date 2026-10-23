import { Toast } from '@heroui/react'

/** HeroUI's toast host; mounted lazily by AppLayout because no toast can fire before first paint. */
export function ToastRegion() {
  return <Toast.Provider placement="top" />
}
