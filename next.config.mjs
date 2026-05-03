/** @type {import('next').NextConfig} */
const nextConfig = {
    // Use non-standard page extension so src/pages/*.jsx files
    // are NOT picked up as Next.js Pages Router routes.
    // The app uses the App Router (app/) exclusively.
    pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],
}

export default nextConfig
