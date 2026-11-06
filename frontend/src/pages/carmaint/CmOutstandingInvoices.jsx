import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmOutstandingInvoices({ navigate }) {
  return <CarMaintPage config={CONFIGS.outstandingInvoices} navigate={navigate}/>
}
