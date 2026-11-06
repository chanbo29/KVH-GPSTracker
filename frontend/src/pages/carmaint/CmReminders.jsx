import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmReminders({ navigate }) {
  return <CarMaintPage config={CONFIGS.reminders} navigate={navigate}/>
}
