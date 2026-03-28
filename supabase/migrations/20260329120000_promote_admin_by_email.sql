-- Grant admin role to this account (user must already exist in auth.users — sign up first if needed).
UPDATE public.user_roles ur
SET role = 'admin'::public.app_role
FROM auth.users au
WHERE ur.user_id = au.id
  AND lower(au.email) = lower('santhoshr0415@gmail.com');
