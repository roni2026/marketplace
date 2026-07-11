Go to Supabase Dashboard → SQL Editor → New query, paste this:

SQL

-- Replace with your actual User UID from Step 1
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR-USER-UID-HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
Click Run.

Step 3: Verify
SQL

SELECT * FROM public.user_roles WHERE user_id = 'YOUR-USER-UID-HERE';
You should see a row with role = 'admin'.

Step 4: Access Admin
Go to:

TXT

https://bazarbd.onrender.com/admin
Log in with your email and password. You'll now see the admin dashboard.

Want Super Admin Instead?
If you want the highest level (access to everything including managing other admins):

SQL

INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR-USER-UID-HERE', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
Want to Add Another Admin?
Same steps — find their User UID in Supabase → Authentication → Users, then:

SQL

INSERT INTO public.user_roles (user_id, role)
VALUES ('THEIR-USER-UID-HERE', 'admin');
Remove Admin Access
SQL

DELETE FROM public.user_roles
WHERE user_id = 'USER-UID-HERE' AND role = 'admin';
