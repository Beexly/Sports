# Chalk

Football intelligence platform for coaching staffs. Three modules: Film Room, Board, and Playbook.

- **Film Room** - Add games, generate opponent tendency reports, and review run/pass splits by down, formation, personnel, and situation.
- **Board** - Track recruiting prospects with scheme fit scores, tier ratings, and full evaluation profiles.
- **Playbook** - Build weekly game plans with situational offensive and defensive concepts.

## Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS v4
- Supabase (auth + Postgres)

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase project URL and keys in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

See `.env.example` for the required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SECRET_KEY` | Supabase service role key (server-side only) |

## Database

The initial schema is in `supabase/migrations/0001_initial_schema.sql`. Apply it to your Supabase project via the Supabase dashboard or CLI:

```bash
npx supabase db push
```

## Demo note

This project is hosted on Supabase free tier. Free-tier projects pause after a week of inactivity. If you hit the live demo and see a slow first load or a connection error, wait 30-60 seconds for the project to resume and try again.

## License

MIT - see [LICENSE](./LICENSE).
