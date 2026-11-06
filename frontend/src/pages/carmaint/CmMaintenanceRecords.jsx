import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmMaintenanceRecords({ navigate }) {
  return <CarMaintPage config={CONFIGS.maintenanceRecords} navigate={navigate}/>
}
