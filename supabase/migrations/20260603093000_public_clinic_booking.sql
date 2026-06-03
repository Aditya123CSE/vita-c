alter table public.clinics
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists logo text,
  add column if not exists address text,
  add column if not exists phone text;

with clinic_slugs as (
  select
    id,
    coalesce(
      nullif(
        regexp_replace(
          regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'),
          '(^-|-$)',
          '',
          'g'
        ),
        ''
      ),
      'clinic-' || substring(id::text from 1 for 8)
    ) as base_slug,
    row_number() over (
      partition by coalesce(
        nullif(
          regexp_replace(
            regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'),
            '(^-|-$)',
            '',
            'g'
          ),
          ''
        ),
        'clinic-' || substring(id::text from 1 for 8)
      )
      order by id
    ) as slug_number
  from public.clinics
  where slug is null
)
update public.clinics as clinics
set slug =
  case
    when clinic_slugs.slug_number = 1 then clinic_slugs.base_slug
    else clinic_slugs.base_slug || '-' || substring(clinics.id::text from 1 for 8)
  end
from clinic_slugs
where clinics.id = clinic_slugs.id;

create unique index if not exists clinics_slug_key
  on public.clinics (slug)
  where slug is not null;

create unique index if not exists appointments_clinic_token_number_key
  on public.appointments (clinic_id, token_number);

create or replace function public.get_public_clinic_portal(
  p_clinic_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  portal jsonb;
begin
  select jsonb_build_object(
    'clinic',
    jsonb_build_object(
      'id', clinics.id,
      'name', clinics.name,
      'slug', clinics.slug,
      'description', clinics.description,
      'logo', clinics.logo,
      'address', clinics.address,
      'phone', clinics.phone
    ),
    'doctors',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', doctors.id,
            'name', doctors.name,
            'specialization', doctors.specialization,
            'clinic_id', doctors.clinic_id
          )
          order by doctors.name
        )
        from public.doctors
        where doctors.clinic_id = clinics.id
      ),
      '[]'::jsonb
    ),
    'queue',
    jsonb_build_object(
      'current_token',
      (
        select min(appointments.token_number)
        from public.appointments
        where appointments.clinic_id = clinics.id
          and appointments.status = 'In Consultation'
      ),
      'waiting_patients',
      (
        select count(*)
        from public.appointments
        where appointments.clinic_id = clinics.id
          and appointments.status = 'Waiting'
      )
    )
  )
  into portal
  from public.clinics
  where clinics.slug = p_clinic_slug
  limit 1;

  return portal;
end;
$$;

create or replace function public.create_vita_appointment(
  p_clinic_id uuid,
  p_clinic_slug text,
  p_doctor_id uuid,
  p_patient_name text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  resolved_clinic record;
  resolved_doctor record;
  next_token integer;
  created_appointment record;
begin
  if nullif(trim(coalesce(p_patient_name, '')), '') is null then
    raise exception 'Patient name is required';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is null then
    raise exception 'Phone number is required';
  end if;

  if p_doctor_id is null then
    raise exception 'Doctor is required';
  end if;

  if p_clinic_id is not null then
    select clinics.id, clinics.name, clinics.slug
    into resolved_clinic
    from public.clinics
    where clinics.id = p_clinic_id
      and clinics.user_id = auth.uid()
    limit 1;
  else
    select clinics.id, clinics.name, clinics.slug
    into resolved_clinic
    from public.clinics
    where p_clinic_slug is not null
      and clinics.slug = p_clinic_slug
    limit 1;
  end if;

  if resolved_clinic.id is null then
    raise exception 'Clinic not found';
  end if;

  select doctors.id, doctors.name, doctors.specialization
  into resolved_doctor
  from public.doctors
  where doctors.id = p_doctor_id
    and doctors.clinic_id = resolved_clinic.id
  limit 1;

  if resolved_doctor.id is null then
    raise exception 'Doctor not found for this clinic';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(resolved_clinic.id::text, 0)
  );

  select coalesce(max(appointments.token_number), 0) + 1
  into next_token
  from public.appointments
  where appointments.clinic_id = resolved_clinic.id;

  insert into public.appointments (
    patient_name,
    phone,
    doctor_id,
    token_number,
    status,
    clinic_id
  )
  values (
    trim(p_patient_name),
    trim(p_phone),
    resolved_doctor.id,
    next_token,
    'Waiting',
    resolved_clinic.id
  )
  returning *
  into created_appointment;

  return jsonb_build_object(
    'appointment_id', created_appointment.id,
    'patient_name', created_appointment.patient_name,
    'phone', created_appointment.phone,
    'token_number', created_appointment.token_number,
    'status', created_appointment.status,
    'clinic',
    jsonb_build_object(
      'id', resolved_clinic.id,
      'name', resolved_clinic.name,
      'slug', resolved_clinic.slug
    ),
    'doctor',
    jsonb_build_object(
      'id', resolved_doctor.id,
      'name', resolved_doctor.name,
      'specialization', resolved_doctor.specialization
    )
  );
end;
$$;

grant execute on function public.get_public_clinic_portal(text)
  to anon, authenticated;

grant execute on function public.create_vita_appointment(uuid, text, uuid, text, text)
  to anon, authenticated;
