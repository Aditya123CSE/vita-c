import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ClinicBookingClient, {
  type ClinicPortalData
} from './ClinicBookingClient'

type ClinicPageProps = {
  params: Promise<{
    slug: string
  }>
}

function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )
}

async function getClinicPortalData(
  slug: string
): Promise<ClinicPortalData | null> {
  const supabase = createPublicSupabaseClient()

  const { data, error } = await supabase.rpc(
    'get_public_clinic_portal',
    {
      p_clinic_slug: slug
    }
  )

  if (error || !data) {
    return null
  }

  return data as ClinicPortalData
}

export async function generateMetadata({
  params
}: ClinicPageProps): Promise<Metadata> {
  const { slug } = await params
  const portalData = await getClinicPortalData(slug)

  if (!portalData) {
    return {
      title: 'Clinic Not Found | Vita-C'
    }
  }

  const title = `${portalData.clinic.name} | Vita-C`
  const description =
    portalData.clinic.description ||
    `Book an appointment and track the live queue at ${portalData.clinic.name}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: portalData.clinic.logo
        ? [
            {
              url: portalData.clinic.logo,
              alt: portalData.clinic.name
            }
          ]
        : undefined
    }
  }
}

export default async function ClinicPage({
  params
}: ClinicPageProps) {
  const { slug } = await params
  const portalData = await getClinicPortalData(slug)

  if (!portalData) {
    notFound()
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: portalData.clinic.name,
    description: portalData.clinic.description,
    telephone: portalData.clinic.phone,
    address: portalData.clinic.address,
    url: `/clinic/${portalData.clinic.slug}`
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />

      <ClinicBookingClient initialData={portalData} />
    </>
  )
}
