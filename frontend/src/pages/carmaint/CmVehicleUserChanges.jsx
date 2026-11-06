import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmVehicleUserChanges({ navigate }) {
  return <CarMaintPage config={CONFIGS.vehicleUserChanges} navigate={navigate}/>
}
