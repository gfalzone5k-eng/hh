import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://ftgtvpkmuucjccjxhfxs.supabase.co'
const supabaseKey = 'LA_TUA_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

let prodotti = []
let carrello = []

const searchInput = document.getElementById('search')
const carrelloDiv = document.getElementById('carrello')
const sedeInput = document.getElementById('sede')
const passwordInput = document.getElementById('password')
const bottoneInvia = document.getElementById('inviaOrdine')
const textarea = document.getElementById('descrizioneOrdine')

const warningModal = document.getElementById('warningModal')
const warningMessage = document.getElementById('warningMessage')
const warningCancel = document.getElementById('warningCancel')
const warningProceed = document.getElementById('warningProceed')
const toastWrap = document.getElementById('toastWrap')

let pendingAction = null

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeForId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_')
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

function openWarningModal(message, onProceed) {
  pendingAction = onProceed
  warningMessage.textContent = message
  warningModal.classList.add('show')
}

function closeWarningModal() {
  pendingAction = null
  warningModal.classList.remove('show')
  warningMessage.textContent = ''
}

warningCancel.addEventListener('click', closeWarningModal)

warningProceed.addEventListener('click', () => {
  if (typeof pendingAction === 'function') {
    pendingAction()
  }
  closeWarningModal()
})

warningModal.addEventListener('click', (e) => {
  if (e.target === warningModal) {
    closeWarningModal()
  }
})

async function caricaProdotti() {
  const { data, error } = await supabase
    .from('articoli')
    .select('*')
    .order('codice_articolo', { ascending: true })

  if (error) {
    console.error('Errore Supabase:', error)
    document.getElementById('prodotti').innerHTML = '<p>Errore nel caricamento articoli.</p>'
    return
  }

  prodotti = data || []
  mostraProdotti(prodotti)
}

function mostraProdotti(lista) {
  const container = document.getElementById('prodotti')
  container.innerHTML = ''

  if (!lista.length) {
    container.innerHTML = '<div class="product-card">Nessun articolo trovato.</div>'
    return
  }

  lista.forEach(prod => {
    const codice = String(prod.codice_articolo ?? '')
    const descrizione = String(prod.descrizione ?? '')
    const avviso = String(prod.avviso_ordine ?? '').trim()

    const div = document.createElement('div')
    div.className = 'product-card'
    div.innerHTML = `
      <div class="product-code">${escapeHtml(codice)}</div>
      <div class="product-desc">${escapeHtml(descrizione)}</div>
      ${avviso ? `<div style="margin-top:8px;font-size:13px;color:#b45309;">⚠️ Articolo con avviso</div>` : ''}

      <div class="product-actions">
        <input type="number" min="1" value="1" class="qty-input" id="q-${escapeForId(codice)}">
        <button type="button">Aggiungi</button>
      </div>
    `

    div.querySelector('button').addEventListener('click', () => aggiungi(codice))
    container.appendChild(div)
  })
}

searchInput.addEventListener('input', function (e) {
  const valore = e.target.value.toLowerCase().trim()

  if (valore === '') {
    mostraProdotti(prodotti)
    return
  }

  const parole = valore.split(/\s+/)

  const filtrati = prodotti.filter((p) => {
    const testoCompleto = (
      String(p.codice_articolo ?? '') + ' ' +
      String(p.descrizione ?? '') + ' ' +
      String(p.avviso_ordine ?? '')
    ).toLowerCase()

    return parole.every(parola => testoCompleto.includes(parola))
  })

  mostraProdotti(filtrati)
})

function aggiungiAlCarrello(codice) {
  const prodotto = prodotti.find(p => String(p.codice_articolo) === String(codice))
  if (!prodotto) return

  const qtyInput = document.getElementById(`q-${escapeForId(codice)}`)
  const quantita = Math.max(1, parseInt(qtyInput?.value, 10) || 1)

  const esistente = carrello.find(p => String(p.codice_articolo) === String(codice))

  if (esistente) {
    esistente.quantita += quantita
  } else {
    carrello.push({ ...prodotto, quantita })
  }

  aggiornaCarrello()
  showToast('Articolo aggiunto', `${prodotto.descrizione} inserito nel carrello`)
}

function aggiungi(codice) {
  const prodotto = prodotti.find(p => String(p.codice_articolo) === String(codice))
  if (!prodotto) return

  const avviso = String(prodotto.avviso_ordine ?? '').trim()

  if (avviso) {
    openWarningModal(avviso, () => aggiungiAlCarrello(codice))
    return
  }

  aggiungiAlCarrello(codice)
}

function aggiornaCarrello() {
  carrelloDiv.innerHTML = ''

  if (carrello.length === 0) {
    carrelloDiv.innerHTML = '<p class="empty-state">Il carrello è vuoto.</p>'
    return
  }

  carrello.forEach(p => {
    const codice = String(p.codice_articolo ?? '')
    const descrizione = String(p.descrizione ?? '')

    const item = document.createElement('div')
    item.className = 'cart-item'
    item.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-code">${escapeHtml(codice)}</div>
        <div>${escapeHtml(descrizione)}</div>
        <div>Quantità: ${escapeHtml(p.quantita)}</div>
      </div>
      <button type="button" class="danger-btn">❌</button>
    `

    item.querySelector('button').addEventListener('click', () => rimuovi(codice))
    carrelloDiv.appendChild(item)
  })
}

function rimuovi(codice) {
  carrello = carrello.filter(p => String(p.codice_articolo) !== String(codice))
  aggiornaCarrello()
}

document.getElementById('inviaOrdine').addEventListener('click', function () {
  const sede = sedeInput.value.trim()
  const descrizioneOrdine = textarea.value.trim()

  if (!sede) {
    alert("Inserisci la sede prima di inviare l'ordine")
    return
  }

  if (carrello.length === 0) {
    alert('Carrello vuoto')
    return
  }

  let testo = ''

  carrello.forEach(p => {
    testo += `${String(p.codice_articolo)} - ${p.descrizione} - Quantità: ${p.quantita}\n`
  })

  const templateParams = {
    message: testo,
    sede: sede,
    descrizione: descrizioneOrdine || 'Nessuna descrizione'
  }

  emailjs.send(
    'service_utzs75y',
    'template_1joanb4',
    templateParams
  )
  .then(function () {
    carrello = []
    sedeInput.value = ''
    passwordInput.value = ''
    textarea.value = ''
    aggiornaCarrello()
    verificaCampi()
    resetTextarea()
    showToast('Ordine inviato', 'L’ordine è stato inviato con successo')
  })
  .catch(function (error) {
    alert('Errore invio ordine ❌')
    console.log(error)
  })
})

bottoneInvia.disabled = true

function verificaCampi() {
  const sedeValida = sedeInput.value.trim() !== ''
  const passwordCorretta = passwordInput.value === 'INTO'
  bottoneInvia.disabled = !(sedeValida && passwordCorretta)
}

sedeInput.addEventListener('input', verificaCampi)
passwordInput.addEventListener('input', verificaCampi)

function resetTextarea() {
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

document.addEventListener('DOMContentLoaded', () => {
  resetTextarea()

  textarea.addEventListener('input', function () {
    this.style.height = 'auto'
    this.style.height = this.scrollHeight + 'px'
  })
})

caricaProdotti()
aggiornaCarrello()
