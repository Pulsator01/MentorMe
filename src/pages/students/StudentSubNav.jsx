import { BrainCircuit, LayoutDashboard } from 'lucide-react'
import SubNav from '../../components/SubNav'

const STUDENT_NAV_ITEMS = [
  { path: '/students', label: 'Workspace', icon: LayoutDashboard, end: true },
  { path: '/students/follow-up', label: 'AI follow-up', icon: BrainCircuit, end: true },
]

function StudentSubNav() {
  return <SubNav ariaLabel="Student workspace sections" items={STUDENT_NAV_ITEMS} />
}

export default StudentSubNav
