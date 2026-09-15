import path from 'path'
import pg from 'pg'
import { loadEnv } from './scripts/loadEnv.mjs'

const { Client } = pg

function parseArgList(argv) {
  return argv.reduce((acc, arg) => {
    if (!arg.startsWith('--')) return acc
    const [key, ...rest] = arg.slice(2).split('=')
    acc[key] = rest.length ? rest.join('=') : true
    return acc
  }, {})
}

const args = parseArgList(process.argv.slice(2))
const envPath = path.resolve(process.cwd(), '.env.local')
loadEnv(envPath)

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Set it in .env.local or the environment.')
  process.exit(1)
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()

  if (!args.email) {
    console.log('No email provided. Showing database summary...')
    const [{ count: users }] = (await client.query("SELECT COUNT(*)::int AS count FROM auth.users")).rows
    const [{ count: profiles }] = (await client.query("SELECT COUNT(*)::int AS count FROM public.profiles")).rows
    console.log(`auth.users count: ${users}`)
    console.log(`public.profiles count: ${profiles}`)
    console.log('\nRun with --email=you@example.com to inspect a specific user.')
    await client.end()
    return
  }

  const email = args.email.toLowerCase()
  const userRes = await client.query(
    `SELECT id, email, role, email_confirmed_at IS NOT NULL AS confirmed, encrypted_password IS NOT NULL AS has_password
     FROM auth.users
     WHERE email = $1`,
    [email]
  )

  if (userRes.rows.length === 0) {
    console.log(`No auth.user found for email=${email}`)
    if (args.createAdmin || args.createUser) {
      const role = args.role || (args.createAdmin ? 'admin' : 'demo')
      await createUser(email, role)
      await client.end()
      return
    }
    await client.end()
    return
  }

  const user = userRes.rows[0]
  console.log('auth.users record:')
  console.log(user)

  const profileRes = await client.query(
    `SELECT id, email, first_name, last_name, role, expires_at FROM public.profiles WHERE id = $1`,
    [user.id]
  )

  if (profileRes.rows.length === 0) {
    console.log('No public.profiles record found for this user.')
  } else {
    console.log('public.profiles record:')
    console.log(profileRes.rows[0])
  }

  if (args.resetPassword) {
    await setPassword(email, args.resetPassword)
  }

  if (args.setAdmin) {
    await setProfileRole(user.id, 'admin')
  }

  await client.end()
}

async function createUser(email, role) {
  if (!args.password) {
    console.error('--password is required to create a new user.')
    process.exit(1)
  }

  const created = await client.query(
    `INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
     VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', $1, $2, crypt($3, gen_salt('bf')), now(), now(), now())
     RETURNING id`,
    [role, email, args.password]
  )
  const userId = created.rows[0].id
  await client.query(
    `INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
     VALUES (gen_random_uuid(), $1, jsonb_build_object('sub', $2::text, 'email', $3::text), 'email', now(), now(), now(), $2::text)`,
    [userId, userId, email]
  )

  await setProfileRole(userId, role)
  console.log(`Created ${role} user ${email} with password from --password.`)
}

async function setPassword(email, password) {
  const result = await client.query(
    `UPDATE auth.users
     SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = now(), updated_at = now()
     WHERE email = $2
     RETURNING id`,
    [password, email]
  )

  if (result.rows.length === 0) {
    console.error(`Could not update password: no user found for ${email}`)
    return
  }

  console.log(`Password updated for ${email}.`)  
}

async function setProfileRole(userId, role) {
  const existing = await client.query('SELECT id FROM public.profiles WHERE id = $1', [userId])
  if (existing.rows.length > 0) {
    await client.query('UPDATE public.profiles SET role = $1 WHERE id = $2', [role, userId])
    console.log(`Updated public.profiles role to ${role}.`)
    return
  }

  await client.query(`INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES ($1, $2, 'Admin', 'User', $3)`, [userId, args.email, role])
  console.log(`Inserted public.profiles row with role ${role}.`)
}

main().catch((error) => {
  console.error('Error checking database:', error)
  process.exit(1)
})
