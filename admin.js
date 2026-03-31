import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://ftgtvpkmuucjccjxhfxs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z3R2cGttdXVjamNjanhoZnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTQ1NDMsImV4cCI6MjA4NzQzMDU0M30.78OFQ0tfqvVvBcMhZ3rFAsO-oar3o4yAVKZrzc3zldk'
const supabase = createClient(supabaseUrl, supabaseKey)

// Protezione semplice lato frontend
const ADMIN_USERNAME = 'MARCO'
const ADMIN_PASSWORD = '1'

const loginBox = document.getElementById('loginBox')
const adminPanel = document.getElementById('adminPanel')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('adminPassword')
const loginBtn = document.getElementById('loginBtn')
const loginStatus = document.getElementById('loginStatus')

const codiceInput = document.getElementById('codiceArticolo')
const descrizioneInput = document.getElementById('descrizioneArticolo')
const avvisoInput = document.getElementById('avvisoArticolo')
const salvaBtn = document.getElementById('salvaBtn')
const nuovoBtn = document.getElementById('nuovoBtn')
const annullaBtn = document.getElementById('annullaBtn')
const logoutBtn = document.getElementById('logoutBtn')
const formStatus = document.getElementById('formStatus')
const listaArticoli = document.getElementById('listaArticoli')
const searchAdmin = document.getElementById('searchAdmin')
const formTitle = document.getElementById('formTitle')
const toastWrap = document.getElementById('toastWrap')

let modificaCorrente = null
let articoliCache = []

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function setStatus(message = '', type = '') {
  formStatus.textContent = message
  formStatus.style.color = type === 'error' ? '#dc2626' : type === 'success' ? '#15803d' : '#0f172a'
}

function setLoginStatus(message = '', type = '') {
  loginStatus.textContent = message
  loginStatus.style.color = type === 'error' ? '#dc2626' : type === 'success' ? '#15803d' : '#0f172a'
}

function showToast(title, text) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.innerHTML = `
    <div class="toast-title">${escapeHtml(title)}</div>
    <div class="toast-text">${escapeHtml(text)}</div>
  `
  toastWrap.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3200)
}

function isLoggedIn() {
  return sessionStorage.getItem('adminLogged') === 'true'
}

function showLogin() {
  loginBox.classList.remove('hidden')
  adminPanel.classList.add('hidden')
}

function showAdmin() {
  loginBox.classList.add('hidden')
  adminPanel.classList.remove('hidden')
}

function resetForm() {
  codiceInput.value = ''
  descrizioneInput.value = ''
  avvisoInput.value = ''
  modificaCorrente = null
  annullaBtn.classList.add('hidden')
  formTitle.textContent = 'Nuovo articolo'
  setStatus('')
}

function entraInModifica(articolo) {
  modificaCorrente = String(articolo.codice_articolo ?? '')
  codiceInput.value = String(articolo.codice_articolo ?? '')
  descrizioneInput.value = String(articolo.descrizione ?? '')
  avvisoInput.value = String(articolo.avviso_ordine ?? '')
  annullaBtn.classList.remove('hidden')
  formTitle.textContent = `Modifica articolo ${modificaCorrente}`
  setStatus(`Stai modificando l'articolo ${modificaCorrente}`, 'success')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function renderArticoli(lista) {
  listaArticoli.innerHTML = ''

  if (!lista.length) {
    listaArticoli.innerHTML = '<div>Nessun articolo trovato.</div>'
    return
  }

  lista.forEach((articolo) => {
    const codice = String(articolo.codice_articolo ?? '')
    const descrizione = String(articolo.descrizione ?? '')
    const avviso = String(articolo.avviso_ordine ?? '').trim()

    const row = document.createElement('div')
    row.className = 'articolo-row'
    row.innerHTML = `
      <div class="articolo-codice">${escapeHtml(codice)}</div>
      <div>
        <div class="articolo-desc">${escapeHtml(descrizione)}</div>
        ${avviso ? `<div class="articolo-avviso">⚠️ Avviso: ${escapeHtml(avviso)}</div>` : ''}
      </div>
      <button type="button" class="modifica-btn">Modifica</button>
      <button type="button" class="danger-btn elimina-btn">Elimina</button>
    `

    row.querySelector('.modifica-btn').addEventListener('click', () => {
      entraInModifica(articolo)
    })

    row.querySelector('.elimina-btn').addEventListener('click', async () => {
      const conferma = confirm(`Vuoi eliminare l'articolo ${codice}?`)
      if (!conferma) return

      const { error } = await supabase
        .from('articoli')
        .delete()
        .eq('codice_articolo', codice)

      if (error) {
        console.error(error)
        setStatus('Errore durante l’eliminazione', 'error')
        return
      }

      if (modificaCorrente === codice) {
        resetForm()
      }

      showToast('Articolo eliminato', `L'articolo ${codice} è stato rimosso`)
      await caricaArticoli()
    })

    listaArticoli.appendChild(row)
  })
}

function filtraArticoli() {
  const valore = searchAdmin.value.toLowerCase().trim()

  if (!valore) {
    renderArticoli(articoliCache)
    return
  }

  const parole = valore.split(/\s+/)

  const filtrati = articoliCache.filter((articolo) => {
    const testo = (
      String(articolo.codice_articolo ?? '') + ' ' +
      String(articolo.descrizione ?? '') + ' ' +
      String(articolo.avviso_ordine ?? '')
    ).toLowerCase()

    return parole.every(parola => testo.includes(parola))
  })

  renderArticoli(filtrati)
}

async function caricaArticoli() {
  listaArticoli.innerHTML = 'Caricamento articoli...'

  const { data, error } = await supabase
    .from('articoli')
    .select('*')
    .order('codice_articolo', { ascending: true })

  if (error) {
    console.error(error)
    listaArticoli.innerHTML = 'Errore nel caricamento articoli.'
    return
  }

  articoliCache = data || []
  filtraArticoli()
}

loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim()
  const password = passwordInput.value

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    sessionStorage.setItem('adminLogged', 'true')
    setLoginStatus('Accesso effettuato', 'success')
    showAdmin()
    await caricaArticoli()
  } else {
    setLoginStatus('Username o password errati', 'error')
  }
})

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('adminLogged')
  usernameInput.value = ''
  passwordInput.value = ''
  resetForm()
  showLogin()
})

nuovoBtn.addEventListener('click', () => {
  resetForm()
  codiceInput.focus()
})

annullaBtn.addEventListener('click', () => {
  resetForm()
})

searchAdmin.addEventListener('input', filtraArticoli)

salvaBtn.addEventListener('click', async () => {
  const codice = codiceInput.value.trim()
  const descrizione = descrizioneInput.value.trim()
  const avviso = avvisoInput.value.trim()

  if (!codice || !descrizione) {
    setStatus('Inserisci codice e descrizione', 'error')
    return
  }

  const payload = {
    codice_articolo: codice,
    descrizione: descrizione,
    avviso_ordine: avviso || null
  }

  const { error } = await supabase
    .from('articoli')
    .upsert([payload], { onConflict: 'codice_articolo' })

  if (error) {
    console.error(error)
    setStatus('Errore durante il salvataggio', 'error')
    return
  }

  const messaggio = modificaCorrente
    ? `Articolo ${codice} aggiornato correttamente`
    : `Articolo ${codice} creato correttamente`

  resetForm()
  await caricaArticoli()
  setStatus(messaggio, 'success')
  showToast('Salvataggio completato', messaggio)
})

if (isLoggedIn()) {
  showAdmin()
  caricaArticoli()
} else {
  showLogin()
}
