-- Repoint `conversations.created_by` from `auth.users` to `public.profiles`.
--
-- The UUID values don't change — `profiles.id` is `auth.users.id`, kept in
-- sync by the on_auth_user_created trigger. This is purely a constraint
-- swap so PostgREST embeds (`select(*, profiles(...))`) work and so future
-- joins / RLS predicates that involve the profile don't have to reach into
-- the auth schema.
--
-- Cascade behaviour is preserved: profiles cascades from auth.users, and
-- conversations now cascades from profiles, so deleting an auth user still
-- cleans up conversations.
alter table public.conversations
  drop constraint conversations_created_by_fkey;

alter table public.conversations
  add constraint conversations_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete cascade;
