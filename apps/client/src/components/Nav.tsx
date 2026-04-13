import { NavLink } from 'react-router-dom'
import { useActivity } from '../context/ActivityContext'

export default function Nav() {
  const { token } = useActivity()
  if (!token) return null

  return (
    <nav className="nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Activities
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Dashboard
      </NavLink>
    </nav>
  )
}
