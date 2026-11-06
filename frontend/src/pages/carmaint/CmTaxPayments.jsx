import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmTaxPayments({ navigate }) {
  return <CarMaintPage config={CONFIGS.taxPayments} navigate={navigate}/>
}
