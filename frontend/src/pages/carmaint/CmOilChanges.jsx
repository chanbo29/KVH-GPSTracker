import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmOilChanges({ navigate }) {
  return <CarMaintPage config={CONFIGS.oilChanges} navigate={navigate}/>
}
