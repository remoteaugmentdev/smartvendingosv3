import { requirePlatformAdmin } from '@/server/operator'
import { AdminUsersClient } from './AdminUsersClient'

export const metadata = { title: 'Admin — SmartVendingOS' }

export default async function AdminUsersPage() {
  await requirePlatformAdmin()
  return <AdminUsersClient />
}
