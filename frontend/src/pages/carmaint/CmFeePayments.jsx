import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmFeePayments({ navigate }) {
  return <CarMaintPage config={CONFIGS.feePayments} navigate={navigate}/>
}
