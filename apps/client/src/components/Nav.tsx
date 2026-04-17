import { NavLink } from 'react-router-dom'
import { useActivity } from '../context/ActivityContext'

export default function Nav() {
  const { isAuthenticated } = useActivity()
  if (!isAuthenticated) return null

  return (
    <nav className="nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Activities
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Dashboard
      </NavLink>
      <NavLink to="/overview" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Overview
      </NavLink>
    </nav>
  )
}
