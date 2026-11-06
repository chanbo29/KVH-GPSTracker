import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmMiscRepairCosts({ navigate }) {
  return <CarMaintPage config={CONFIGS.miscRepairCosts} navigate={navigate}/>
}
