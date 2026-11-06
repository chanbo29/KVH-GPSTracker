import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmFuelRefills({ navigate }) {
  return <CarMaintPage config={CONFIGS.fuelRefills} navigate={navigate}/>
}
