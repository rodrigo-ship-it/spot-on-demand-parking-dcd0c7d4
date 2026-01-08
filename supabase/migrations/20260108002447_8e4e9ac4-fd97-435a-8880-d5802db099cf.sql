-- Add admin role for the correct user (rodrigo@settldparking.com)
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES ('f8c7e821-e5f4-41ee-b59c-36660f3692dc', 'admin', 'f8c7e821-e5f4-41ee-b59c-36660f3692dc')
ON CONFLICT (user_id, role) DO NOTHING;