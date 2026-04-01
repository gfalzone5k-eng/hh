import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://ftgtvpkmuucjccjxhfxs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z3R2cGttdXVjamNjanhoZnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTQ1NDMsImV4cCI6MjA4NzQzMDU0M30.78OFQ0tfqvVvBcMhZ3rFAsO-oar3o4yAVKZrzc3zldk'
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

const orderSummaryModal = document.getElementById('orderSummaryModal')
const orderSummaryContent = document.getElementById('orderSummaryContent')
const summaryClose = document.getElementById('summaryClose')
const confirmOrderBtn = document.getElementById('confirmOrderBtn')

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
      ${avviso ? `<div class="product-warning-badge">⚠️ Articolo con avviso</div>` : ''}
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

function getPriorita(prodotto) {
  const nome = String(prodotto.descrizione ?? '').toUpperCase()

  if (nome.includes('CIALDA')) return 1
  if (nome.includes('CAPS') || nome.includes('SNACK')) return 2
  return 3
}

function getCarrelloOrdinato() {
  return [...carrello].sort((a, b) => {
    const prioritaA = getPriorita(a)
    const prioritaB = getPriorita(b)

    if (prioritaA !== prioritaB) {
      return prioritaA - prioritaB
    }

    return String(a.descrizione ?? '').localeCompare(String(b.descrizione ?? ''))
  })
}

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

  const carrelloOrdinato = getCarrelloOrdinato()

  carrelloOrdinato.forEach(p => {
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

function apriRiepilogoOrdine() {
  const sede = sedeInput.value.trim()
  const descrizioneOrdine = textarea.value.trim()
  const carrelloOrdinato = getCarrelloOrdinato()

  if (!sede) {
    alert("Inserisci la sede prima di procedere")
    return
  }

  if (carrelloOrdinato.length === 0) {
    alert('Carrello vuoto')
    return
  }

  let html = `
    <div class="summary-box">
      <div class="summary-section">
        <div class="summary-label">Sede</div>
        <div class="summary-value">${escapeHtml(sede)}</div>
      </div>

      <div class="summary-section">
        <div class="summary-label">Descrizione ordine</div>
        <div class="summary-value">${escapeHtml(descrizioneOrdine || 'Nessuna descrizione')}</div>
      </div>

      <div class="summary-section">
        <div class="summary-label">Articoli</div>
        <div class="summary-items">
  `

  carrelloOrdinato.forEach((p) => {
    const codice = String(p.codice_articolo ?? '')
    const descrizione = String(p.descrizione ?? '')
    const qtyId = `summary-q-${escapeForId(codice)}`

    html += `
      <div class="summary-item">
        <div class="summary-item-top">
          <div>
            <div class="summary-item-code">${escapeHtml(codice)}</div>
            <div class="summary-item-desc">${escapeHtml(descrizione)}</div>
          </div>
        </div>

        <div class="summary-item-actions">
          <label for="${qtyId}">Quantità</label>
          <input type="number" min="1" value="${escapeHtml(p.quantita)}" id="${qtyId}">
          <button type="button" class="secondary-btn" data-action="update" data-codice="${escapeHtml(codice)}">Aggiorna quantità</button>
          <button type="button" class="danger-btn" data-action="remove" data-codice="${escapeHtml(codice)}">Elimina</button>
        </div>
      </div>
    `
  })

  html += `
        </div>
      </div>
    </div>
  `

  orderSummaryContent.innerHTML = html
  orderSummaryModal.classList.add('show')

  orderSummaryContent.querySelectorAll('[data-action="update"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const codice = btn.dataset.codice
      const input = document.getElementById(`summary-q-${escapeForId(codice)}`)
      const nuovaQuantita = Math.max(1, parseInt(input?.value, 10) || 1)

      const articolo = carrello.find(p => String(p.codice_articolo) === String(codice))
      if (!articolo) return

      articolo.quantita = nuovaQuantita
      aggiornaCarrello()
      apriRiepilogoOrdine()
    })
  })

  orderSummaryContent.querySelectorAll('[data-action="remove"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const codice = btn.dataset.codice
      carrello = carrello.filter(p => String(p.codice_articolo) !== String(codice))
      aggiornaCarrello()

      if (carrello.length === 0) {
        chiudiRiepilogoOrdine()
        return
      }

      apriRiepilogoOrdine()
    })
  })
}

function chiudiRiepilogoOrdine() {
  orderSummaryModal.classList.remove('show')
  orderSummaryContent.innerHTML = ''
}

function generaTestoOrdine() {
  const carrelloOrdinato = getCarrelloOrdinato()
  let testo = ''

  carrelloOrdinato.forEach(p => {
    testo += `${String(p.codice_articolo)} - ${p.descrizione} - Quantità: ${p.quantita}\n`
  })

  return testo
}

function inviaOrdineFinale() {
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

  const templateParams = {
    message: generaTestoOrdine(),
    sede: sede,
    descrizione: descrizioneOrdine || 'Nessuna descrizione'
  }

  confirmOrderBtn.disabled = true
  confirmOrderBtn.textContent = 'Invio in corso...'

  emailjs.send(
    'service_utzs75y',
    'template_1joanb4',
    templateParams
  )
  .then(function () {
    chiudiRiepilogoOrdine()
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
  .finally(function () {
    confirmOrderBtn.disabled = false
    confirmOrderBtn.textContent = 'Invia Ordine'
  })
}

bottoneInvia.disabled = true

function verificaCampi() {
  const sedeValida = sedeInput.value.trim() !== ''
  const passwordCorretta = passwordInput.value === 'INTO'
  bottoneInvia.disabled = !(sedeValida && passwordCorretta)
}

sedeInput.addEventListener('input', verificaCampi)
passwordInput.addEventListener('input', verificaCampi)

bottoneInvia.addEventListener('click', function () {
  const sede = sedeInput.value.trim()

  if (!sede) {
    alert("Inserisci la sede prima di procedere")
    return
  }

  if (carrello.length === 0) {
    alert('Carrello vuoto')
    return
  }

  apriRiepilogoOrdine()
})

summaryClose.addEventListener('click', chiudiRiepilogoOrdine)

confirmOrderBtn.addEventListener('click', inviaOrdineFinale)

orderSummaryModal.addEventListener('click', (e) => {
  if (e.target === orderSummaryModal) {
    chiudiRiepilogoOrdine()
  }
})

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
