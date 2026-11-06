import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmExchangeRates({ navigate }) {
  return <CarMaintPage config={CONFIGS.exchangeRates} navigate={navigate}/>
}
