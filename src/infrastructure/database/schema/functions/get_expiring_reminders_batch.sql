CREATE OR REPLACE FUNCTION public.get_expiring_reminders_batch(
  p_limit integer,
  p_cursor_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid,
  profile_id uuid,
  email text,
  entity_type text,
  entity_id uuid,
  item_name text,
  expiry_date date,
  days_until_expiry integer,
  details jsonb
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH target_dates AS (
    SELECT DISTINCT
      rs.profile_id,
      rs.entity_type,
      d.reminder_day,
      (CURRENT_DATE + d.reminder_day)::date AS target_date
    FROM reminder_settings rs
    CROSS JOIN LATERAL unnest(rs.reminder_days) AS d(reminder_day)
    WHERE rs.is_enabled = true
  ),
  active_profiles AS (
    SELECT DISTINCT asub.profile_id
    FROM app_subscriptions asub
    WHERE asub.status = 'active'
      AND asub.start_date <= CURRENT_DATE
      AND asub.end_date >= CURRENT_DATE
  ),
  expiring_items AS (
    SELECT f.id, f.profile_id, p.email::text, 'firearms'::text AS etype,
           f.id AS entity_id, (f.make || ' ' || f.model)::text AS item_name,
           f.expiry_date::date AS exp_date, (f.expiry_date - CURRENT_DATE)::int AS days_until,
           jsonb_build_object('type', f.type, 'make', f.make, 'model', f.model,
                              'caliber', f.caliber, 'serial_number', f.serial_number) AS details
    FROM firearms f
    JOIN profiles p ON f.profile_id = p.id
    JOIN target_dates td ON f.profile_id = td.profile_id
      AND td.entity_type = 'firearms' AND f.expiry_date = td.target_date
    JOIN active_profiles ap ON f.profile_id = ap.profile_id

    UNION ALL

    SELECT v.id, v.profile_id, p.email::text, 'vehicles'::text,
           v.id, (v.make || ' ' || v.model || ' (' || v.registration_number || ')')::text,
           v.expiry_date::date, (v.expiry_date - CURRENT_DATE)::int,
           jsonb_build_object('make', v.make, 'model', v.model, 'year', v.year,
                              'registration_number', v.registration_number)
    FROM vehicles v
    JOIN profiles p ON v.profile_id = p.id
    JOIN target_dates td ON v.profile_id = td.profile_id
      AND td.entity_type = 'vehicles' AND v.expiry_date = td.target_date
    JOIN active_profiles ap ON v.profile_id = ap.profile_id

    UNION ALL

    SELECT c.id, c.profile_id, p.email::text, 'certificates'::text,
           c.id, (c.type || ' - ' || c.first_name || ' ' || c.last_name)::text,
           c.expiry_date::date, (c.expiry_date - CURRENT_DATE)::int,
           jsonb_build_object('type', c.type, 'first_name', c.first_name,
                              'last_name', c.last_name, 'certificate_number', c.certificate_number)
    FROM certificates c
    JOIN profiles p ON c.profile_id = p.id
    JOIN target_dates td ON c.profile_id = td.profile_id
      AND td.entity_type = 'certificates' AND c.expiry_date = td.target_date
    JOIN active_profiles ap ON c.profile_id = ap.profile_id

    UNION ALL

    SELECT po.id, po.profile_id, p.email::text, 'psira_officers'::text,
           po.id, (po.first_name || ' ' || po.last_name)::text,
           po.expiry_date::date, (po.expiry_date::date - CURRENT_DATE)::int,
           jsonb_build_object('first_name', po.first_name, 'last_name', po.last_name,
                              'sira_no', po.sira_no, 'id_number', po.id_number)
    FROM psira_officers po
    JOIN profiles p ON po.profile_id = p.id
    JOIN target_dates td ON po.profile_id = td.profile_id
      AND td.entity_type = 'psira_officers' AND po.expiry_date::date = td.target_date
    JOIN active_profiles ap ON po.profile_id = ap.profile_id

    UNION ALL

    SELECT dl.id, dl.profile_id, p.email::text, 'driver_licences'::text,
           dl.id, (dl.initials || ' ' || dl.surname)::text,
           dl.expiry_date::date, (dl.expiry_date - CURRENT_DATE)::int,
           jsonb_build_object('surname', dl.surname, 'initials', dl.initials,
                              'id_number', dl.id_number, 'licence_number', dl.licence_number)
    FROM driver_licences dl
    JOIN profiles p ON dl.profile_id = p.id
    JOIN target_dates td ON dl.profile_id = td.profile_id
      AND td.entity_type = 'driver_licences' AND dl.expiry_date = td.target_date
    JOIN active_profiles ap ON dl.profile_id = ap.profile_id
  )
  SELECT ei.id, ei.profile_id, ei.email, ei.etype, ei.entity_id,
         ei.item_name, ei.exp_date, ei.days_until, ei.details
  FROM expiring_items ei
  WHERE (p_cursor_id IS NULL OR ei.id > p_cursor_id)
  ORDER BY ei.id
  LIMIT p_limit;
END;
$function$;
