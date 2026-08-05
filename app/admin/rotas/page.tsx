import RotasClient from './client'

export default function RotasPage() {
  return <RotasClient mapsKey={process.env.GOOGLE_PLACES_API_KEY ?? ''} />
}
