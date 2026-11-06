import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmVehiclesUnderRepair({ navigate }) {
  return <CarMaintPage config={CONFIGS.vehiclesUnderRepair} navigate={navigate}/>
}
