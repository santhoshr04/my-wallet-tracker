-- Fix possible RLS deadlock: policies on user_roles that call has_role(), while has_role() reads user_roles under RLS.
-- Use SECURITY DEFINER + row_security off for the lookup so admin checks stay reliable.
-- Also bootstrap admin for the primary account.

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated, service_role;

-- Ensure this user is admin (sign up once so auth.users + user_roles exist).
-- Prefer upgrading the existing 'user' row; if no row exists, insert admin.
UPDATE public.user_roles ur
SET role = 'admin'::public.app_role
FROM auth.users au
WHERE ur.user_id = au.id
  AND lower(au.email) = lower('santhoshr0415@gmail.com')
  AND ur.role = 'user'::public.app_role;

INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'admin'::public.app_role
FROM auth.users au
WHERE lower(au.email) = lower('santhoshr0415@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = au.id AND ur2.role = 'admin'::public.app_role
  );
