import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmDifferentialOilChanges({ navigate }) {
  return <CarMaintPage config={CONFIGS.differentialOilChanges} navigate={navigate}/>
}
