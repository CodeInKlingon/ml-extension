import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Card from 'primevue/card'
import DataView from 'primevue/dataview'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'

import 'primeicons/primeicons.css'
import './index.css'

import App from './App.vue'

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
})
app.use(ToastService)

app.component('Button', Button)
app.component('InputText', InputText)
app.component('ProgressSpinner', ProgressSpinner)
app.component('Card', Card)
app.component('DataView', DataView)
app.component('Tag', Tag)
app.component('Toast', Toast)
app.component('Dropdown', Dropdown)
app.component('Dialog', Dialog)

app.mount('#app') 