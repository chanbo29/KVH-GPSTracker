import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmGearboxOilChanges({ navigate }) {
  return <CarMaintPage config={CONFIGS.gearboxOilChanges} navigate={navigate}/>
}
