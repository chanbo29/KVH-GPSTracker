import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmVehicleUsers({ navigate }) {
  return <CarMaintPage config={CONFIGS.vehicleUsers} navigate={navigate}/>
}
