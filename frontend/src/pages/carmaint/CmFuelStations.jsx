import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmFuelStations({ navigate }) {
  return <CarMaintPage config={CONFIGS.fuelStations} navigate={navigate}/>
}
