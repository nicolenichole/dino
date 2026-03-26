/// <reference types="vite/client" />

// Allow importing plain CSS files from TypeScript.
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

