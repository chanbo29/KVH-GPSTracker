import CarMaintPage from './CarMaintPage.jsx'
import { CONFIGS } from './cm_configs.js'

export default function CmExpensePersons({ navigate }) {
  return <CarMaintPage config={CONFIGS.expensePersons} navigate={navigate}/>
}
