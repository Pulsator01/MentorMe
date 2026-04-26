import { ClipboardList, LayoutDashboard, Send } from 'lucide-react'
import SubNav from '../../components/SubNav'

const FOUNDER_NAV_ITEMS = [
  { path: '/founders', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/founders/new-request', label: 'New request', icon: Send, end: true },
  { path: '/founders/pipeline', label: 'Pipeline', icon: ClipboardList, end: true },
]

function FounderSubNav() {
  return <SubNav ariaLabel="Founder workspace sections" items={FOUNDER_NAV_ITEMS} />
}

export default FounderSubNav
