import { ClipboardList, LayoutDashboard, Mail, Users } from 'lucide-react'
import SubNav from '../../components/SubNav'

const CFE_NAV_ITEMS = [
  { path: '/cfe', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/cfe/pipeline', label: 'Pipeline', icon: ClipboardList, end: true },
  { path: '/cfe/network', label: 'Mentor Network', icon: Users, end: true },
  { path: '/cfe/invitations', label: 'Invitations', icon: Mail, end: true },
]

function CfeSubNav() {
  return <SubNav ariaLabel="CFE workspace sections" items={CFE_NAV_ITEMS} />
}

export default CfeSubNav
